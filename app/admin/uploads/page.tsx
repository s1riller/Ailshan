import Image from "next/image";
import { Check, X } from "lucide-react";

import { moderateAnyUploadAction } from "@/lib/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { plural } from "@/lib/utils";
import { UploadStatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const RECENT_LIMIT = 100;

function ModerationForms({
  uploadId,
  eventId,
  status,
  size,
}: {
  uploadId: string;
  eventId: string;
  status: string;
  size: "sm" | "default";
}) {
  return (
    <>
      <form action={moderateAnyUploadAction} className={size === "default" ? "w-full" : undefined}>
        <input type="hidden" name="uploadId" value={uploadId} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="status" value="approved" />
        <SubmitButton
          variant="secondary"
          size={size}
          className={size === "default" ? "w-full" : undefined}
          disabled={status === "approved"}
          pendingText="Сохраняем…"
        >
          <Check className="h-4 w-4" />
          Одобрить
        </SubmitButton>
      </form>
      <form action={moderateAnyUploadAction} className={size === "default" ? "w-full" : undefined}>
        <input type="hidden" name="uploadId" value={uploadId} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="status" value="rejected" />
        <SubmitButton
          variant="destructive"
          size={size}
          className={size === "default" ? "w-full" : undefined}
          disabled={status === "rejected"}
          pendingText="Сохраняем…"
        >
          <X className="h-4 w-4" />
          Отклонить
        </SubmitButton>
      </form>
    </>
  );
}

export default async function AdminUploadsPage() {
  const admin = createAdminClient();
  const { data: uploads = [] } = await admin
    .from("uploads")
    .select("id, event_id, guest_name, message, file_path, status, created_at")
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);
  const uploadItems = uploads ?? [];
  const eventIds = [...new Set(uploadItems.map((upload) => upload.event_id))];
  const { data: events = [] } = eventIds.length
    ? await admin.from("events").select("id, title, slug").in("id", eventIds)
    : { data: [] };
  const eventItems = events ?? [];
  const eventById = new Map(eventItems.map((event) => [event.id, event]));

  const signedUploads = await Promise.all(
    uploadItems.map(async (upload) => {
      const { data } = await admin.storage.from("event-photos").createSignedUrl(upload.file_path, 60 * 20);
      return { ...upload, signedUrl: data?.signedUrl ?? "" };
    }),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="eyebrow">Управление платформой</div>
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Фото</h1>
        <p className="text-sm text-muted-foreground">Последние {RECENT_LIMIT} снимков со всех событий.</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3 border-b pb-3">
          <div>
            <div className="eyebrow">Модерация</div>
            <h2 className="font-serif text-2xl font-medium">
              {plural(signedUploads.length, "снимок", "снимка", "снимков")}
            </h2>
          </div>
        </div>
        {signedUploads.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Снимков пока нет.</p>
        ) : (
          <>
            {/* Телефон: карточки — таблица с фото и кнопками не помещается в экран */}
            <div className="space-y-3 lg:hidden">
              {signedUploads.map((upload) => {
                const event = eventById.get(upload.event_id);
                return (
                  <article key={upload.id} className="overflow-hidden rounded-xl border bg-card">
                    <div className="flex gap-3 p-3">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-secondary">
                        {upload.signedUrl ? (
                          <Image src={upload.signedUrl} alt="" fill className="object-cover" sizes="80px" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-serif text-lg font-medium leading-tight">{upload.guest_name}</p>
                          <UploadStatusBadge status={upload.status} className="shrink-0" />
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{event?.title ?? "Событие удалено"}</p>
                        {upload.message ? (
                          <p className="mt-1 line-clamp-2 font-serif text-base italic text-muted-foreground">{upload.message}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t p-3">
                      <ModerationForms uploadId={upload.id} eventId={upload.event_id} status={upload.status} size="default" />
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Снимок</TableHead>
                    <TableHead>Событие</TableHead>
                    <TableHead>Гость</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Модерация</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signedUploads.map((upload) => {
                    const event = eventById.get(upload.event_id);
                    return (
                      <TableRow key={upload.id}>
                        <TableCell>
                          <div className="relative h-16 w-16 overflow-hidden rounded-md bg-secondary">
                            {upload.signedUrl ? (
                              <Image src={upload.signedUrl} alt="" fill className="object-cover" sizes="64px" />
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{event?.title ?? "Событие удалено"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{upload.guest_name}</div>
                          {upload.message ? (
                            <div className="max-w-xs font-serif text-base italic text-muted-foreground">{upload.message}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <UploadStatusBadge status={upload.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <ModerationForms uploadId={upload.id} eventId={upload.event_id} status={upload.status} size="sm" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
