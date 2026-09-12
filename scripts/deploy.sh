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

# Значения из примеров (<…>) и опечатки в URL ломают каждый запрос уже после
# сборки ("Invalid supabaseUrl"), а NEXT_PUBLIC_* ещё и вшиты в образ —
# дешевле проверить до `docker compose up --build`.
# Отсутствующая переменная — пустая строка, а не ошибка: под set -e/pipefail
# «ненайденный» grep иначе тихо завершал бы весь скрипт.
env_value() { { grep -E "^$2=" "$1" || true; } | tail -n1 | cut -d= -f2- | tr -d "\"'"; }
SUPABASE_URL="$(env_value .env NEXT_PUBLIC_SUPABASE_URL)"
ANON_KEY="$(env_value .env NEXT_PUBLIC_SUPABASE_ANON_KEY)"
SERVICE_KEY="$(env_value "$SECRETS_FILE" SUPABASE_SERVICE_ROLE_KEY)"
[[ "$SUPABASE_URL" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]+)?/?$ ]] \
  || { echo "ERROR: NEXT_PUBLIC_SUPABASE_URL in .env is not a URL: '$SUPABASE_URL' (expected e.g. https://supabase.ailshan.jhfasd.space — see scripts/supabase.sh keys)"; exit 1; }
[[ "$SUPABASE_URL" != */ ]] \
  || { echo "ERROR: NEXT_PUBLIC_SUPABASE_URL must not end with '/': the app appends /storage/v1/… itself"; exit 1; }
[[ "$ANON_KEY" == eyJ* ]] \
  || { echo "ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY in .env is not a JWT (see scripts/supabase.sh keys)"; exit 1; }
[[ "$SERVICE_KEY" == eyJ* ]] \
  || { echo "ERROR: SUPABASE_SERVICE_ROLE_KEY in $SECRETS_FILE is not a JWT (see scripts/supabase.sh keys)"; exit 1; }
docker network inspect edge >/dev/null 2>&1 || { echo "ERROR: docker network 'edge' does not exist (it is created by the InstaWorker setup: docker network create edge)"; exit 1; }

# API Supabase — на этом же сервере: прибиваем его имя к публичному IP
# (extra_hosts в compose.yaml), чтобы контейнер не зависел от внешних DNS.
# IP берётся из .env (SUPABASE_HOST_IP), иначе определяется автоматически.
SUPABASE_HOST="${SUPABASE_URL#*://}"; SUPABASE_HOST="${SUPABASE_HOST%%:*}"
SUPABASE_HOST_IP="$(env_value .env SUPABASE_HOST_IP)"
if [[ -z "$SUPABASE_HOST_IP" ]]; then
  SUPABASE_HOST_IP="$(curl -4 -s --max-time 5 https://ifconfig.me 2>/dev/null || true)"
  [[ "$SUPABASE_HOST_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || SUPABASE_HOST_IP="$(dig +short "$SUPABASE_HOST" @1.1.1.1 2>/dev/null | head -n1 || true)"
fi
if [[ "$SUPABASE_HOST_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  export SUPABASE_HOST SUPABASE_HOST_IP
  echo "Supabase API: $SUPABASE_HOST -> $SUPABASE_HOST_IP"
else
  echo "WARNING: could not determine the public IP for $SUPABASE_HOST; the container will rely on public DNS (set SUPABASE_HOST_IP in .env to pin it)"
fi

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
# В отметке и хеш .env: NEXT_PUBLIC_* вшиты в образ, поэтому правка .env без
# нового коммита тоже требует пересборки.
DEPLOYED_FILE="$STATE_DIR/.deployed-commit"
DEPLOYED_STATE="$(cat "$DEPLOYED_FILE" 2>/dev/null || true)"
ENV_HASH="$(sha256sum .env | cut -c1-16)"
CURRENT_STATE="$CURRENT_REV $ENV_HASH"

if [[ "$CURRENT_REV" == "$UPSTREAM_REV" && "$CURRENT_STATE" == "$DEPLOYED_STATE" \
      && "$FORCE" != "--force" && -n "$CONTAINER_ID" ]]; then
  echo "No new commit and .env unchanged. Container is already deployed."
else
  git pull --ff-only
  docker compose config --quiet
  docker compose up -d --build --remove-orphans
  echo "$(git rev-parse HEAD) $ENV_HASH" > "$DEPLOYED_FILE"
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
