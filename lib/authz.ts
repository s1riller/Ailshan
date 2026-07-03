import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function ensureProfile() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();
  const email = user.email ?? "";
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, role, plan, is_blocked, full_name, phone, company_name, city, avatar_path, locale, timezone, ui_theme, email_notifications, onboarding_completed, events_limit, storage_limit_mb, storage_retention_days, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      `Не удалось загрузить профиль пользователя: ${profileError.message}. Выполните supabase/super-admin.sql и supabase/personal-account.sql в Supabase SQL Editor.`,
    );
  }

  if (profile) {
    if (profile.email !== email) {
      await admin.from("profiles").update({ email }).eq("id", user.id);
    }
    return { user, profile };
  }

  const { data, error } = await admin
    .from("profiles")
    .insert({ id: user.id, email, role: "user" })
    .select("id, email, role, plan, is_blocked, full_name, phone, company_name, city, avatar_path, locale, timezone, ui_theme, email_notifications, onboarding_completed, events_limit, storage_limit_mb, storage_retention_days, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { user, profile: data };
}

export async function requireActiveProfile() {
  const result = await ensureProfile();

  if (result.profile.is_blocked) {
    redirect("/login?blocked=1");
  }

  return result;
}

export async function requireSuperAdmin() {
  const { user, profile } = await ensureProfile();

  if (profile.role !== "super_admin") {
    redirect("/dashboard");
  }

  return { user, profile };
}
