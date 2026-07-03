import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, Images, Inbox, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const admin = createAdminClient();
  const [usersResult, eventsResult, activeEventsResult, uploadsResult, pendingUploadsResult, approvedUploadsResult, applicationsResult, openTicketsResult] =
    await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("events").select("*", { count: "exact", head: true }),
      admin.from("events").select("*", { count: "exact", head: true }).eq("is_active", true),
      admin.from("uploads").select("*", { count: "exact", head: true }),
      admin.from("uploads").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("uploads").select("*", { count: "exact", head: true }).eq("status", "approved"),
      admin.from("applications").select("*", { count: "exact", head: true }).eq("status", "new"),
      admin.from("support_tickets").select("*", { count: "exact", head: true }).neq("status", "closed"),
    ]);
  const users = usersResult.count ?? 0;
  const events = eventsResult.count ?? 0;
  const activeEvents = activeEventsResult.count ?? 0;
  const uploads = uploadsResult.count ?? 0;
  const pendingUploads = pendingUploadsResult.count ?? 0;
  const approvedUploads = approvedUploadsResult.count ?? 0;
  const applications = applicationsResult.count ?? 0;
  const openTickets = openTicketsResult.count ?? 0;

  const { data: latestEvents = [] } = await admin
    .from("events")
    .select("id, title, slug, created_at, is_active")
    .order("created_at", { ascending: false })
    .limit(5);
  const latestEventItems = latestEvents ?? [];

  const stats = [
    ["Пользователи", users, Users],
    ["Мероприятия", events, CalendarDays],
    ["Активные", activeEvents, CheckCircle2],
    ["Фото", uploads, Images],
    ["Pending", pendingUploads, Clock],
    ["Approved", approvedUploads, CheckCircle2],
    ["Новые заявки", applications, Inbox],
    ["Открытая поддержка", openTickets, Inbox],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Статистика платформы</h1>
        <p className="text-sm text-muted-foreground">Обзор Ailshan как SaaS-продукта.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <Link href="/admin/events">Все мероприятия</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestEventItems.map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded-md border bg-background p-3">
              <div>
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-muted-foreground">{event.slug}</p>
              </div>
              <Badge variant={event.is_active ? "default" : "secondary"}>
                {event.is_active ? "active" : "paused"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
