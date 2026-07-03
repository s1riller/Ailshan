"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { moderationSchema, uploadMetadataSchema } from "@/lib/validations/upload";

export async function createUploadMetadataAction(input: unknown) {
  const parsed = uploadMetadataSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, slug, custom_slug, owner_id, is_active, auto_approve, max_file_size_mb, photo_limit")
    .eq("id", parsed.data.eventId)
    .single();

  if (eventError || !event?.is_active) {
    return { ok: false, error: "Мероприятие недоступно для загрузки" };
  }

  const maxBytes = (event.max_file_size_mb ?? 10) * 1024 * 1024;
  if (parsed.data.fileSize > maxBytes) {
    return { ok: false, error: `Фото должно быть до ${event.max_file_size_mb ?? 10} МБ` };
  }

  const { count: uploadCount } = await supabase
    .from("uploads")
    .select("*", { count: "exact", head: true })
    .eq("event_id", parsed.data.eventId);

  if ((uploadCount ?? 0) >= (event.photo_limit ?? 200)) {
    return { ok: false, error: "Лимит фото для мероприятия исчерпан" };
  }

  const { data: upload, error: uploadError } = await supabase
    .from("uploads")
    .insert({
      event_id: parsed.data.eventId,
      guest_name: parsed.data.guestName,
      message: parsed.data.message || null,
      file_path: parsed.data.filePath,
      file_type: parsed.data.fileType,
      file_size: parsed.data.fileSize,
      status: event.auto_approve ? "approved" : "pending",
    })
    .select("id")
    .single();

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { error: consentError } = await supabase.from("consents").insert({
    upload_id: upload.id,
    accepted_privacy: true,
  });

  if (consentError) {
    return { ok: false, error: consentError.message };
  }

  revalidatePath(`/dashboard/events/${parsed.data.eventId}`);
  revalidatePath(`/live/${event.custom_slug || event.slug}`);

  await supabase.from("notifications").insert({
    user_id: event.owner_id,
    title: event.auto_approve ? "Новое фото опубликовано" : "Новое фото ждет модерации",
    body: `${parsed.data.guestName} загрузил(а) фото к мероприятию.`,
  });

  return { ok: true, slug: event.custom_slug || event.slug };
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
    throw new Error("Нужно войти");
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, slug")
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
    throw new Error(error.message);
  }

  await supabase.from("moderation_logs").insert({
    event_id: parsed.data.eventId,
    upload_id: parsed.data.uploadId,
    actor_id: user.id,
    action: parsed.data.status,
  });

  revalidatePath(`/dashboard/events/${parsed.data.eventId}`);
  revalidatePath(`/live/${event.slug}`);
}

export async function bulkModerateUploadsAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const status = String(formData.get("status") ?? "");
  const uploadIds = formData.getAll("uploadIds").map(String).filter(Boolean);

  if (!eventId || !["approved", "rejected"].includes(status) || uploadIds.length === 0) {
    throw new Error("Выберите фото для массовой модерации");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Нужно войти");
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, slug")
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
    throw new Error(error.message);
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
  revalidatePath(`/live/${event.slug}`);
}
