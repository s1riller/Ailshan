# Деплой Ailshan на сервер с InstaWorker

Все части живут на одном хосте в Docker. Порты 80/443 держит `caddy` из
compose‑проекта InstaWorker; остальные проекты наружу ничего не публикуют —
их контейнеры подключены к общей сети `edge`, и Caddy проксирует домены по
именам контейнеров (так же, как `autoshow_admin`).

```
интернет → caddy (instaworker, :80/:443)
             ├─ jhfasd.space                    → frontend / backend (InstaWorker)
             ├─ autoshow.jhfasd.space           → autoshow_admin:3000
             ├─ ailshan.jhfasd.space            → ailshan:3000            (compose.yaml)
             └─ supabase.ailshan.jhfasd.space   → supabase-kong:8000      (deploy/supabase)
                                                   └─ auth · rest · storage · postgres
```

Supabase — свой, на этом же сервере (`deploy/supabase/compose.yaml`):
Postgres 17, GoTrue, PostgREST, Storage за Kong, Studio по желанию. Наружу
через Caddy открыты только `/auth/v1`, `/rest/v1`, `/storage/v1` — гости
шлют снимки в Storage напрямую из браузера. Studio и pg‑meta доступны только
с самого сервера (SSH‑туннель).

## Что нужно один раз

1. **DNS.** Две A‑записи на IP сервера: `ailshan.jhfasd.space` (сайт) и
   `supabase.ailshan.jhfasd.space` (API). Другие имена — в `AILSHAN_DOMAIN` /
   `AILSHAN_SUPABASE_DOMAIN` у InstaWorker и в `DOMAIN` / аргументах
   `scripts/supabase.sh init` здесь. Сертификаты Caddy выпустит сам, как
   только записи начнут резолвиться.

2. **InstaWorker.** В его репозитории уже есть оба блока в `Caddyfile` и
   переменные в `compose.yaml`. На сервере подтянуть коммит и перезапустить
   caddy: `cd /opt/instaworker/app && git pull && docker compose up -d caddy`
   (таймер `instaworker-update` сделает это сам в течение 10 минут). Если на
   сервере Caddyfile правили руками — сначала `git checkout -- Caddyfile`.

3. **Ailshan + Supabase на сервере:**

   ```bash
   sudo mkdir -p /opt/ailshan/secrets && sudo chmod 700 /opt/ailshan/secrets
   sudo git clone https://github.com/s1riller/Ailshan.git /opt/ailshan/app
   cd /opt/ailshan/app

   # 1) свой Supabase: секреты → стек → миграции → ведущий
   bash scripts/supabase.sh init https://supabase.ailshan.jhfasd.space https://ailshan.jhfasd.space
   bash scripts/supabase.sh up
   bash scripts/supabase.sh create-admin you@example.com 'надёжный пароль'
   bash scripts/supabase.sh keys                # печатает URL и оба ключа

   # 2) приложение
   cp .env.production.example .env              # DOMAIN, NEXT_PUBLIC_SUPABASE_URL, anon-ключ, TZ
   nano .env
   cp secrets/ailshan.env.example /opt/ailshan/secrets/ailshan.env
   nano /opt/ailshan/secrets/ailshan.env        # SUPABASE_SERVICE_ROLE_KEY из `keys`
   chmod 600 /opt/ailshan/secrets/ailshan.env

   bash scripts/deploy.sh                       # сборка образа, запуск, ожидание healthy
   sudo bash scripts/install-auto-update.sh     # таймеры: выкатка раз в 10 мин, бэкап ночью
   ```

   `scripts/supabase.sh init` пишет `/opt/ailshan/secrets/supabase.env`
   (пароль базы, JWT‑секрет, ключи, пароль Studio). Менять их после первого
   запуска нельзя — роли и токены созданы с этими значениями. Регистрация в
   Auth закрыта; ведущего и других организаторов заводит `create-admin`.

## Проверка

```bash
bash scripts/supabase.sh ps                              # db, auth, rest, storage, kong — healthy
curl -s https://supabase.ailshan.jhfasd.space/auth/v1/health -H "apikey: <anon>"   # {"version":…}
docker compose ps                                        # ailshan … (healthy)
curl -s https://ailshan.jhfasd.space/api/health          # {"ok":true}
docker exec ailshan wget -qO- https://supabase.ailshan.jhfasd.space/rest/v1/ -S 2>&1 | head -1   # 401 = дошли до Kong
```

Войти в `https://ailshan.jhfasd.space/login` под созданным ведущим, создать
событие, открыть `/live/<slug>` на проекторе и отсканировать QR со стены.

**Studio** (таблицы, SQL, пользователи): `bash scripts/supabase.sh studio`,
затем с ноутбука `ssh -L 54321:127.0.0.1:54321 root@сервер` и открыть
`http://localhost:54321` — логин/пароль `DASHBOARD_*` из `supabase.env`.

## Обновление

`git push` в `main` → таймер `ailshan-update` в течение 10 минут сделает
`git pull --ff-only`, применит новые миграции из `supabase/migrations`
(`scripts/supabase.sh migrate`, идемпотентно) и пересоберёт приложение
(`docker compose up -d --build`). Скрипт миграций ведёт ту же таблицу
`supabase_migrations.schema_migrations`, что и Supabase CLI, поэтому
`supabase db push --db-url postgresql://postgres:<пароль>@127.0.0.1:54322/postgres`
через SSH‑туннель тоже подойдёт.

Вручную: `bash scripts/deploy.sh` (`--force` — пересобрать без новых
коммитов). Скрипт ждёт, пока закончится выкатка InstaWorker, чтобы две
сборки Next не шли одновременно.

## Резервные копии

`bash scripts/supabase.sh backup` → `/opt/ailshan/backups/db-<дата>.dump`
(pg_dump, custom format, включая `auth` и `storage`) и
`storage-<дата>.tgz` (файлы снимков). Таймер `ailshan-backup` делает это
каждую ночь в 04:10, хранит 14 дней. Копии лежат на том же диске — время от
времени забирайте их с сервера (`rsync`/`scp`).

Восстановление на чистом стеке: `scripts/supabase.sh up`, затем
`docker exec -i supabase-db pg_restore -U supabase_admin -d postgres --clean --if-exists < db-<дата>.dump`
и распаковать `storage-<дата>.tgz` в том `ailshan-supabase_storage_data`.

## Ресурсы

| Что | В работе | Пик |
|---|---|---|
| Supabase (5 контейнеров) | ~0,5 ГБ | лимиты 1 ГБ db + 0,25/0,25/0,5/0,5 |
| Studio + pg‑meta (по желанию) | ~0,3 ГБ | лимиты 1 ГБ + 0,5 ГБ |
| Ailshan | 70–400 МБ | сборка образа ~1,7 ГБ (`experimental.cpus: 2`) |

Итого с InstaWorker сервер должен иметь **не меньше 4 ГБ RAM** (лучше 8) и
2 ГБ swap на время сборок. Диск: база и снимки лежат в томах Docker
(`ailshan-supabase_db_data`, `ailshan-supabase_storage_data`) — ~0,5 ГБ на
1000 фото, плюс копии в `/opt/ailshan/backups`. Кеш превью Next — в томе
`ailshan_image_cache` (лимит 2 ГБ).
