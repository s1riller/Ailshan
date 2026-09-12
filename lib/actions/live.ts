"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveProfile } from "@/lib/authz";
import { LIVE_MODES } from "@/lib/live-modes";
import { createAdminClient } from "@/lib/supabase/admin";

const modeSchema = z.object({
  eventId: z.string().uuid(),
  mode: z.enum(LIVE_MODES),
});

const pinSchema = z.object({
  eventId: z.string().uuid(),
  uploadId: z.string().uuid().nullable(),
});

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

  return { admin, slug: event.custom_slug || event.slug };
}

function revalidateScreen(eventId: string, slug: string) {
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/live/${slug}`);
}

/** Что показывает экран зала: авто, заставка, фото, таблица команд или вместе */
export async function setLiveModeAction(formData: FormData) {
  const parsed = modeSchema.safeParse({ eventId: formData.get("eventId"), mode: formData.get("mode") });
  if (!parsed.success) throw new Error("Неизвестный режим экрана");

  const { admin, slug } = await requireOwnedEvent(parsed.data.eventId);
  const { error } = await admin
    .from("events")
    .update({ live_mode: parsed.data.mode })
    .eq("id", parsed.data.eventId);

  if (error) {
    console.error("[live] mode", error);
    throw new Error("Не удалось переключить экран. Попробуйте ещё раз.");
  }

  revalidateScreen(parsed.data.eventId, slug);
}

/** Вывести снимок на экран крупно; пустой uploadId снимает его */
export async function pinLivePhotoAction(formData: FormData) {
  const rawUpload = String(formData.get("uploadId") ?? "").trim();
  const parsed = pinSchema.safeParse({ eventId: formData.get("eventId"), uploadId: rawUpload || null });
  if (!parsed.success) throw new Error("Некорректный снимок");

  const { admin, slug } = await requireOwnedEvent(parsed.data.eventId);

  if (parsed.data.uploadId) {
    // Наружу может уйти только одобренный снимок этого события
    const { data: upload } = await admin
      .from("uploads")
      .select("id")
      .eq("id", parsed.data.uploadId)
      .eq("event_id", parsed.data.eventId)
      .eq("status", "approved")
      .maybeSingle();
    if (!upload) throw new Error("На экран можно вывести только одобренный снимок");
  }

  const { error } = await admin
    .from("events")
    .update({ live_pinned_upload_id: parsed.data.uploadId })
    .eq("id", parsed.data.eventId);

  if (error) {
    console.error("[live] pin", error);
    throw new Error("Не удалось вывести снимок на экран. Попробуйте ещё раз.");
  }

  revalidateScreen(parsed.data.eventId, slug);
}

const screenSchema = z
  .object({
    eventId: z.string().uuid(),
    mode: z.enum(["auto", "manual"]),
    width: z.coerce.number().int().min(320).max(8192).optional(),
    height: z.coerce.number().int().min(240).max(8192).optional(),
  })
  .refine((value) => value.mode === "auto" || (value.width && value.height), {
    message: "Укажите ширину и высоту экрана",
  });

/**
 * Разрешение экрана зала. «Авто» — стена подстраивается под окно браузера;
 * ручное значение нужно, когда сигнал растягивается на экран другой
 * пропорции (LED-полоса 2080×640 с выхода 1920×1080).
 */
export async function setLiveScreenAction(formData: FormData) {
  const parsed = screenSchema.safeParse({
    eventId: formData.get("eventId"),
    mode: formData.get("mode"),
    width: formData.get("width") || undefined,
    height: formData.get("height") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Проверьте размер экрана");

  const manual = parsed.data.mode === "manual";
  const { admin, slug } = await requireOwnedEvent(parsed.data.eventId);
  const { error } = await admin
    .from("events")
    .update({
      live_screen_width: manual ? parsed.data.width : null,
      live_screen_height: manual ? parsed.data.height : null,
    })
    .eq("id", parsed.data.eventId);

  if (error) {
    console.error("[live] screen", error);
    throw new Error("Не удалось сохранить размер экрана. Попробуйте ещё раз.");
  }

  revalidateScreen(parsed.data.eventId, slug);
}
