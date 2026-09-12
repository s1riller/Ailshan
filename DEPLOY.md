# Деплой Ailshan на сервер с InstaWorker

Оба проекта живут на одном хосте в Docker. Порты 80/443 держит `caddy` из
compose‑проекта InstaWorker; Ailshan наружу ничего не публикует — его контейнер
`ailshan` подключён к общей сети `edge`, и Caddy проксирует домен на
`ailshan:3000` по имени контейнера (так же, как `autoshow_admin`).

```
интернет → caddy (instaworker, :80/:443)
             ├─ jhfasd.space            → frontend / backend (InstaWorker)
             ├─ autoshow.jhfasd.space   → autoshow_admin:3000
             └─ ailshan.jhfasd.space    → ailshan:3000   ← этот проект
```

База, файлы и авторизация — в Supabase Cloud; на сервере только Next.js.

## Что нужно один раз

1. **DNS.** A‑запись `ailshan.jhfasd.space` → IP сервера (или свой домен —
   тогда его же в `AILSHAN_DOMAIN` у InstaWorker и в `DOMAIN` здесь). Caddy
   выпустит сертификат Let's Encrypt сам, как только запись начнёт резолвиться.

2. **Supabase.** Из локальной машины: `npx supabase db push` (миграции
   `20260912…` конкурса и пульта ещё не применены в облаке). В панели:
   Site URL / Redirect URLs = `https://<домен>`, шаблоны писем из
   `supabase/templates/`, SMTP, план `pro` у ведущего, выключить регистрацию.

3. **InstaWorker.** В его репозитории уже есть блок для Ailshan в `Caddyfile`
   и переменная `AILSHAN_DOMAIN` в `compose.yaml`. На сервере он подтянется
   таймером `instaworker-update` (раз в 10 минут) или вручную:
   `bash /opt/instaworker/app/scripts/deploy.sh`. Если домен не
   `ailshan.jhfasd.space`, добавьте `AILSHAN_DOMAIN=…` в `/opt/instaworker/app/.env`.

4. **Ailshan на сервере:**

   ```bash
   sudo mkdir -p /opt/ailshan/secrets && sudo chmod 700 /opt/ailshan/secrets
   sudo git clone https://github.com/s1riller/Ailshan.git /opt/ailshan/app
   cd /opt/ailshan/app

   cp .env.production.example .env          # DOMAIN, публичные ключи Supabase, TZ
   nano .env
   cp secrets/ailshan.env.example /opt/ailshan/secrets/ailshan.env
   nano /opt/ailshan/secrets/ailshan.env     # SUPABASE_SERVICE_ROLE_KEY
   chmod 600 /opt/ailshan/secrets/ailshan.env

   bash scripts/deploy.sh                    # сборка образа, запуск, ожидание healthy
   sudo bash scripts/install-auto-update.sh  # таймер: git pull + выкатка раз в 10 минут
   ```

   Значения `NEXT_PUBLIC_*` нужны и при сборке (вшиваются в бандл), и при
   запуске — `compose.yaml` передаёт их из `.env` в оба места. Сервисный ключ
   читает только контейнер; в образ и в git он не попадает.

## Проверка

```bash
docker compose ps                                  # ailshan … (healthy)
curl -s https://ailshan.jhfasd.space/api/health    # {"ok":true}
docker logs --tail 50 ailshan
```

Открыть `/live/<slug>` события на проекторе, отсканировать QR со стены —
адрес в нём берётся из `NEXT_PUBLIC_SITE_URL`, то есть из `DOMAIN` в `.env`.

## Обновление

`git push` в `main` → таймер `ailshan-update` в течение 10 минут сделает
`git pull --ff-only` и `docker compose up -d --build`. Вручную:
`bash /opt/ailshan/app/scripts/deploy.sh` (`--force` — пересобрать без новых
коммитов). Скрипт ждёт, пока закончится выкатка InstaWorker, чтобы две сборки
Next не шли одновременно.

## Ресурсы

Контейнер в работе занимает 70–400 МБ (лимит 1 ГБ в `compose.yaml`), сборка
образа — до ~1,7 ГБ пиково (`experimental.cpus: 2` в `next.config.ts`).
Кеш оптимизатора картинок лежит в томе `ailshan_image_cache` (лимит 2 ГБ) и
переживает пересборки. Перед первым деплоем стоит посмотреть `free -h`: если
на сервере меньше 4 ГБ с учётом InstaWorker, добавьте 2 ГБ swap — это
страховка именно для сборок, не для работы.
