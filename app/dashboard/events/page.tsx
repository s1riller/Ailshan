import Link from "next/link";
import { Plus } from "lucide-react";

import { EventStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { requireActiveProfile } from "@/lib/authz";
import { joinMeta } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function DashboardEventsPage() {
  const { user } = await requireActiveProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, slug, date, location, is_active, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[events] list failed", error);
  }
  const events = data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="eyebrow">Личный кабинет</div>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">События</h1>
          <p className="text-sm text-muted-foreground">Каждое событие получает свою ссылку и QR-код для гостей.</p>
        </div>
        <Button asChild className="sm:shrink-0">
          <Link href="/dashboard/events/new">
            <Plus className="h-4 w-4" />
            Новое событие
          </Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 sm:p-8">
          <h2 className="font-serif text-2xl font-medium">Событий пока нет</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Создайте первое событие: понадобится только название, а дату и место можно добавить позже.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/dashboard/events/new">Создать первое событие</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {events.map((event) => {
            const meta = joinMeta(formatDate(event.date), event.location);
            return (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className="flex h-full min-h-[96px] flex-col justify-between gap-4 rounded-xl border bg-card p-5 transition-colors hover:bg-secondary/40 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-serif text-xl font-medium leading-tight sm:text-2xl">{event.title}</h2>
                  <EventStatusBadge isActive={event.is_active} className="mt-1 shrink-0" />
                </div>
                <p className="text-sm text-muted-foreground">{meta || "Дата и место не заданы"}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
