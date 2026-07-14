"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { gameEntrySchema, photoVoteSchema } from "@/lib/validations/games";

function formMetadata(formData: FormData) {
  const metadata: Record<string, string | string[]> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("meta_")) continue;

    const cleanKey = key.replace("meta_", "");
    const stringValue = String(value);

    if (metadata[cleanKey]) {
      const current = metadata[cleanKey];
      metadata[cleanKey] = Array.isArray(current)
        ? [...current, stringValue]
        : [current, stringValue];
    } else {
      metadata[cleanKey] = stringValue;
    }
  }

  return metadata;
}

async function findActiveEvent(eventId: string) {
  const supabase = createAdminClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("id, slug, custom_slug, is_active")
    .eq("id", eventId)
    .single();

  return { supabase, event, error };
}

function redirectWithError(slug: string, message: string): never {
  redirect(`/e/${encodeURIComponent(slug)}/play?gameError=${encodeURIComponent(message)}`);
}

function getGameErrorMessage(message: string) {
  if (message.includes("game_entries_game_type_check")) {
    return "База данных не обновлена для этой игры. Выполните supabase/add-millionaire-game.sql в Supabase SQL Editor.";
  }

  if (message.includes("schema cache") || message.includes("game_entries")) {
    return "Таблицы игр недоступны. Выполните supabase/games.sql в Supabase SQL Editor.";
  }

  return `Не удалось сохранить результат: ${message}`;
}

export async function submitGameEntryAction(formData: FormData) {
  const fallbackSlug = String(formData.get("slug") || "");
  const parsed = gameEntrySchema.safeParse({
    eventId: formData.get("eventId"),
    slug: formData.get("slug"),
    gameType: formData.get("gameType"),
    guestName: formData.get("guestName"),
    content: formData.get("content"),
    metadata: formMetadata(formData),
    score: formData.get("score") || 1,
  });

  if (!parsed.success) {
    redirectWithError(
      fallbackSlug,
      parsed.error.issues[0]?.message ?? "Проверьте данные игры",
    );
  }

  const { supabase, event, error: eventError } = await findActiveEvent(parsed.data.eventId);

  if (eventError || !event?.is_active) {
    redirectWithError(fallbackSlug, "Мероприятие не найдено или уже завершено.");
  }

  const { error } = await supabase.from("game_entries").insert({
    event_id: parsed.data.eventId,
    game_type: parsed.data.gameType,
    guest_name: parsed.data.guestName,
    content: parsed.data.content,
    metadata: parsed.data.metadata ?? {},
    score: parsed.data.score,
    status: "approved",
  });

  if (error) {
    redirectWithError(fallbackSlug, getGameErrorMessage(error.message));
  }

  const slug = event.custom_slug || event.slug || parsed.data.slug;
  revalidatePath(`/e/${slug}/play`);
  revalidatePath(`/live/${slug}`);
  redirect(`/e/${slug}/play?sent=1`);
}

export async function voteForPhotoAction(formData: FormData) {
  const fallbackSlug = String(formData.get("slug") || "");
  const parsed = photoVoteSchema.safeParse({
    eventId: formData.get("eventId"),
    slug: formData.get("slug"),
    uploadId: formData.get("uploadId"),
    guestName: formData.get("guestName"),
  });

  if (!parsed.success) {
    redirectWithError(
      fallbackSlug,
      parsed.error.issues[0]?.message ?? "Проверьте выбранную фотографию",
    );
  }

  const { supabase, event, error: eventError } = await findActiveEvent(parsed.data.eventId);

  if (eventError || !event?.is_active) {
    redirectWithError(fallbackSlug, "Мероприятие не найдено или уже завершено.");
  }

  const { error } = await supabase.from("photo_votes").insert({
    event_id: parsed.data.eventId,
    upload_id: parsed.data.uploadId,
    guest_name: parsed.data.guestName,
  });

  if (error) {
    redirectWithError(fallbackSlug, getGameErrorMessage(error.message));
  }

  const slug = event.custom_slug || event.slug || parsed.data.slug;
  revalidatePath(`/e/${slug}/play`);
  revalidatePath(`/live/${slug}`);
  redirect(`/e/${slug}/play?voted=1`);
}
