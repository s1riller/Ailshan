import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown, Download } from "lucide-react";

import { requireActiveProfile } from "@/lib/authz";
import { isPro } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EventExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile } = await requireActiveProfile();
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, title, owner_id, archive_enabled")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!event) notFound();

  const pro = isPro(profile.plan);
  const { data: uploads = [] } = await admin
    .from("uploads")
    .select("id, guest_name, message, file_path, status, created_at")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });
  const uploadItems = uploads ?? [];
  const csvPreview = [
    "guest_name,message,status,file_path",
    ...uploadItems.slice(0, 20).map((upload) =>
      [upload.guest_name, upload.message ?? "", upload.status, upload.file_path]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");

  return (
    <div className="space-y-6">
      <div>
        <Badge variant={pro ? "default" : "secondary"}>{pro ? "Pro" : "Pro locked"}</Badge>
        <h1 className="mt-3 text-2xl font-semibold">Экспорт: {event.title}</h1>
        <p className="text-sm text-muted-foreground">Архив фото и CSV с пожеланиями после мероприятия.</p>
      </div>

      {!pro || !event.archive_enabled ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Экспорт доступен в Pro
            </CardTitle>
            <CardDescription>Включите Pro и опцию “Экспорт архива” в настройках мероприятия.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/upgrade">Посмотреть Pro</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Готово к экспорту</CardTitle>
            <CardDescription>{uploadItems.length} файлов в мероприятии. ZIP-генератор подключается следующим шагом.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button disabled>
              <Download className="h-4 w-4" />
              Скачать ZIP скоро
            </Button>
            <pre className="max-h-80 overflow-auto rounded-md border bg-background p-3 text-xs">{csvPreview}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
