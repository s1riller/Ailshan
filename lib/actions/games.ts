"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveProfile } from "@/lib/authz";
import { CONTEST_GAME_BY_TYPE, getGameDefinition } from "@/lib/games/catalog";
import { memberCookieName, teamCookieName } from "@/lib/games/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  awardTeamPointsSchema,
  gameConfigSchema,
  guestGameEntrySchema,
  moderateGameEntrySchema,
  photoVoteSchema,
  toggleGameSchema,
} from "@/lib/validations/games";

const MIGRATION_HINT =
  "База ещё не готова к конкурсу: примените миграции из supabase/migrations (локально — npm run db:reset, в облаке — npm run db:push).";

function describeDbError(message: string) {
  if (
    message.includes("event_games") ||
    message.includes("schema cache") ||
    message.includes("team_id") ||
    message.includes("member_id")
  ) {
    return MIGRATION_HINT;
  }

  return `Не удалось сохранить результат: ${message}`;
}

function redirectGuestError(slug: string, message: string): never {
  redirect(`/e/${encodeURIComponent(slug)}/play?gameError=${encodeURIComponent(message)}`);
}

/** Поля формы с префиксом meta_ складываются в metadata записи */
function formMetadata(formData: FormData) {
  const metadata: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("meta_")) continue;
    metadata[key.replace("meta_", "")] = String(value);
  }

  return metadata;
}

async function readTeamSession(eventId: string) {
  const store = await cookies();

  return {
    teamId: store.get(teamCookieName(eventId))?.value ?? null,
    memberId: store.get(memberCookieName(eventId))?.value ?? null,
  };
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

  if (error || !event) throw new Error("Мероприятие не найдено");

  return { admin, event, slug: event.custom_slug || event.slug };
}

