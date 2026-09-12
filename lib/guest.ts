/**
 * Что помним о госте между действиями. Cookie не httpOnly — их ставит
 * браузер после успешной загрузки, а серверные страницы читают, чтобы
 * подставить имя и показать «ваши снимки».
 */
export const GUEST_NAME_COOKIE = "ailshan_guest_name";
export const guestUploadsCookie = (eventId: string) => `ailshan_uploads_${eventId}`;

export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function parseUploadIds(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^[0-9a-f-]{36}$/i.test(item))
    .slice(-30);
}
