"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveProfile } from "@/lib/authz";
import { isPro, FREE_PHOTO_LIMIT, PRO_PHOTO_LIMIT } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { eventSchema, eventSettingsSchema } from "@/lib/validations/event";
import { slugify } from "@/lib/utils";

export async function createEventAction(formData: FormData) {
  const { user, profile } = await requireActiveProfile();
  const supabase = await createClient();
  const { count } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if ((count ?? 0) >= (profile.events_limit ?? 3)) {
    throw new Error(`Лимит мероприятий: ${profile.events_limit ?? 3}`);
  }

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date") || undefined,
    location: formData.get("location") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Проверьте данные события");
  }

  const seed = slugify(parsed.data.title) || "event";
  const slug = `${seed}-${crypto.randomUUID().slice(0, 8)}`;

  const { data, error } = await supabase
    .from("events")
    .insert({
      owner_id: user.id,
      title: parsed.data.title,
      slug,
      date: parsed.data.date || null,
      location: parsed.data.location || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("event_zones").insert({
    event_id: data.id,
    name: "Основная зона",
    qr_token: crypto.randomUUID(),
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${data.id}`);
}

export async function updateEventSettingsAction(formData: FormData) {
  const { user, profile } = await requireActiveProfile();
  const supabase = await createClient();
  const pro = isPro(profile.plan);

  const parsed = eventSettingsSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    date: formData.get("date") || undefined,
    location: formData.get("location") || undefined,
    isActive: formData.get("isActive") === "on",
    guestIntro: formData.get("guestIntro"),
    thanksText: formData.get("thanksText"),
    liveLayout: formData.get("liveLayout"),
    liveTransition: pro ? formData.get("liveTransition") : "fade",
    slideDurationSeconds: formData.get("slideDurationSeconds"),
    liveQrEffect: pro ? formData.get("liveQrEffect") : "fade",
    liveQrIntervalSeconds: formData.get("liveQrIntervalSeconds"),
    showMessagesOnLive: formData.get("showMessagesOnLive") === "on",
    showNamesOnLive: formData.get("showNamesOnLive") === "on",
    showQrOnLive: pro && formData.get("showQrOnLive") === "on",
    autoApprove: pro && formData.get("autoApprove") === "on",
    maxFileSizeMb: formData.get("maxFileSizeMb"),
    customSlug: pro ? formData.get("customSlug") || "" : "",
    brandName: pro ? formData.get("brandName") || undefined : undefined,
    brandColor: pro ? formData.get("brandColor") || undefined : undefined,
    coverTitle: pro ? formData.get("coverTitle") || undefined : undefined,
    guestInstruction: formData.get("guestInstruction") || undefined,
    archiveEnabled: pro && formData.get("archiveEnabled") === "on",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Проверьте настройки мероприятия");
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, slug")
    .eq("id", parsed.data.eventId)
    .eq("owner_id", user.id)
    .single();

  if (eventError || !event) {
    throw new Error("Мероприятие не найдено");
  }

  const { error } = await supabase
    .from("events")
    .update({
      title: parsed.data.title,
      date: parsed.data.date || null,
      location: parsed.data.location || null,
      is_active: parsed.data.isActive,
      theme: "default",
      guest_intro: parsed.data.guestIntro,
      thanks_text: parsed.data.thanksText,
      live_layout: parsed.data.liveLayout,
      live_transition: pro ? parsed.data.liveTransition : "fade",
      slide_duration_seconds: parsed.data.slideDurationSeconds,
      live_qr_effect: pro ? parsed.data.liveQrEffect : "fade",
      live_qr_interval_seconds: pro ? parsed.data.liveQrIntervalSeconds : 20,
      show_messages_on_live: parsed.data.showMessagesOnLive,
      show_names_on_live: parsed.data.showNamesOnLive,
      show_qr_on_live: pro ? parsed.data.showQrOnLive : false,
      auto_approve: parsed.data.autoApprove,
      max_file_size_mb: pro ? parsed.data.maxFileSizeMb : Math.min(parsed.data.maxFileSizeMb, 10),
      custom_slug: pro && parsed.data.customSlug ? parsed.data.customSlug : null,
      brand_name: pro ? parsed.data.brandName || null : null,
      brand_color: pro ? parsed.data.brandColor || null : null,
      cover_title: pro ? parsed.data.coverTitle || null : null,
      guest_instruction: parsed.data.guestInstruction || "Загрузите фото и пожелание по ссылке мероприятия.",
      archive_enabled: pro ? parsed.data.archiveEnabled : false,
      photo_limit: pro ? PRO_PHOTO_LIMIT : FREE_PHOTO_LIMIT,
    })
    .eq("id", parsed.data.eventId)
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${parsed.data.eventId}`);
  revalidatePath(`/e/${event.slug}`);
  revalidatePath(`/live/${event.slug}`);
}
