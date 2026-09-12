"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { moderationSchema, uploadMetadataSchema } from "@/lib/validations/upload";

const RETRY_MESSAGE = "Не удалось сохранить снимок. Попробуйте отправить его ещё раз.";

export type CreateUploadResult =
  | { ok: true; slug: string; uploadId: string; status: "pending" | "approved" }
  | { ok: false; error: string };

export async function createUploadMetadataAction(input: unknown): Promise<CreateUploadResult> {
  const parsed = uploadMetadataSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Проверьте данные и попробуйте ещё раз" };
  }

  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, slug, custom_slug, owner_id, is_active, auto_approve, max_file_size_mb, photo_limit")
    .eq("id", parsed.data.eventId)
    .single();

  if (eventError || !event?.is_active) {
    return { ok: false, error: "Приём фото для этого события приостановлен. Уточните у организаторов." };
  }

  const maxMb = event.max_file_size_mb ?? 10;
  if (parsed.data.fileSize > maxMb * 1024 * 1024) {
    return { ok: false, error: `Снимок должен быть не больше ${maxMb} МБ` };
  }

  const { count: uploadCount } = await supabase
    .from("uploads")
    .select("*", { count: "exact", head: true })
    .eq("event_id", parsed.data.eventId);

  if ((uploadCount ?? 0) >= (event.photo_limit ?? 200)) {
    return { ok: false, error: "Место для снимков на этом событии закончилось. Сообщите организаторам." };
  }

  const status = event.auto_approve ? "approved" : "pending";
  const { data: upload, error: uploadError } = await supabase
    .from("uploads")
    .insert({
      event_id: parsed.data.eventId,
      guest_name: parsed.data.guestName,
      message: parsed.data.message || null,
      file_path: parsed.data.filePath,
      file_type: parsed.data.fileType,
      file_size: parsed.data.fileSize,
      status,
    })
    .select("id")
    .single();

  if (uploadError || !upload) {
    console.error("uploads.insert", uploadError);
    // Файл уже лежит в хранилище — убираем, чтобы не копить сирот
    await supabase.storage.from("event-photos").remove([parsed.data.filePath]);
    return { ok: false, error: RETRY_MESSAGE };
  }

  const { error: consentError } = await supabase.from("consents").insert({
    upload_id: upload.id,
    accepted_privacy: true,
  });

  if (consentError) {
    console.error("consents.insert", consentError);
    await supabase.from("uploads").delete().eq("id", upload.id);
    await supabase.storage.from("event-photos").remove([parsed.data.filePath]);
    return { ok: false, error: RETRY_MESSAGE };
  }

  const publicSlug = event.custom_slug || event.slug;
  revalidatePath(`/dashboard/events/${parsed.data.eventId}`);
  revalidatePath(`/live/${publicSlug}`);

  const { error: notificationError } = await supabase.from("notifications").insert({
    user_id: event.owner_id,
    title: event.auto_approve ? "Новое фото на экране" : "Новое фото ждёт проверки",
    body: `Гость ${parsed.data.guestName} добавил фото: «${event.title}».`,
  });

  if (notificationError) {
    console.error("notifications.insert", notificationError);
  }

  return { ok: true, slug: publicSlug, uploadId: upload.id, status };
}

export async function moderateUploadAction(formData: FormData) {
  const parsed = moderationSchema.safeParse({
    uploadId: formData.get("uploadId"),
    eventId: formData.get("eventId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Некорректный статус");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Сессия истекла. Войдите снова.");
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, slug, custom_slug")
    .eq("id", parsed.data.eventId)
    .eq("owner_id", user.id)
    .single();

  if (eventError || !event) {
    throw new Error("Событие не найдено");
  }

  const { error } = await supabase
    .from("uploads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.uploadId)
    .eq("event_id", parsed.data.eventId);

  if (error) {
    console.error("uploads.update", error);
    throw new Error("Не удалось изменить статус снимка. Попробуйте ещё раз.");
  }

  await supabase.from("moderation_logs").insert({
    event_id: parsed.data.eventId,
    upload_id: parsed.data.uploadId,
    actor_id: user.id,
    action: parsed.data.status,
  });

  revalidatePath(`/dashboard/events/${parsed.data.eventId}`);
  revalidatePath(`/live/${event.custom_slug || event.slug}`);
}

export async function bulkModerateUploadsAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const status = String(formData.get("status") ?? "");
  const uploadIds = formData.getAll("uploadIds").map(String).filter(Boolean);

  if (!eventId || !["approved", "rejected"].includes(status) || uploadIds.length === 0) {
    throw new Error("Отметьте снимки, к которым применить действие");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Сессия истекла. Войдите снова.");
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, slug, custom_slug")
    .eq("id", eventId)
    .eq("owner_id", user.id)
    .single();

  if (!event) {
    throw new Error("Событие не найдено");
  }

  const { error } = await supabase
    .from("uploads")
    .update({ status })
    .eq("event_id", eventId)
    .in("id", uploadIds);

  if (error) {
    console.error("uploads.bulkUpdate", error);
    throw new Error("Не удалось изменить статус снимков. Попробуйте ещё раз.");
  }

  await supabase.from("moderation_logs").insert(
    uploadIds.map((uploadId) => ({
      event_id: eventId,
      upload_id: uploadId,
      actor_id: user.id,
      action: `bulk_${status}`,
    })),
  );

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/live/${event.custom_slug || event.slug}`);
}
