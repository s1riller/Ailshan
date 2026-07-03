import { z } from "zod";

export const uploadMetadataSchema = z.object({
  eventId: z.string().uuid(),
  guestName: z.string().min(2, "Введите имя").max(80, "Слишком длинное имя"),
  message: z.string().max(500, "Пожелание слишком длинное").optional(),
  filePath: z.string().min(1),
  fileType: z.string().regex(/^image\/(jpeg|png|webp|heic|heif)$/i, "Можно загрузить только фото"),
  fileSize: z.number().int().positive(),
  acceptedPrivacy: z.literal(true, {
    errorMap: () => ({ message: "Нужно согласие перед отправкой" }),
  }),
});

export const moderationSchema = z.object({
  uploadId: z.string().uuid(),
  eventId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
});

export type UploadMetadataInput = z.infer<typeof uploadMetadataSchema>;
