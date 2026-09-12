# Тот же рецепт, что у frontend InstaWorker: зависимости → сборка → тонкий
# runner со standalone-выводом Next. Образ собирается на сервере через
# `docker compose up --build`, поэтому Google Fonts (next/font) должны быть
# доступны из сети сборки.
FROM node:22-alpine AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
# Ставит и платформенный sharp (@img/sharp-linuxmusl-x64) — он нужен
# оптимизатору картинок /_next/image в рантайме.
RUN npm ci

FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* вшиваются в клиентский бандл на этапе сборки, а из URL Supabase
# next.config.ts выводит разрешённый хост картинок — поэтому они нужны здесь,
# а не только при запуске. Секретов среди них нет.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Шрифт OG-картинок читается с диска через process.cwd() (lib/og.tsx);
# трассировка его включает, но явная копия не зависит от её эвристик.
COPY --from=builder --chown=node:node /app/assets ./assets
# Кеш оптимизатора картинок выносится в том (см. compose.yaml). Каталог
# создаётся здесь от имени node: пустой том наследует владельца из образа,
# иначе он был бы root и sharp не смог бы записать ни одного варианта.
RUN mkdir -p .next/cache/images && chown -R node:node .next/cache

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
