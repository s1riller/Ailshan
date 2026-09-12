import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { EventStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { requireActiveProfile } from "@/lib/authz";
import { joinMeta, planLabel } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const { user, profile } = await requireActiveProfile();
  if (!profile.onboarding_completed) {
    redirect("/dashboard/onboarding");
  }
  const admin = createAdminClient();
  const [eventsResult, activeEventsResult, uploadsResult, pendingResult, latestResult] = await Promise.all([
    admin.from("events").select("*", { count: "exact", head: true }).eq("owner_id", user.id),
    admin.from("events").select("*", { count: "exact", head: true }).eq("owner_id", user.id).eq("is_active", true),
    admin
      .from("uploads")
      .select("events!uploads_event_id_fkey!inner(owner_id)", { count: "exact", head: true })
      .eq("events.owner_id", user.id),
    admin
      .from("uploads")
      .select("events!uploads_event_id_fkey!inner(owner_id)", { count: "exact", head: true })
      .eq("events.owner_id", user.id)
      .eq("status", "pending"),
    admin
      .from("events")
      .select("id, title, date, location, is_active, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const latestEvents = latestResult.data ?? [];

  // Четыре плитки: уведомления живут в колокольчике шапки, чтобы сетка 2×2 не оставляла пустую ячейку
  const stats: Array<[label: string, value: number]> = [
    ["Событий", eventsResult.count ?? 0],
    ["Принимают фото", activeEventsResult.count ?? 0],
    ["Снимков", uploadsResult.count ?? 0],
    ["На модерации", pendingResult.count ?? 0],
  ];

  const limits: Array<[label: string, value: string]> = [
    ["Событий", String(profile.events_limit ?? "—")],
    ["Объём хранилища", profile.storage_limit_mb ? `${profile.storage_limit_mb} МБ` : "—"],
    ["Срок хранения", profile.storage_retention_days ? `${profile.storage_retention_days} дней` : "—"],
  ];

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="eyebrow">Личный кабинет · тариф {planLabel(profile.plan)}</div>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">
            {profile.full_name ? `Здравствуйте, ${profile.full_name}` : "Ваши события"}
          </h1>
          <p className="text-sm text-muted-foreground">Сводка по событиям, фотографиям и уведомлениям.</p>
        </div>
        <Button asChild className="sm:shrink-0">
          <Link href="/dashboard/events/new">
            <Plus className="h-4 w-4" />
            Создать событие
          </Link>
        </Button>
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
            href="/dashboard/events"
            className="text-sm underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            Все
          </Link>
        </div>
        {latestEvents.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Создайте первое событие: гости получат ссылку и QR-код для загрузки фото.
          </p>
        ) : (
          <ul className="divide-y">
            {latestEvents.map((event) => {
              const meta = joinMeta(formatDate(event.date), event.location);
              return (
                <li key={event.id}>
                  <Link
                    href={`/dashboard/events/${event.id}`}
                    className="-mx-2 flex min-h-[60px] items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-secondary/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{event.title}</p>
                      <p className="truncate text-sm text-muted-foreground">{meta || "Дата не задана"}</p>
                    </div>
                    <EventStatusBadge isActive={event.is_active} className="shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-1">
        <div className="flex items-end justify-between gap-3 border-b pb-3">
          <div>
            <div className="eyebrow">Тариф {planLabel(profile.plan)}</div>
            <h2 className="font-serif text-2xl font-medium">Лимиты</h2>
          </div>
          <Link
            href="/dashboard/upgrade"
            className="text-sm underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            Тарифы
          </Link>
        </div>
        <dl className="divide-y">
          {limits.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="tabular text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
