import Link from "next/link";
import { CalendarDays, MapPin, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveProfile } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function DashboardEventsPage() {
  const { user } = await requireActiveProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, title, slug, date, location, is_active, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const events = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Мои мероприятия</h1>
          <p className="text-sm text-muted-foreground">Создайте событие и получите ссылку для гостей.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/events/new">
            <Plus className="h-4 w-4" />
            Новое событие
          </Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Пока нет мероприятий</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/events/new">Создать первое</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <Link key={event.id} href={`/dashboard/events/${event.id}`}>
              <Card className="h-full transition-colors hover:bg-secondary/50">
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                  <CardTitle className="leading-snug">{event.title}</CardTitle>
                  <Badge variant={event.is_active ? "default" : "secondary"}>
                    {event.is_active ? "active" : "paused"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(event.date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {event.location || "Локация не указана"}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
