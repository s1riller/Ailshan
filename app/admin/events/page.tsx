import Link from "next/link";

import { updateEventActiveAction } from "@/lib/actions/admin";
import { joinMeta } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { EventStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminEventsPage() {
  const admin = createAdminClient();
  const { data: events = [] } = await admin
    .from("events")
    .select("id, owner_id, title, slug, date, location, is_active, created_at")
    .order("created_at", { ascending: false });
  const eventItems = events ?? [];
  const ownerIds = [...new Set(eventItems.map((event) => event.owner_id))];
  const { data: profiles = [] } = ownerIds.length
    ? await admin.from("profiles").select("id, email").in("id", ownerIds)
    : { data: [] };
  const profileItems = profiles ?? [];
  const profileById = new Map(profileItems.map((profile) => [profile.id, profile.email]));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="eyebrow">Управление платформой</div>
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">События</h1>
        <p className="text-sm text-muted-foreground">Все события на платформе и их приём фото.</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 border-b pb-3">
          <div>
            <div className="eyebrow">Всего: {eventItems.length}</div>
            <h2 className="font-serif text-2xl font-medium">Все события</h2>
          </div>
        </div>
        {eventItems.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Событий пока нет.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Событие</TableHead>
                <TableHead>Организатор</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventItems.map((event) => {
                const meta = joinMeta(formatDate(event.date), event.location);
                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground">{meta || "Дата не задана"}</div>
                    </TableCell>
                    <TableCell className="text-sm">{profileById.get(event.owner_id) ?? "Не найден"}</TableCell>
                    <TableCell>
                      <EventStatusBadge isActive={event.is_active} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/live/${event.slug}`} target="_blank" rel="noopener">
                            Экран зала
                          </Link>
                        </Button>
                        <form action={updateEventActiveAction}>
                          <input type="hidden" name="id" value={event.id} />
                          <input type="hidden" name="isActive" value={String(event.is_active)} />
                          <SubmitButton size="sm" variant="outline" pendingText="Сохраняем…">
                            {event.is_active ? "Приостановить" : "Возобновить"}
                          </SubmitButton>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
