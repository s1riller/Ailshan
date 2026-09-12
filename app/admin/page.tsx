import Link from "next/link";

import { EventStatusBadge } from "@/components/status-badge";
import { joinMeta } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

export default async function AdminPage() {
  const admin = createAdminClient();
  const [
    usersResult,
    eventsResult,
    activeEventsResult,
    uploadsResult,
    pendingUploadsResult,
    approvedUploadsResult,
    applicationsResult,
    openTicketsResult,
    latestResult,
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("events").select("*", { count: "exact", head: true }),
    admin.from("events").select("*", { count: "exact", head: true }).eq("is_active", true),
    admin.from("uploads").select("*", { count: "exact", head: true }),
    admin.from("uploads").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("uploads").select("*", { count: "exact", head: true }).eq("status", "approved"),
    admin.from("applications").select("*", { count: "exact", head: true }).eq("status", "new"),
    admin.from("support_tickets").select("*", { count: "exact", head: true }).neq("status", "closed"),
    admin
      .from("events")
      .select("id, title, date, location, created_at, is_active")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const latestEvents = latestResult.data ?? [];

  const stats: Array<[label: string, value: number]> = [
    ["Организаторов", usersResult.count ?? 0],
    ["Событий", eventsResult.count ?? 0],
    ["Принимают фото", activeEventsResult.count ?? 0],
    ["Снимков", uploadsResult.count ?? 0],
    ["На модерации", pendingUploadsResult.count ?? 0],
    ["Одобрено", approvedUploadsResult.count ?? 0],
    ["Новых заявок", applicationsResult.count ?? 0],
    ["Открытых обращений", openTicketsResult.count ?? 0],
  ];

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-2">
        <div className="eyebrow">Управление платформой</div>
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Обзор</h1>
        <p className="text-sm text-muted-foreground">Организаторы, события, снимки и обращения по всей платформе.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4 sm:p-5">
            <div className="eyebrow">{label}</div>
            <div className="font-serif tabular mt-2 text-3xl font-medium sm:text-4xl">{value}</div>
          </div>
        ))}
      </div>

      <section className="space-y-1">
        <div className="flex items-end justify-between gap-3 border-b pb-3">
          <div>
            <div className="eyebrow">Список</div>
            <h2 className="font-serif text-2xl font-medium">Последние события</h2>
          </div>
          <Link
            href="/admin/events"
            className="text-sm underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            Все
          </Link>
        </div>
        {latestEvents.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Событий на платформе пока нет.</p>
        ) : (
          <ul className="divide-y">
            {latestEvents.map((event) => {
              const created = formatDate(event.created_at);
              const meta = joinMeta(
                joinMeta(formatDate(event.date), event.location) || "Дата не задана",
                created && `создано ${created}`,
              );
              return (
                <li key={event.id} className="flex min-h-[60px] items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{event.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{meta}</p>
                  </div>
                  <EventStatusBadge isActive={event.is_active} className="shrink-0" />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
