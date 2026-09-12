import Image from "next/image";
import Link from "next/link";

import { UploadStatusBadge } from "@/components/status-badge";
import { requireActiveProfile } from "@/lib/authz";
import { UPLOAD_FILTERS, type UploadStatus } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn, plural } from "@/lib/utils";

const FILTER_VALUES = UPLOAD_FILTERS.map(([value]) => value);

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { user } = await requireActiveProfile();
  const { status = "" } = await searchParams;
  const activeStatus: "" | UploadStatus = FILTER_VALUES.includes(status as "" | UploadStatus)
    ? (status as "" | UploadStatus)
    : "";
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
  if (activeStatus) {
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
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="eyebrow">Личный кабинет</div>
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Медиа</h1>
        <p className="text-sm text-muted-foreground">Все снимки со всех ваших событий в одном месте.</p>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {UPLOAD_FILTERS.map(([value, label]) => {
          const active = activeStatus === value;
          return (
            <Link
              key={value || "all"}
              href={value ? `/dashboard/media?status=${value}` : "/dashboard/media"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                active
                  ? "border-accent/30 bg-accent-soft text-accent"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3 border-b pb-3">
          <div>
            <div className="eyebrow">Галерея</div>
            <h2 className="font-serif text-2xl font-medium">{plural(signedUploads.length, "снимок", "снимка", "снимков")}</h2>
          </div>
        </div>
        {signedUploads.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {activeStatus ? "В этом разделе пока пусто." : "Снимков пока нет: гости увидят форму загрузки по ссылке события."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {signedUploads.map((upload) => {
              const event = eventById.get(upload.event_id);
              return (
                <article key={upload.id} className="overflow-hidden rounded-xl border bg-card">
                  <div className="relative aspect-square bg-secondary">
                    {upload.signedUrl ? (
                      <Image src={upload.signedUrl} alt="" fill className="object-cover" sizes="(min-width: 1024px) 33vw, 50vw" />
                    ) : null}
                  </div>
                  <div className="space-y-2 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-serif text-lg font-medium leading-tight">{upload.guest_name}</p>
                      <UploadStatusBadge status={upload.status} className="shrink-0" />
                    </div>
                    {upload.message ? (
                      <p className="line-clamp-2 font-serif text-base italic text-muted-foreground">{upload.message}</p>
                    ) : null}
                    {event ? (
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="block truncate text-sm underline decoration-border underline-offset-4 hover:decoration-foreground"
                      >
                        {event.title}
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
