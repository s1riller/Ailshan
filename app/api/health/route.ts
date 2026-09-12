import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Проверка живости для Docker healthcheck и деплой-скрипта. Намеренно не
 * ходит в Supabase: сбой базы — отдельная история, а перезапускать контейнер
 * из-за неё бессмысленно.
 */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
