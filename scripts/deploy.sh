#!/usr/bin/env bash
# Выкатка Ailshan на сервере: git pull → docker compose up --build → ожидание
# healthy → публичная проверка. Повторяет scripts/deploy.sh InstaWorker, чтобы
# оба проекта на хосте обслуживались одинаково. Запуск: bash scripts/deploy.sh
# [--force]; таймер systemd ставит scripts/install-auto-update.sh.
set -Eeuo pipefail

APP_DIR="${AILSHAN_APP_DIR:-/opt/ailshan/app}"
SECRETS_FILE="${AILSHAN_ENV_FILE:-/opt/ailshan/secrets/ailshan.env}"
STATE_DIR="${AILSHAN_STATE_DIR:-/opt/ailshan}"
FORCE="${1:-}"

export AILSHAN_ENV_FILE="$SECRETS_FILE"

cd "$APP_DIR"
command -v git >/dev/null || { echo "ERROR: git is not installed"; exit 1; }
command -v docker >/dev/null || { echo "ERROR: docker is not installed"; exit 1; }
docker compose version >/dev/null

[[ -f .env ]] || { echo "ERROR: $APP_DIR/.env not found (see .env.production.example)"; exit 1; }
[[ -f "$SECRETS_FILE" ]] || { echo "ERROR: secrets file not found: $SECRETS_FILE (see secrets/ailshan.env.example)"; exit 1; }
docker network inspect edge >/dev/null 2>&1 || { echo "ERROR: docker network 'edge' does not exist (it is created by the InstaWorker setup: docker network create edge)"; exit 1; }

# Свой Supabase живёт в соседнем compose-проекте (scripts/supabase.sh up);
# без него приложение поднимется, но каждая страница будет падать.
KONG_HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' supabase-kong 2>/dev/null || true)"
[[ "$KONG_HEALTH" == "healthy" ]] || echo "WARNING: supabase-kong is ${KONG_HEALTH:-not running} — run scripts/supabase.sh up first"

# Домен нужен для публичной проверки; берём из того же .env, что читает compose.
DOMAIN="$(grep -E '^DOMAIN=' .env | tail -n1 | cut -d= -f2- || true)"
DOMAIN="${DOMAIN:-ailshan.jhfasd.space}"

# Две сборки Next на одной машине одновременно — лишние гигабайты памяти.
# Если в этот момент выкатывается InstaWorker, ждём, пока он закончит.
if command -v systemctl >/dev/null; then
  for _ in $(seq 1 60); do
    systemctl is-active --quiet instaworker-update.service 2>/dev/null || break
    echo "InstaWorker deploy is running, waiting..."
    sleep 10
  done
fi

git fetch --prune origin
CURRENT_REV="$(git rev-parse HEAD)"
UPSTREAM_REV="$(git rev-parse '@{upstream}')"
CONTAINER_ID="$(docker compose ps -q ailshan 2>/dev/null || true)"
# Что именно собрано в образе: рабочее дерево может обновиться руками, а
# контейнер остаться на старом коде — сравниваем с отметкой удачной выкатки.
DEPLOYED_FILE="$STATE_DIR/.deployed-commit"
DEPLOYED_REV="$(cat "$DEPLOYED_FILE" 2>/dev/null || true)"

if [[ "$CURRENT_REV" == "$UPSTREAM_REV" && "$CURRENT_REV" == "$DEPLOYED_REV" \
      && "$FORCE" != "--force" && -n "$CONTAINER_ID" ]]; then
  echo "No new commit. Container is already deployed."
else
  git pull --ff-only
  docker compose config --quiet
  docker compose up -d --build --remove-orphans
  git rev-parse HEAD > "$DEPLOYED_FILE"
  # Старые слои сборки копятся с каждым деплоем; оставляем только актуальные.
  docker image prune -f --filter "label=com.docker.compose.project=ailshan" >/dev/null || true
fi

for attempt in $(seq 1 36); do
  CONTAINER_ID="$(docker compose ps -q ailshan)"
  HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CONTAINER_ID" 2>/dev/null || true)"
  if [[ "$HEALTH" == "healthy" ]]; then
    echo "Ailshan is healthy."
    if command -v curl >/dev/null; then
      curl --fail --silent --show-error --max-time 15 "https://$DOMAIN/api/health" >/dev/null \
        && echo "Public healthcheck passed: https://$DOMAIN" \
        || echo "WARNING: container is healthy, but public HTTPS check failed (DNS / caddy block for $DOMAIN?)"
    fi
    docker compose ps
    exit 0
  fi
  sleep 5
done

echo "ERROR: healthcheck timeout"
docker compose ps
docker compose logs --no-color --tail=120 ailshan
exit 1
