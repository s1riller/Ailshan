import Link from "next/link";
import { Power } from "lucide-react";

import { updateEventActiveAction } from "@/lib/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminEventsPage() {
  const admin = createAdminClient();
  const { data: events = [] } = await admin
    .from("events")
    .select("id, owner_id, title, slug, is_active, created_at")
    .order("created_at", { ascending: false });
  const eventItems = events ?? [];
  const ownerIds = [...new Set(eventItems.map((event) => event.owner_id))];
  const { data: profiles = [] } = ownerIds.length
    ? await admin.from("profiles").select("id, email").in("id", ownerIds)
    : { data: [] };
  const profileItems = profiles ?? [];
  const profileById = new Map(profileItems.map((profile) => [profile.id, profile.email]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Мероприятия</h1>
        <p className="text-sm text-muted-foreground">Все события на платформе.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Все мероприятия</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Владелец</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventItems.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground">{event.slug}</div>
                  </TableCell>
                  <TableCell>{profileById.get(event.owner_id) ?? "Неизвестно"}</TableCell>
                  <TableCell>
                    <Badge variant={event.is_active ? "default" : "secondary"}>
                      {event.is_active ? "active" : "paused"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/live/${event.slug}`} target="_blank">Live</Link>
                      </Button>
                      <form action={updateEventActiveAction}>
                        <input type="hidden" name="id" value={event.id} />
                        <input type="hidden" name="isActive" value={String(event.is_active)} />
                        <Button type="submit" size="sm" variant="outline">
                          <Power className="h-4 w-4" />
                          {event.is_active ? "Остановить" : "Включить"}
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
