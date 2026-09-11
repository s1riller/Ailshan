/**
 * Создаёт супер-админа в ЛОКАЛЬНОЙ базе Supabase.
 *
 *   npm run db:seed
 *   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD=secret npm run db:seed
 *
 * Скрипт отказывается работать с облачным проектом: проверяет, что URL из
 * .env.local указывает на localhost. Случайно завести пользователя в проде нельзя.
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^["']|["']$/g, "")]),
  );
}

// .env.local переопределяет .env — так же, как это делает Next.js
const env = { ...loadEnv(".env"), ...loadEnv(".env.local"), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Нет NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY. Сначала: npm run db:start");
  process.exit(1);
}

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
  console.error(`Отказ: ${url} — не локальный адрес. Скрипт создаёт админа только в локальной базе.`);
  process.exit(1);
}

const email = env.ADMIN_EMAIL || "admin@ailshan.local";
const password = env.ADMIN_PASSWORD || "admin12345";
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

let userId = created?.user?.id;

if (createError) {
  // Пользователь уже есть — ищем его и просто повышаем до админа
  if (!/already|exists|registered/i.test(createError.message)) {
    console.error("Не удалось создать пользователя:", createError.message);
    process.exit(1);
  }

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  userId = list?.users.find((user) => user.email === email)?.id;
  if (!userId) {
    console.error("Пользователь есть, но не найден в списке — проверьте auth вручную.");
    process.exit(1);
  }
}

// Триггер handle_new_user создаёт профиль сам; upsert на случай, если триггера нет
const { error: profileError } = await admin
  .from("profiles")
  .upsert({ id: userId, email, role: "super_admin", onboarding_completed: true }, { onConflict: "id" });

if (profileError) {
  console.error("Профиль не обновлён:", profileError.message);
  process.exit(1);
}

console.log(`Супер-админ готов.\n  email:    ${email}\n  password: ${password}\n  вход:     http://localhost:3000/login`);
