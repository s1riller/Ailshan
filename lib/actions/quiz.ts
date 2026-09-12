"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveProfile } from "@/lib/authz";
import { memberCookieName, teamCookieName } from "@/lib/games/session";
import { GUEST_COOKIE_MAX_AGE, GUEST_NAME_COOKIE } from "@/lib/guest";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createQuizSchema,
  createTeamSchema,
  joinTeamSchema,
  quizAnswerSchema,
  quizControlSchema,
  quizQuestionSchema,
  startQuizSchema,
  updateQuizQuestionSchema,
  updateQuizSchema,
} from "@/lib/validations/quiz";

const teamCookie = teamCookieName;
const memberCookie = memberCookieName;

/** Ошибки базы для ведущего: детали в лог, наружу — что делать */
function hostError(error: { message: string; code?: string }): Error {
  console.error("[quiz]", error);
  return new Error("Не удалось сохранить изменения. Попробуйте ещё раз.");
}

async function requireOwnedEvent(eventId: string) {
  const { user } = await requireActiveProfile();
  const admin = createAdminClient();
  const { data: event, error } = await admin
    .from("events")
    .select("id, slug, custom_slug")
    .eq("id", eventId)
    .eq("owner_id", user.id)
    .single();

  if (error || !event) throw new Error("Событие не найдено");
  return { admin, event };
}

async function requireOwnedQuiz(eventId: string, quizId: string) {
  const result = await requireOwnedEvent(eventId);
  const { data: quiz, error } = await result.admin
    .from("event_quizzes")
    .select("id")
    .eq("id", quizId)
    .eq("event_id", eventId)
    .single();

  if (error || !quiz) throw new Error("Квиз не найден");
  return result;
}

