import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CalendarDays, CheckCircle2, Clock, Images, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveProfile } from "@/lib/authz";
import { proLabel } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function DashboardPage() {
  const { user, profile } = await requireActiveProfile();
  if (!profile.onboarding_completed) {
    redirect("/dashboard/onboarding");
  }
  const admin = createAdminClient();
  const [
    eventsResult,
    activeEventsResult,
    uploadsResult,
    pendingResult,
    notificationsResult,
  ] = await Promise.all([
    admin.from("events").select("*", { count: "exact", head: true }).eq("owner_id", user.id),
    admin.from("events").select("*", { count: "exact", head: true }).eq("owner_id", user.id).eq("is_active", true),
    admin
      .from("uploads")
      .select("events!inner(owner_id)", { count: "exact", head: true })
      .eq("events.owner_id", user.id),
    admin
      .from("uploads")
      .select("events!inner(owner_id)", { count: "exact", head: true })
      .eq("events.owner_id", user.id)
      .eq("status", "pending"),
    admin.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
  ]);

  const { data: latestEvents = [] } = await admin
    .from("events")
    .select("id, title, slug, is_active, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(4);
  const latestEventItems = latestEvents ?? [];

  const stats = [
    ["Мероприятия", eventsResult.count ?? 0, CalendarDays],
    ["Активные", activeEventsResult.count ?? 0, CheckCircle2],
    ["Фото", uploadsResult.count ?? 0, Images],
    ["На модерации", pendingResult.count ?? 0, Clock],
    ["Уведомления", notificationsResult.count ?? 0, Bell],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge className="mb-2">{proLabel(profile.plan)}</Badge>
          <h1 className="text-2xl font-semibold">
            {profile.full_name ? `Привет, ${profile.full_name}` : "Личный кабинет"}
          </h1>
          <p className="text-sm text-muted-foreground">Обзор ваших мероприятий, фото и уведомлений.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/events/new">
            <Plus className="h-4 w-4" />
            Создать мероприятие
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(([label, value, Icon]) => (
          <Card key={label}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">{label}</CardTitle>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Последние мероприятия</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/events">Все</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestEventItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Создайте первое мероприятие, чтобы начать сбор фото.</p>
          ) : (
            latestEventItems.map((event) => (
              <Link key={event.id} href={`/dashboard/events/${event.id}`} className="flex items-center justify-between rounded-md border bg-background p-3">
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">{event.slug}</p>
                </div>
                <Badge variant={event.is_active ? "default" : "secondary"}>
                  {event.is_active ? "active" : "paused"}
                </Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Лимиты аккаунта</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-md border bg-background p-3">
            <span className="block text-muted-foreground">Мероприятий</span>
            <strong>{profile.events_limit}</strong>
          </div>
          <div className="rounded-md border bg-background p-3">
            <span className="block text-muted-foreground">Storage</span>
            <strong>{profile.storage_limit_mb} МБ</strong>
          </div>
          <div className="rounded-md border bg-background p-3">
            <span className="block text-muted-foreground">Хранение</span>
            <strong>{profile.storage_retention_days} дней</strong>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
