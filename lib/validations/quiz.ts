import { z } from "zod";

export const createQuizSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().trim().min(3, "Введите название квиза").max(100),
});

export const quizQuestionSchema = z.object({
  eventId: z.string().uuid(),
  quizId: z.string().uuid(),
  question: z.string().trim().min(5, "Введите вопрос").max(500),
  answers: z.array(z.string().trim().min(1, "Заполните все варианты").max(200)).length(4),
  correctAnswerIndex: z.coerce.number().int().min(0).max(3),
  points: z.coerce.number().int().min(1).max(1000),
});

export const quizControlSchema = z.object({
  eventId: z.string().uuid(),
  quizId: z.string().uuid(),
});

export const startQuizSchema = quizControlSchema.extend({
  countdownSeconds: z.coerce.number().int().min(5).max(300),
});

export const createTeamSchema = z.object({
  eventId: z.string().uuid(),
  quizId: z.string().uuid(),
  slug: z.string().min(1),
  guestName: z.string().trim().min(2, "Введите ваше имя").max(80),
  teamName: z.string().trim().min(2, "Введите название команды").max(60),
});

export const joinTeamSchema = z.object({
  eventId: z.string().uuid(),
  quizId: z.string().uuid(),
  slug: z.string().min(1),
  guestName: z.string().trim().min(2, "Введите ваше имя").max(80),
  joinCode: z.string().trim().min(4).max(8).transform((value) => value.toUpperCase()),
});

export const quizAnswerSchema = z.object({
  eventId: z.string().uuid(),
  quizId: z.string().uuid(),
  questionId: z.string().uuid(),
  slug: z.string().min(1),
  answerIndex: z.coerce.number().int().min(0).max(3),
});
