import Image from "next/image";
import { Check, X } from "lucide-react";

import { moderateAnyUploadAction } from "@/lib/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminUploadsPage() {
  const admin = createAdminClient();
  const { data: uploads = [] } = await admin
    .from("uploads")
    .select("id, event_id, guest_name, message, file_path, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Загрузки</h1>
        <p className="text-sm text-muted-foreground">Глобальная модерация последних 100 фото.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Все фото</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Фото</TableHead>
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
                      <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-muted">
                        {upload.signedUrl ? <Image src={upload.signedUrl} alt="" fill className="object-cover" sizes="64px" /> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{event?.title}</div>
                      <div className="text-sm text-muted-foreground">{event?.slug}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{upload.guest_name}</div>
                      <div className="max-w-xs text-sm text-muted-foreground">{upload.message}</div>
                    </TableCell>
                    <TableCell><Badge variant={upload.status === "rejected" ? "destructive" : "secondary"}>{upload.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <form action={moderateAnyUploadAction}>
                          <input type="hidden" name="uploadId" value={upload.id} />
                          <input type="hidden" name="eventId" value={upload.event_id} />
                          <input type="hidden" name="status" value="approved" />
                          <Button size="sm" type="submit" disabled={upload.status === "approved"}>
                            <Check className="h-4 w-4" />
                            Одобрить
                          </Button>
                        </form>
                        <form action={moderateAnyUploadAction}>
                          <input type="hidden" name="uploadId" value={upload.id} />
                          <input type="hidden" name="eventId" value={upload.event_id} />
                          <input type="hidden" name="status" value="rejected" />
                          <Button size="sm" type="submit" variant="outline" disabled={upload.status === "rejected"}>
                            <X className="h-4 w-4" />
                            Отклонить
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
