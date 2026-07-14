import { z } from "zod";

export const gameTypeSchema = z.enum([
  "photo_challenge",
  "bingo",
  "question",
  "guess_guest",
  "wheel_task",
  "team_battle",
  "poll",
  "secret_mission",
  "time_capsule",
  "millionaire",
]);

export const gameEntrySchema = z.object({
  eventId: z.string().uuid(),
  slug: z.string().min(1),
  gameType: gameTypeSchema,
  guestName: z.string().min(2, "Введите имя").max(80, "Слишком длинное имя"),
  content: z.string().min(1, "Заполните ответ").max(800, "Слишком длинный ответ"),
  metadata: z.record(z.string(), z.unknown()).optional(),
  score: z.coerce.number().int().min(0).max(1000).default(1),
});

export const photoVoteSchema = z.object({
  eventId: z.string().uuid(),
  slug: z.string().min(1),
  uploadId: z.string().uuid(),
  guestName: z.string().min(2, "Введите имя").max(80, "Слишком длинное имя"),
});
