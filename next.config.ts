import type { NextConfig } from "next";

/**
 * next/image принимает картинки только с перечисленных хостов. Облачный Supabase
 * покрывается маской *.supabase.co, а локальный стек (npm run db:start) живёт на
 * 127.0.0.1:54321 — его хост берём из переменной окружения, чтобы конфиг не
 * зависел от того, куда именно смотрит .env.local.
 */
function parseSupabaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;

  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

const supabaseUrl = parseSupabaseUrl();
const isLoopback = supabaseUrl ? /^(127\.0\.0\.1|localhost|\[::1\])$/.test(supabaseUrl.hostname) : false;

const nextConfig: NextConfig = {
  // Самодостаточная сборка для Docker: .next/standalone + .next/static,
  // запускается `node server.js` без node_modules проекта.
  output: "standalone",
  poweredByHeader: false,
  // Шрифт для OG-картинок читается с диска (lib/og.tsx); трассировка
  // standalone-сборки должна положить его рядом с маршрутами.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./assets/fonts/*"],
    "/e/[slug]/opengraph-image": ["./assets/fonts/*"],
  },
  experimental: {
    // Сборка идёт на том же сервере, где живёт InstaWorker. Воркеры
    // статической генерации по умолчанию = ядра − 1, и каждый берёт
    // сотни МБ; статических маршрутов здесь пять, двух воркеров хватает.
    cpus: 2,
  },
  images: {
    // Снимки не меняются после одобрения: варианты оптимизатора живут сутки,
    // а кеш на диске ограничен явно, а не «половиной свободного места».
    minimumCacheTTL: 86400,
    maximumDiskCacheSize: 2 * 1024 * 1024 * 1024,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      ...(supabaseUrl
        ? [
            {
              protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
              hostname: supabaseUrl.hostname,
              port: supabaseUrl.port,
              pathname: "/storage/v1/**",
            },
          ]
        : []),
    ],
    // Оптимизатор Next блокирует загрузку с loopback-адресов (защита от SSRF).
    // Для локального Supabase это ложное срабатывание; в облаке флаг остаётся выключен.
    dangerouslyAllowLocalIP: isLoopback,
  },
};

export default nextConfig;
