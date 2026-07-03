import Image from "next/image";
import Link from "next/link";

import { requireActiveProfile } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statuses = ["all", "pending", "approved", "rejected"] as const;

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { user } = await requireActiveProfile();
  const { status = "all" } = await searchParams;
  const activeStatus = statuses.includes(status as (typeof statuses)[number]) ? status : "all";
  const admin = createAdminClient();

  const { data: events = [] } = await admin
    .from("events")
    .select("id, title, slug")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const eventItems = events ?? [];
  const eventIds = eventItems.map((event) => event.id);
  const eventById = new Map(eventItems.map((event) => [event.id, event]));

  let uploadQuery = admin
    .from("uploads")
    .select("id, event_id, guest_name, message, file_path, status, created_at")
    .order("created_at", { ascending: false });

  if (eventIds.length > 0) {
    uploadQuery = uploadQuery.in("event_id", eventIds);
  }
  if (activeStatus !== "all") {
    uploadQuery = uploadQuery.eq("status", activeStatus);
  }

  const { data: uploads = [] } = eventIds.length > 0 ? await uploadQuery : { data: [] };
  const uploadItems = uploads ?? [];
  const signedUploads = await Promise.all(
    uploadItems.map(async (upload) => {
      const { data } = await admin.storage.from("event-photos").createSignedUrl(upload.file_path, 60 * 20);
      return { ...upload, signedUrl: data?.signedUrl ?? "" };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Медиа-библиотека</h1>
          <p className="text-sm text-muted-foreground">Все фото со всех ваших мероприятий.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {statuses.map((item) => (
            <Button key={item} asChild size="sm" variant={activeStatus === item ? "default" : "outline"}>
              <Link href={item === "all" ? "/dashboard/media" : `/dashboard/media?status=${item}`}>{item}</Link>
            </Button>
          ))}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{signedUploads.length} фото</CardTitle>
        </CardHeader>
        <CardContent>
          {signedUploads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Фото пока нет.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {signedUploads.map((upload) => {
                const event = eventById.get(upload.event_id);
                return (
                  <article key={upload.id} className="overflow-hidden rounded-lg border bg-card">
                    <div className="relative aspect-square bg-muted">
                      {upload.signedUrl ? <Image src={upload.signedUrl} alt="" fill className="object-cover" sizes="33vw" /> : null}
                    </div>
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{upload.guest_name}</p>
                        <Badge variant={upload.status === "rejected" ? "destructive" : "secondary"}>{upload.status}</Badge>
                      </div>
                      {upload.message ? <p className="line-clamp-2 text-sm text-muted-foreground">{upload.message}</p> : null}
                      {event ? (
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <Link href={`/dashboard/events/${event.id}`}>{event.title}</Link>
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
