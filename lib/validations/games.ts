import { z } from "zod";

/** Типы, которые могут попасть в game_entries (ограничены check-констрейнтом в БД) */
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

export type GameType = z.infer<typeof gameTypeSchema>;

/**
 * Типы, которые настраиваются в event_games. Голосование за фото пишется в
 * photo_votes, поэтому в game_entries его нет, а настройка — есть.
 */
export const contestGameTypeSchema = z.enum([
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
  "photo_vote",
]);

export type ContestGameType = z.infer<typeof contestGameTypeSchema>;

const optionsSchema = z
  .array(z.string().trim().min(1, "Вариант не может быть пустым").max(200, "Слишком длинный вариант"))
  .max(12, "Не больше 12 вариантов")
  .default([]);

/** Настройка одной мини-игры ведущим */
export const gameConfigSchema = z
  .object({
    eventId: z.string().uuid(),
    gameType: contestGameTypeSchema,
    title: z.string().trim().min(2, "Введите название игры").max(120, "Слишком длинное название"),
    prompt: z.string().trim().max(600, "Слишком длинное описание").default(""),
    options: optionsSchema,
    correctOption: z.coerce.number().int().min(0).max(11).nullable().default(null),
    points: z.coerce.number().int().min(0, "Баллы не могут быть отрицательными").max(1000, "Не больше 1000 баллов"),
    requiresApproval: z.boolean().default(false),
    isEnabled: z.boolean().default(false),
  })
  .refine(
    (value) => value.correctOption === null || value.correctOption < value.options.length,
    { message: "Правильный вариант выходит за список вариантов", path: ["correctOption"] },
  );

export const toggleGameSchema = z.object({
  eventId: z.string().uuid(),
  gameType: contestGameTypeSchema,
  isEnabled: z.boolean(),
});

/**
 * Отправка результата гостем. Имя и команда берутся из cookie на сервере,
 * поэтому в форме их нет — подменить чужую команду нельзя.
 */
export const guestGameEntrySchema = z.object({
  eventId: z.string().uuid(),
  slug: z.string().min(1),
  gameType: gameTypeSchema,
  // Для игр с вариантами текст ответа подставляет сервер из настроек игры,
  // поэтому пустая строка здесь допустима — обязательность проверяется в экшене.
  content: z.string().trim().max(800, "Слишком длинный ответ").default(""),
  optionIndex: z.coerce.number().int().min(0).max(11).nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const photoVoteSchema = z.object({
  eventId: z.string().uuid(),
  slug: z.string().min(1),
  uploadId: z.string().uuid(),
});

/** Подтверждение творческого задания ведущим */
export const moderateGameEntrySchema = z.object({
  eventId: z.string().uuid(),
  entryId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  score: z.coerce.number().int().min(0).max(1000).nullable().default(null),
});

/** Ручное начисление баллов команде за офлайн-конкурс */
export const awardTeamPointsSchema = z.object({
  eventId: z.string().uuid(),
  teamId: z.string().uuid(),
  points: z.coerce.number().int().min(1, "Минимум 1 балл").max(1000, "Не больше 1000 баллов"),
  reason: z.string().trim().max(200, "Слишком длинный комментарий").default(""),
});
