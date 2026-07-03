import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

export type AuthInput = z.infer<typeof authSchema>;