function revalidateContest(eventId: string, slug: string) {
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/e/${slug}/play`);
  revalidatePath(`/live/${slug}`);
}

const GAME_COLUMNS = "game_type, title, prompt, options, correct_option, points, requires_approval, is_enabled";

// ---------------------------------------------------------------------------
// Гость
// ---------------------------------------------------------------------------

export async function submitGameEntryAction(formData: FormData) {
  const fallbackSlug = String(formData.get("slug") || "");
  const parsed = guestGameEntrySchema.safeParse({
    eventId: formData.get("eventId"),
    slug: formData.get("slug"),
    gameType: formData.get("gameType"),
    // У игр с вариантами поля content в форме нет: formData.get даёт null,
    // а .default("") в Zod срабатывает только на undefined
    content: formData.get("content") ?? "",
    optionIndex: formData.get("optionIndex") ?? null,
    metadata: formMetadata(formData),
  });

  if (!parsed.success) {
    redirectGuestError(fallbackSlug, parsed.error.issues[0]?.message ?? "Проверьте ответ");
  }

  const { eventId, slug, gameType, content, optionIndex, metadata } = parsed.data;
  const definition = getGameDefinition(gameType);
  if (!definition) redirectGuestError(slug, "Неизвестная игра");
  // Баллы «Битвы команд» начисляет только ведущий — иначе их можно самоначислить подделанным запросом
  if (definition.input === "host") redirectGuestError(slug, "Баллы за эту игру начисляет ведущий");

  const { teamId, memberId } = await readTeamSession(eventId);
  if (!teamId || !memberId) {
    redirectGuestError(slug, "Сначала вступите в команду — баллы начисляются команде");
  }

  const admin = createAdminClient();
  const [{ data: event }, { data: config }, { data: membership }] = await Promise.all([
    admin.from("events").select("id").eq("id", eventId).eq("is_active", true).maybeSingle(),
    admin.from("event_games").select(GAME_COLUMNS).eq("event_id", eventId).eq("game_type", gameType).maybeSingle(),
    admin.from("quiz_team_members").select("id, guest_name").eq("id", memberId).eq("team_id", teamId).maybeSingle(),
  ]);

  if (!event) redirectGuestError(slug, "Мероприятие уже завершено");
  if (!membership) redirectGuestError(slug, "Команда не найдена. Войдите в команду заново");
  if (!config?.is_enabled) redirectGuestError(slug, "Ведущий ещё не открыл эту игру");

  // Одна попытка на команду — иначе баллы можно было бы накручивать повторами
  const { data: teamEntries, error: entriesError } = await admin
    .from("game_entries")
    .select("id, metadata")
    .eq("event_id", eventId)
    .eq("team_id", teamId)
    .eq("game_type", gameType);
  if (entriesError) redirectGuestError(slug, describeDbError(entriesError.message));
  const existing = teamEntries ?? [];

  if (!definition.allowsMultipleEntries && existing.length > 0) {
    redirectGuestError(slug, "Команда уже участвовала в этой игре");
  }

  // Варианты хранятся в jsonb, поэтому приводим к массиву строк явно
  const options = Array.isArray(config.options)
    ? config.options.filter((item): item is string => typeof item === "string")
    : [];

  if (definition.input === "bingo") {
    const cell = String(metadata.cell ?? "");
    // Клетка не из карточки — подделанный запрос, иначе баллы копятся без предела
    if (!options.includes(cell)) redirectGuestError(slug, "Такой клетки нет в карточке");
    const alreadyMarked = existing.some(
      (row) => String((row.metadata as Record<string, unknown> | null)?.cell ?? "") === cell,
    );
    if (alreadyMarked) redirectGuestError(slug, "Эта клетка уже отмечена вашей командой");
  }

  if (definition.input === "photo") {
    const filePath = String(metadata.filePath ?? "");
    if (!filePath.startsWith(`events/${eventId}/games/`)) {
      redirectGuestError(slug, "Сначала загрузите фото");
    }
  }

  let answerText = content;
  if (definition.input === "choice") {
    if (optionIndex === null || optionIndex >= options.length) {
      redirectGuestError(slug, "Выберите вариант ответа");
    }
    answerText = options[optionIndex];
  } else if (!answerText) {
    redirectGuestError(slug, "Заполните ответ");
  }

  const points = config.points ?? definition.defaultPoints;
  const checksAnswer = definition.hasCorrectOption && config.correct_option !== null;
  const isCorrect = checksAnswer && optionIndex === config.correct_option;
  const score = checksAnswer ? (isCorrect ? points : 0) : points;
  const status = config.requires_approval ? "pending" : "approved";

  const { error } = await admin.from("game_entries").insert({
    event_id: eventId,
    game_type: gameType,
    guest_name: membership.guest_name,
    content: answerText,
    metadata: {
      ...metadata,
      ...(optionIndex === null ? {} : { optionIndex }),
      ...(checksAnswer ? { isCorrect } : {}),
    },
    score,
    status,
    team_id: teamId,
    member_id: memberId,
  });

  if (error?.code === "23505") redirectGuestError(slug, "Команда уже участвовала в этой игре");
  if (error) redirectGuestError(slug, describeDbError(error.message));

  revalidatePath(`/e/${slug}/play`);
  revalidatePath(`/live/${slug}`);

  const result = status === "pending" ? "pending" : checksAnswer ? (isCorrect ? "correct" : "wrong") : "ok";
  redirect(`/e/${encodeURIComponent(slug)}/play?game=${result}`);
}

export async function voteForPhotoAction(formData: FormData) {
  const fallbackSlug = String(formData.get("slug") || "");
  const parsed = photoVoteSchema.safeParse({
    eventId: formData.get("eventId"),
    slug: formData.get("slug"),
    uploadId: formData.get("uploadId"),
  });

  if (!parsed.success) {
    redirectGuestError(fallbackSlug, parsed.error.issues[0]?.message ?? "Выберите фотографию");
  }

  const { eventId, slug, uploadId } = parsed.data;
  const { teamId, memberId } = await readTeamSession(eventId);
  if (!teamId || !memberId) {
    redirectGuestError(slug, "Сначала вступите в команду — голос приносит баллы команде");
  }

  const admin = createAdminClient();
  const [{ data: event }, { data: config }, { data: upload }] = await Promise.all([
    admin.from("events").select("id").eq("id", eventId).eq("is_active", true).maybeSingle(),
    admin.from("event_games").select("is_enabled").eq("event_id", eventId).eq("game_type", "photo_vote").maybeSingle(),
    admin.from("uploads").select("id").eq("id", uploadId).eq("event_id", eventId).eq("status", "approved").maybeSingle(),
  ]);

  if (!event) redirectGuestError(slug, "Мероприятие уже завершено");
  if (!config?.is_enabled) redirectGuestError(slug, "Голосование сейчас закрыто");
  if (!upload) redirectGuestError(slug, "Фотография недоступна для голосования");

  const { data: membership } = await admin
    .from("quiz_team_members")
    .select("id, guest_name")
    .eq("id", memberId)
    .eq("team_id", teamId)
    .maybeSingle();
  if (!membership) redirectGuestError(slug, "Команда не найдена. Войдите в команду заново");

  const { error } = await admin.from("photo_votes").insert({
    event_id: eventId,
    upload_id: uploadId,
    guest_name: membership.guest_name,
    team_id: teamId,
    member_id: memberId,
  });

  if (error?.code === "23505") redirectGuestError(slug, "Вы уже отдали свой голос");
  if (error) redirectGuestError(slug, describeDbError(error.message));

  revalidatePath(`/e/${slug}/play`);
  revalidatePath(`/live/${slug}`);
  redirect(`/e/${encodeURIComponent(slug)}/play?game=voted`);
}

// ---------------------------------------------------------------------------
// Ведущий
// ---------------------------------------------------------------------------

export async function saveGameConfigAction(formData: FormData) {
  const rawCorrect = String(formData.get("correctOption") ?? "").trim();
  const parsed = gameConfigSchema.safeParse({
    eventId: formData.get("eventId"),
    gameType: formData.get("gameType"),
    title: formData.get("title"),
    prompt: formData.get("prompt") ?? "",
    options: formData
      .getAll("options")
      .map((value) => String(value).trim())
      .filter(Boolean),
    correctOption: rawCorrect === "" ? null : rawCorrect,
    points: formData.get("points"),
    requiresApproval: formData.get("requiresApproval") === "on",
    isEnabled: formData.get("isEnabled") === "on",
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Проверьте настройки игры");

  const { admin, slug } = await requireOwnedEvent(parsed.data.eventId);
  const { error } = await admin.from("event_games").upsert(
    {
      event_id: parsed.data.eventId,
      game_type: parsed.data.gameType,
      title: parsed.data.title,
      prompt: parsed.data.prompt,
      options: parsed.data.options,
      correct_option: parsed.data.correctOption,
      points: parsed.data.points,
      requires_approval: parsed.data.requiresApproval,
      is_enabled: parsed.data.isEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_id,game_type" },
  );

  if (error) throw new Error(describeDbError(error.message));

  revalidateContest(parsed.data.eventId, slug);
}

export async function toggleGameAction(formData: FormData) {
  const parsed = toggleGameSchema.safeParse({
    eventId: formData.get("eventId"),
    gameType: formData.get("gameType"),
    isEnabled: formData.get("isEnabled") === "true",
  });

  if (!parsed.success) throw new Error("Некорректная игра");

  const { admin, slug } = await requireOwnedEvent(parsed.data.eventId);
  const definition = CONTEST_GAME_BY_TYPE.get(parsed.data.gameType);
  if (!definition) throw new Error("Неизвестная игра");

  const { data: existing } = await admin
    .from("event_games")
    .select("game_type")
    .eq("event_id", parsed.data.eventId)
    .eq("game_type", parsed.data.gameType)
    .maybeSingle();

  // Игру можно включить, ни разу не открыв настройки — тогда берём значения из каталога
  const { error } = existing
    ? await admin
        .from("event_games")
        .update({ is_enabled: parsed.data.isEnabled, updated_at: new Date().toISOString() })
        .eq("event_id", parsed.data.eventId)
        .eq("game_type", parsed.data.gameType)
    : await admin.from("event_games").insert({
        event_id: parsed.data.eventId,
        game_type: parsed.data.gameType,
        title: definition.label,
        prompt: definition.defaultPrompt,
        options: definition.defaultOptions ?? [],
        correct_option: definition.hasCorrectOption ? 0 : null,
        points: definition.defaultPoints,
        requires_approval: definition.defaultRequiresApproval,
        is_enabled: parsed.data.isEnabled,
        updated_at: new Date().toISOString(),
      });

  if (error) throw new Error(describeDbError(error.message));

  revalidateContest(parsed.data.eventId, slug);
}

export async function moderateGameEntryAction(formData: FormData) {
  const rawScore = String(formData.get("score") ?? "").trim();
  const parsed = moderateGameEntrySchema.safeParse({
    eventId: formData.get("eventId"),
    entryId: formData.get("entryId"),
    status: formData.get("status"),
    score: rawScore === "" ? null : rawScore,
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Некорректный результат");

  const { admin, slug } = await requireOwnedEvent(parsed.data.eventId);
  const update: { status: string; score?: number } = { status: parsed.data.status };
  if (parsed.data.score !== null) update.score = parsed.data.score;

  const { error } = await admin
    .from("game_entries")
    .update(update)
    .eq("id", parsed.data.entryId)
    .eq("event_id", parsed.data.eventId);

  if (error) throw new Error(describeDbError(error.message));

  revalidateContest(parsed.data.eventId, slug);
}

export async function awardTeamPointsAction(formData: FormData) {
  const parsed = awardTeamPointsSchema.safeParse({
    eventId: formData.get("eventId"),
    teamId: formData.get("teamId"),
    points: formData.get("points"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Проверьте баллы");

  const { admin, slug } = await requireOwnedEvent(parsed.data.eventId);
  const { data: quiz } = await admin
    .from("event_quizzes")
    .select("id")
    .eq("event_id", parsed.data.eventId)
    .maybeSingle();
  const { data: team } = quiz
    ? await admin.from("quiz_teams").select("id, name").eq("id", parsed.data.teamId).eq("quiz_id", quiz.id).maybeSingle()
    : { data: null };
  if (!team) throw new Error("Команда не найдена в этом мероприятии");

  const { error } = await admin.from("game_entries").insert({
    event_id: parsed.data.eventId,
    game_type: "team_battle",
    guest_name: team.name,
    content: parsed.data.reason || "Баллы за конкурс в зале",
    metadata: { awardedBy: "host" },
    score: parsed.data.points,
    status: "approved",
    team_id: parsed.data.teamId,
  });

  if (error) throw new Error(describeDbError(error.message));

  revalidateContest(parsed.data.eventId, slug);
}

export async function resetContestScoresAction(formData: FormData) {
  const eventId = String(formData.get("eventId") || "");
  if (!eventId) throw new Error("Некорректное мероприятие");

  const { admin, slug } = await requireOwnedEvent(eventId);
  const { error: entriesError } = await admin.from("game_entries").delete().eq("event_id", eventId);
  if (entriesError) throw new Error(describeDbError(entriesError.message));

  const { error: votesError } = await admin.from("photo_votes").delete().eq("event_id", eventId);
  if (votesError) throw new Error(describeDbError(votesError.message));

  revalidateContest(eventId, slug);
}
