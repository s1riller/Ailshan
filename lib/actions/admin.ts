"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ensureProfile, requireSuperAdmin } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicationSchema, statusSchema, supportReplySchema, supportTicketSchema } from "@/lib/validations/admin";
import { moderationSchema } from "@/lib/validations/upload";

export async function createApplicationAction(formData: FormData) {
  const parsed = applicationSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Проверьте заявку");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("applications").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    message: parsed.data.message,
    status: "new",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  redirect("/?application=sent");
}

export async function updateApplicationStatusAction(formData: FormData) {
  await requireSuperAdmin();
  const parsed = statusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });

  if (!parsed.success || !["new", "in_progress", "closed"].includes(parsed.data.status)) {
    throw new Error("Некорректный статус заявки");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("applications").update({ status: parsed.data.status }).eq("id", parsed.data.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/applications");
}

export async function toggleUserBlockedAction(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const isBlocked = formData.get("isBlocked") === "true";

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_blocked: !isBlocked }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/users");
}

export async function updateUserPlanAction(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const plan = String(formData.get("plan") ?? "free");

  if (!["free", "pro"].includes(plan)) {
    throw new Error("Некорректный тариф");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      plan,
      events_limit: plan === "pro" ? 50 : 3,
      storage_limit_mb: plan === "pro" ? 10000 : 500,
      storage_retention_days: plan === "pro" ? 180 : 14,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/users");
}

export async function updateEventActiveAction(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";

  const admin = createAdminClient();
  const { error } = await admin.from("events").update({ is_active: !isActive }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/events");
}

export async function moderateAnyUploadAction(formData: FormData) {
  await requireSuperAdmin();
  const parsed = moderationSchema.safeParse({
    uploadId: formData.get("uploadId"),
    eventId: formData.get("eventId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error("Некорректный статус");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("uploads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.uploadId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/uploads");
}

export async function createSupportTicketAction(formData: FormData) {
  const { user } = await ensureProfile();
  const parsed = supportTicketSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Проверьте обращение");
  }

  const admin = createAdminClient();
  const { data: ticket, error: ticketError } = await admin
    .from("support_tickets")
    .insert({
      user_id: user.id,
      email: user.email ?? "",
      subject: parsed.data.subject,
      status: "open",
    })
    .select("id")
    .single();

  if (ticketError) {
    throw new Error(ticketError.message);
  }

  const { error } = await admin.from("support_messages").insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    sender_role: "user",
    message: parsed.data.message,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/support");
}

export async function createSupportReplyAction(formData: FormData) {
  const { user } = await requireSuperAdmin();
  const parsed = supportReplySchema.safeParse({
    ticketId: formData.get("ticketId"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Введите ответ");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("support_messages").insert({
    ticket_id: parsed.data.ticketId,
    sender_id: user.id,
    sender_role: "super_admin",
    message: parsed.data.message,
  });

  if (error) {
    throw new Error(error.message);
  }

  await admin.from("support_tickets").update({ status: "in_progress" }).eq("id", parsed.data.ticketId);
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("user_id, subject")
    .eq("id", parsed.data.ticketId)
    .single();

  if (ticket?.user_id) {
    await admin.from("notifications").insert({
      user_id: ticket.user_id,
      title: "Ответ поддержки",
      body: `По обращению «${ticket.subject}» появился новый ответ.`,
    });
  }

  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${parsed.data.ticketId}`);
}

export async function updateTicketStatusAction(formData: FormData) {
  await requireSuperAdmin();
  const parsed = statusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });

  if (!parsed.success || !["open", "in_progress", "closed"].includes(parsed.data.status)) {
    throw new Error("Некорректный статус обращения");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("support_tickets").update({ status: parsed.data.status }).eq("id", parsed.data.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${parsed.data.id}`);
}
