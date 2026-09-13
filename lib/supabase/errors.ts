import type { PostgrestError } from "@supabase/supabase-js";

/** PostgREST: `.single()` не нашёл строку — это «нет такой записи», а не сбой */
const NO_ROWS = "PGRST116";

/**
 * Сбой запроса к базе (сеть, таймаут, 5xx) — не то же самое, что пустой
 * ответ. Если его молча превратить в null, страница решит, что события нет,
 * и покажет «Такой страницы нет» — а экран зала останется на ней навсегда,
 * потому что автообновление там уже не работает. Бросаем: граница ошибок
 * повторит рендер и перезагрузит страницу сама.
 */
export function throwIfQueryFailed(error: PostgrestError | null, context: string) {
  if (!error || error.code === NO_ROWS) return;
  throw new Error(`[${context}] ${error.message}`);
}
