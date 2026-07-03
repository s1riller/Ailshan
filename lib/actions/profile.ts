"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ensureProfile, requireActiveProfile } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { accountSettingsSchema, profileSchema, supportMessageSchema } from "@/lib/validations/profile";

export async function updateProfileAction(formData: FormData) {
  const { user } = await requireActiveProfile();
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName") || undefined,
    phone: formData.get("phone") || undefined,
    companyName: formData.get("companyName") || undefined,
    city: formData.get("city") || undefined,
    locale: formData.get("locale") || "ru",
    timezone: formData.get("timezone") || "Asia/Irkutsk",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Проверьте профиль");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName || null,
      phone: parsed.data.phone || null,
      company_name: parsed.data.companyName || null,
      city: parsed.data.city || null,
      locale: parsed.data.locale,
      timezone: parsed.data.timezone,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard");
}

export async function completeOnboardingAction(formData: FormData) {
  const { user } = await ensureProfile();
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName") || undefined,
    phone: formData.get("phone") || undefined,
    companyName: formData.get("companyName") || undefined,
    city: formData.get("city") || undefined,
    locale: "ru",
    timezone: "Asia/Irkutsk",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Проверьте данные");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName || null,
      phone: parsed.data.phone || null,
      company_name: parsed.data.companyName || null,
      city: parsed.data.city || null,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard/events/new");
}

export async function updateAccountSettingsAction(formData: FormData) {
  const { user } = await requireActiveProfile();
  const parsed = accountSettingsSchema.safeParse({
    emailNotifications: formData.get("emailNotifications") === "on",
  });

  if (!parsed.success) {
    throw new Error("Проверьте настройки");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      email_notifications: parsed.data.emailNotifications,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/settings");
}

export async function markNotificationReadAction(formData: FormData) {
  const { user } = await requireActiveProfile();
  const id = String(formData.get("id") ?? "");
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/notifications");
}

export async function createUserSupportMessageAction(formData: FormData) {
  const { user } = await requireActiveProfile();
  const parsed = supportMessageSchema.safeParse({
    ticketId: formData.get("ticketId"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Введите сообщение");
  }

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id")
    .eq("id", parsed.data.ticketId)
    .eq("user_id", user.id)
    .single();

  if (!ticket) {
    throw new Error("Обращение не найдено");
  }

  const { error } = await admin.from("support_messages").insert({
    ticket_id: parsed.data.ticketId,
    sender_id: user.id,
    sender_role: "user",
    message: parsed.data.message,
  });

  if (error) {
    throw new Error(error.message);
  }

  await admin.from("support_tickets").update({ status: "open" }).eq("id", parsed.data.ticketId);
  revalidatePath(`/dashboard/support/${parsed.data.ticketId}`);
}
