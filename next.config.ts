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
  images: {
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
