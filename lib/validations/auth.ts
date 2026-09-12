import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().email("Введите почту в формате name@agency.ru"),
  password: z.string().min(6, "Пароль — не короче шести символов"),
});

export type AuthInput = z.infer<typeof authSchema>;

/**
 * Supabase отвечает по-английски и слишком подробно. Наружу уходит только
 * то, что подсказывает следующий шаг; исходный текст — в консоль.
 */
const AUTH_ERROR_MESSAGES: Array<[needle: string, message: string]> = [
  ["invalid login credentials", "Неверный email или пароль"],
  ["invalid_credentials", "Неверный email или пароль"],
  ["email not confirmed", "Подтвердите почту по ссылке из письма"],
  ["email_not_confirmed", "Подтвердите почту по ссылке из письма"],
  ["user already registered", "Такой кабинет уже есть — войдите"],
  ["user_already_exists", "Такой кабинет уже есть — войдите"],
  ["rate limit", "Слишком много попыток. Подождите несколько минут"],
  ["password should be at least", "Пароль — не короче шести символов"],
  ["signup is disabled", "Регистрация сейчас закрыта. Напишите в поддержку"],
];

export function authErrorMessage(error: { message?: string; code?: string } | null | undefined): string {
  // Ищем и по коду (invalid_credentials), и по тексту («Invalid login credentials»)
  const raw = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  const match = AUTH_ERROR_MESSAGES.find(([needle]) => raw.includes(needle));
  return match ? match[1] : "Не удалось войти. Попробуйте ещё раз.";
}