function revalidateQuiz(eventId: string, slug: string) {
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/e/${slug}/play`);
  revalidatePath(`/live/${slug}`);
}

function redirectGuestError(slug: string, message: string): never {
  redirect(`/e/${encodeURIComponent(slug)}/play?quizError=${encodeURIComponent(message)}`);
}

/**
 * Код команды диктуют вслух под музыку, поэтому в алфавите нет символов,
 * которые путаются на слух и на вид: 0/O, 1/I, 8/B.
 */
const JOIN_CODE_ALPHABET = "ACDEFGHJKMNPQRSTUVWXYZ23456789";
const JOIN_CODE_LENGTH = 5;

function makeJoinCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(JOIN_CODE_LENGTH));
  return Array.from(bytes, (byte) => JOIN_CODE_ALPHABET[byte % JOIN_CODE_ALPHABET.length]).join("");
}

const TEAM_CREATE_ERROR = "Не удалось создать команду. Попробуйте ещё раз.";
const TEAM_JOIN_ERROR = "Не удалось присоединиться к команде. Проверьте код.";
const ANSWER_SAVE_ERROR = "Не удалось сохранить ответ. Попробуйте ещё раз.";

/** Подробности ошибки базы — только в лог; гостю уходит короткое сообщение */
function logGuestError(scope: string, message: string | undefined) {
  console.error(`[quiz] ${scope}: ${message ?? "unknown error"}`);
}

async function saveTeamSession(eventId: string, teamId: string, memberId: string, guestName: string) {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };
  store.set(teamCookie(eventId), teamId, options);
  store.set(memberCookie(eventId), memberId, options);
  // Имя помним и для загрузки фото: cookie не httpOnly, её читает и браузер
  store.set(GUEST_NAME_COOKIE, guestName, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    maxAge: GUEST_COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function createQuizAction(formData: FormData) {
  const parsed = createQuizSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Проверьте квиз");

  const { admin } = await requireOwnedEvent(parsed.data.eventId);
  const { error } = await admin.from("event_quizzes").insert({
    event_id: parsed.data.eventId,
    title: parsed.data.title,
  });
  if (error) throw hostError(error);

  revalidatePath(`/dashboard/events/${parsed.data.eventId}`);
}

export async function updateQuizAction(formData: FormData) {
  const parsed = updateQuizSchema.safeParse({
    eventId: formData.get("eventId"),
    quizId: formData.get("quizId"),
    title: formData.get("title"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Проверьте название квиза");

  const { admin, event } = await requireOwnedQuiz(parsed.data.eventId, parsed.data.quizId);
  const { error } = await admin
    .from("event_quizzes")
    .update({ title: parsed.data.title, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.quizId)
    .eq("event_id", parsed.data.eventId);
  if (error) throw hostError(error);
  revalidateQuiz(parsed.data.eventId, event.custom_slug || event.slug);
}

export async function addQuizQuestionAction(formData: FormData) {
  const parsed = quizQuestionSchema.safeParse({
    eventId: formData.get("eventId"),
    quizId: formData.get("quizId"),
    question: formData.get("question"),
    answers: [formData.get("answer0"), formData.get("answer1"), formData.get("answer2"), formData.get("answer3")],
    correctAnswerIndex: formData.get("correctAnswerIndex"),
    points: formData.get("points"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Проверьте вопрос");

  const { admin } = await requireOwnedQuiz(parsed.data.eventId, parsed.data.quizId);
  const { data: lastQuestion } = await admin
    .from("quiz_questions")
    .select("position")
    .eq("quiz_id", parsed.data.quizId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin.from("quiz_questions").insert({
    quiz_id: parsed.data.quizId,
    question_text: parsed.data.question,
    answers: parsed.data.answers,
    correct_answer_index: parsed.data.correctAnswerIndex,
    points: parsed.data.points,
    position: (lastQuestion?.position ?? -1) + 1,
  });
  if (error) throw hostError(error);

  revalidatePath(`/dashboard/events/${parsed.data.eventId}`);
}

export async function updateQuizQuestionAction(formData: FormData) {
  const parsed = updateQuizQuestionSchema.safeParse({
    eventId: formData.get("eventId"),
    quizId: formData.get("quizId"),
    questionId: formData.get("questionId"),
    question: formData.get("question"),
    answers: [formData.get("answer0"), formData.get("answer1"), formData.get("answer2"), formData.get("answer3")],
    correctAnswerIndex: formData.get("correctAnswerIndex"),
    points: formData.get("points"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Проверьте вопрос");

  const { admin } = await requireOwnedQuiz(parsed.data.eventId, parsed.data.quizId);
  const { error } = await admin
    .from("quiz_questions")
    .update({
      question_text: parsed.data.question,
      answers: parsed.data.answers,
      correct_answer_index: parsed.data.correctAnswerIndex,
      points: parsed.data.points,
    })
    .eq("id", parsed.data.questionId)
    .eq("quiz_id", parsed.data.quizId);
  if (error) throw hostError(error);
  revalidatePath(`/dashboard/events/${parsed.data.eventId}`);
}

export async function deleteQuizQuestionAction(formData: FormData) {
  const parsed = quizControlSchema.extend({ questionId: quizControlSchema.shape.quizId }).safeParse({
    eventId: formData.get("eventId"),
    quizId: formData.get("quizId"),
    questionId: formData.get("questionId"),
  });
  if (!parsed.success) throw new Error("Некорректный вопрос");

  const { admin } = await requireOwnedQuiz(parsed.data.eventId, parsed.data.quizId);
  const { error } = await admin
    .from("quiz_questions")
    .delete()
    .eq("id", parsed.data.questionId)
    .eq("quiz_id", parsed.data.quizId);
  if (error) throw hostError(error);
  revalidatePath(`/dashboard/events/${parsed.data.eventId}`);
}

export async function startQuizAction(formData: FormData) {
  const parsed = startQuizSchema.safeParse({
    eventId: formData.get("eventId"),
    quizId: formData.get("quizId"),
    countdownSeconds: formData.get("countdownSeconds"),
  });
  if (!parsed.success) throw new Error("Выберите время до старта");

  const { admin, event } = await requireOwnedQuiz(parsed.data.eventId, parsed.data.quizId);
  const { count } = await admin
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", parsed.data.quizId);
  if (!count) throw new Error("Добавьте хотя бы один вопрос");

  await admin.from("quiz_answers").delete().in(
    "question_id",
    (await admin.from("quiz_questions").select("id").eq("quiz_id", parsed.data.quizId)).data?.map((item) => item.id) ?? [],
  );

  const startsAt = new Date(Date.now() + parsed.data.countdownSeconds * 1000).toISOString();
  const { error } = await admin
    .from("event_quizzes")
    .update({ status: "countdown", starts_at: startsAt, current_question_index: 0, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.quizId)
    .eq("event_id", parsed.data.eventId);
  if (error) throw hostError(error);

  revalidateQuiz(parsed.data.eventId, event.custom_slug || event.slug);
}

export async function nextQuizQuestionAction(formData: FormData) {
  const parsed = quizControlSchema.safeParse({ eventId: formData.get("eventId"), quizId: formData.get("quizId") });
  if (!parsed.success) throw new Error("Некорректный квиз");

  const { admin, event } = await requireOwnedQuiz(parsed.data.eventId, parsed.data.quizId);
  const [{ data: quiz }, { count }] = await Promise.all([
    admin.from("event_quizzes").select("current_question_index").eq("id", parsed.data.quizId).single(),
    admin.from("quiz_questions").select("id", { count: "exact", head: true }).eq("quiz_id", parsed.data.quizId),
  ]);
  if (!quiz || !count) throw new Error("Вопросы не найдены");

  const nextIndex = quiz.current_question_index + 1;
  const finished = nextIndex >= count;
  const { error } = await admin
    .from("event_quizzes")
    .update({
      status: finished ? "finished" : "active",
      starts_at: null,
      current_question_index: finished ? quiz.current_question_index : nextIndex,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.quizId);
  if (error) throw hostError(error);
  revalidateQuiz(parsed.data.eventId, event.custom_slug || event.slug);
}

export async function finishQuizAction(formData: FormData) {
  const parsed = quizControlSchema.safeParse({ eventId: formData.get("eventId"), quizId: formData.get("quizId") });
  if (!parsed.success) throw new Error("Некорректный квиз");
  const { admin, event } = await requireOwnedQuiz(parsed.data.eventId, parsed.data.quizId);
  const { error } = await admin.from("event_quizzes").update({ status: "finished", starts_at: null, updated_at: new Date().toISOString() }).eq("id", parsed.data.quizId);
  if (error) throw hostError(error);
  revalidateQuiz(parsed.data.eventId, event.custom_slug || event.slug);
}

export async function resetQuizAction(formData: FormData) {
  const parsed = quizControlSchema.safeParse({ eventId: formData.get("eventId"), quizId: formData.get("quizId") });
  if (!parsed.success) throw new Error("Некорректный квиз");
  const { admin, event } = await requireOwnedQuiz(parsed.data.eventId, parsed.data.quizId);
  const { data: questions = [] } = await admin.from("quiz_questions").select("id").eq("quiz_id", parsed.data.quizId);
  const questionIds = (questions ?? []).map((question) => question.id);
  if (questionIds.length) {
    const { error: answersError } = await admin.from("quiz_answers").delete().in("question_id", questionIds);
    if (answersError) throw new Error(answersError.message);
  }
  const { error } = await admin.from("event_quizzes").update({ status: "draft", starts_at: null, current_question_index: 0, updated_at: new Date().toISOString() }).eq("id", parsed.data.quizId);
  if (error) throw hostError(error);
  revalidateQuiz(parsed.data.eventId, event.custom_slug || event.slug);
}

export async function deleteQuizAction(formData: FormData) {
  const parsed = quizControlSchema.safeParse({ eventId: formData.get("eventId"), quizId: formData.get("quizId") });
  if (!parsed.success) throw new Error("Некорректный квиз");
  const { admin, event } = await requireOwnedQuiz(parsed.data.eventId, parsed.data.quizId);
  const { error } = await admin.from("event_quizzes").delete().eq("id", parsed.data.quizId).eq("event_id", parsed.data.eventId);
  if (error) throw hostError(error);
  revalidateQuiz(parsed.data.eventId, event.custom_slug || event.slug);
}

export async function createQuizTeamAction(formData: FormData) {
  const parsed = createTeamSchema.safeParse({
    eventId: formData.get("eventId"), quizId: formData.get("quizId"), slug: formData.get("slug"),
    guestName: formData.get("guestName"), teamName: formData.get("teamName"),
  });
  if (!parsed.success) redirectGuestError(String(formData.get("slug") || ""), parsed.error.issues[0]?.message ?? "Проверьте, что всё заполнено.");

  const admin = createAdminClient();
  const [{ data: event }, { data: quiz }] = await Promise.all([
    admin.from("events").select("id").eq("id", parsed.data.eventId).eq("is_active", true).maybeSingle(),
    admin.from("event_quizzes").select("id, status").eq("id", parsed.data.quizId).eq("event_id", parsed.data.eventId).maybeSingle(),
  ]);
  if (!event || !quiz || quiz.status === "finished") redirectGuestError(parsed.data.slug, "Квиз сейчас недоступен.");

  // Код уникален в пределах квиза; при редком совпадении пробуем ещё раз
  let team: { id: string } | null = null;
  for (let attempt = 0; attempt < 3 && !team; attempt += 1) {
    const { data, error } = await admin
      .from("quiz_teams")
      .insert({ quiz_id: parsed.data.quizId, name: parsed.data.teamName, join_code: makeJoinCode() })
      .select("id")
      .single();
    if (data) {
      team = data;
    } else if (error?.code !== "23505") {
      logGuestError("create team", error?.message);
      redirectGuestError(parsed.data.slug, TEAM_CREATE_ERROR);
    }
  }
  if (!team) redirectGuestError(parsed.data.slug, TEAM_CREATE_ERROR);

  const { data: member, error: memberError } = await admin.from("quiz_team_members").insert({ team_id: team.id, guest_name: parsed.data.guestName }).select("id").single();
  if (memberError || !member) {
    logGuestError("create member", memberError?.message);
    redirectGuestError(parsed.data.slug, TEAM_CREATE_ERROR);
  }

  await saveTeamSession(parsed.data.eventId, team.id, member.id, parsed.data.guestName);
  revalidatePath(`/e/${parsed.data.slug}/play`);
  redirect(`/e/${encodeURIComponent(parsed.data.slug)}/play?joined=1`);
}

export async function joinQuizTeamAction(formData: FormData) {
  const parsed = joinTeamSchema.safeParse({
    eventId: formData.get("eventId"), quizId: formData.get("quizId"), slug: formData.get("slug"),
    guestName: formData.get("guestName"), joinCode: formData.get("joinCode"),
  });
  if (!parsed.success) redirectGuestError(String(formData.get("slug") || ""), parsed.error.issues[0]?.message ?? "Проверьте, что всё заполнено.");

  const admin = createAdminClient();
  const [{ data: event }, { data: quiz }, { data: team }] = await Promise.all([
    admin.from("events").select("id").eq("id", parsed.data.eventId).eq("is_active", true).maybeSingle(),
    admin.from("event_quizzes").select("id, status").eq("id", parsed.data.quizId).eq("event_id", parsed.data.eventId).maybeSingle(),
    admin.from("quiz_teams").select("id").eq("quiz_id", parsed.data.quizId).eq("join_code", parsed.data.joinCode).maybeSingle(),
  ]);
  if (!event || !quiz || quiz.status === "finished") redirectGuestError(parsed.data.slug, "Квиз сейчас недоступен.");
  if (!team) redirectGuestError(parsed.data.slug, "Команда с таким кодом не найдена. Проверьте код.");
  const { data: member, error } = await admin.from("quiz_team_members").insert({ team_id: team.id, guest_name: parsed.data.guestName }).select("id").single();
  if (error || !member) {
    logGuestError("join member", error?.message);
    redirectGuestError(parsed.data.slug, TEAM_JOIN_ERROR);
  }

  await saveTeamSession(parsed.data.eventId, team.id, member.id, parsed.data.guestName);
  revalidatePath(`/e/${parsed.data.slug}/play`);
  redirect(`/e/${encodeURIComponent(parsed.data.slug)}/play?joined=1`);
}

export async function leaveQuizTeamAction(formData: FormData) {
  const eventId = String(formData.get("eventId") || "");
  const slug = String(formData.get("slug") || "");
  const store = await cookies();
  store.delete(teamCookie(eventId));
  store.delete(memberCookie(eventId));
  redirect(`/e/${encodeURIComponent(slug)}/play`);
}

export async function submitQuizAnswerAction(formData: FormData) {
  const fallbackSlug = String(formData.get("slug") || "");
  const parsed = quizAnswerSchema.safeParse({
    eventId: formData.get("eventId"), quizId: formData.get("quizId"), questionId: formData.get("questionId"),
    slug: formData.get("slug"), answerIndex: formData.get("answerIndex"),
  });
  if (!parsed.success) redirectGuestError(fallbackSlug, "Выберите ответ.");

  const store = await cookies();
  const teamId = store.get(teamCookie(parsed.data.eventId))?.value;
  const memberId = store.get(memberCookie(parsed.data.eventId))?.value;
  if (!teamId || !memberId) redirectGuestError(parsed.data.slug, "Сначала войдите в команду.");

  const admin = createAdminClient();
  await admin.rpc("activate_due_quiz", { p_quiz_id: parsed.data.quizId });
  const [{ data: event }, { data: quiz }] = await Promise.all([
    admin.from("events").select("id").eq("id", parsed.data.eventId).eq("is_active", true).maybeSingle(),
    admin.from("event_quizzes").select("status, starts_at, current_question_index").eq("id", parsed.data.quizId).eq("event_id", parsed.data.eventId).single(),
  ]);
  if (!event) redirectGuestError(parsed.data.slug, "Событие уже завершено.");
  const active = quiz?.status === "active";
  if (!active) redirectGuestError(parsed.data.slug, "Ведущий ещё не открыл вопрос.");

  const { data: questions = [] } = await admin.from("quiz_questions").select("id, correct_answer_index, points").eq("quiz_id", parsed.data.quizId).order("position");
  const question = questions?.[quiz.current_question_index];
  if (!question || question.id !== parsed.data.questionId) redirectGuestError(parsed.data.slug, "Ведущий уже перешёл к следующему вопросу.");

  const { data: membership } = await admin.from("quiz_team_members").select("id").eq("id", memberId).eq("team_id", teamId).maybeSingle();
  if (!membership) redirectGuestError(parsed.data.slug, "Команда не найдена. Войдите в команду заново.");

  const correct = parsed.data.answerIndex === question.correct_answer_index;
  const { error } = await admin.from("quiz_answers").insert({
    question_id: question.id, team_id: teamId, member_id: memberId,
    selected_answer_index: parsed.data.answerIndex, is_correct: correct, points: correct ? question.points : 0,
  });
  if (error?.code === "23505") redirectGuestError(parsed.data.slug, "Команда уже ответила на этот вопрос.");
  if (error) {
    logGuestError("insert answer", error.message);
    redirectGuestError(parsed.data.slug, ANSWER_SAVE_ERROR);
  }

  revalidatePath(`/e/${parsed.data.slug}/play`);
  revalidatePath(`/live/${parsed.data.slug}`);
  redirect(`/e/${encodeURIComponent(parsed.data.slug)}/play?answered=1`);
}
