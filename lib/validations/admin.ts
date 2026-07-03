import { z } from "zod";

export const applicationSchema = z.object({
  name: z.string().min(2, "Введите имя").max(100),
  email: z.string().email("Введите корректный email"),
  phone: z.string().max(40).optional(),
  message: z.string().min(5, "Введите сообщение").max(1000),
});

export const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.string().min(2).max(40),
});

export const supportTicketSchema = z.object({
  subject: z.string().min(3, "Введите тему").max(140),
  message: z.string().min(5, "Введите сообщение").max(2000),
});

export const supportReplySchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().min(2, "Введите ответ").max(2000),
});
