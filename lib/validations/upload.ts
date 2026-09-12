import { z } from "zod";

/**
 * Снимок приходит уже подготовленным в браузере (JPEG после prepareImage),
 * поэтому HEIC/HEIF здесь не принимаем: такой файл не откроется ни в модерации,
 * ни на экране зала.
 */
export const uploadMetadataSchema = z.object({
  eventId: z.string().uuid(),
  guestName: z.string().trim().min(2, "Введите имя").max(80, "Слишком длинное имя"),
  message: z.string().trim().max(500, "Пожелание слишком длинное").optional(),
  filePath: z.string().min(1),
  fileType: z.string().regex(/^image\/(jpeg|png|webp)$/i, "Можно отправить только фото в JPG, PNG или WEBP"),
  fileSize: z.number().int().positive(),
  acceptedPrivacy: z.literal(true, {
    errorMap: () => ({ message: "Подтвердите согласие перед отправкой" }),
  }),
});

export const moderationSchema = z.object({
  uploadId: z.string().uuid(),
  eventId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
});

export type UploadMetadataInput = z.infer<typeof uploadMetadataSchema>;
