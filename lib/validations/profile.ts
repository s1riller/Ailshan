import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  companyName: z.string().max(140).optional(),
  city: z.string().max(80).optional(),
  locale: z.enum(["ru", "en"]),
  timezone: z.string().min(2).max(80),
});

export const accountSettingsSchema = z.object({
  emailNotifications: z.boolean(),
});

export const supportMessageSchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().min(2, "Введите сообщение").max(2000),
});
