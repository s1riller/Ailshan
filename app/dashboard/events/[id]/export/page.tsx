import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireActiveProfile } from "@/lib/authz";
import { planLabel, uploadStatusLabel } from "@/lib/labels";
import { isPro } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { plural } from "@/lib/utils";

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
  const approvedCount = uploadItems.filter((upload) => upload.status === "approved").length;
  const withMessage = uploadItems.filter((upload) => upload.message).slice(0, 20);
  const available = pro && Boolean(event.archive_enabled);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/events/${event.id}?tab=export`}
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          К событию
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="eyebrow">тариф {planLabel(profile.plan)}</span>
          {available ? (
            <Badge dot variant="success">
              Архив включён
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">Экспорт</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {event.title} · архив фотографий и файл с пожеланиями после события.
        </p>
      </div>

      {!available ? (
        <Card className="max-w-2xl">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div>
              <div className="eyebrow">После события</div>
              <h2 className="mt-1 font-serif text-2xl font-medium">Архив пока недоступен</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Архив доступен на тарифе Премиум при включённой опции «Архив после события».
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {!pro ? (
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/dashboard/upgrade">Сравнить тарифы</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={`/dashboard/events/${event.id}?tab=settings`}>
                  {pro ? "Включить в настройках" : "Настройки события"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="space-y-4">
            <div className="border-b pb-3">
              <div className="eyebrow">Готово к выгрузке</div>
              <h2 className="mt-1 font-serif text-2xl font-medium">
                {plural(uploadItems.length, "фотография готова", "фотографии готовы", "фотографий готовы")} к выгрузке.
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Из них {plural(approvedCount, "одобрена", "одобрены", "одобрено")} организатором.
              </p>
            </div>
            <div className="space-y-2">
              <Button variant="outline" disabled className="w-full sm:w-auto">
                <Download className="h-4 w-4" />
                Скачать архив
              </Button>
              <p className="text-xs text-muted-foreground">Выгрузка архива появится в ближайшем обновлении.</p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="border-b pb-3">
              <div className="eyebrow">Пожелания</div>
              <h2 className="mt-1 font-serif text-2xl font-medium">Что войдёт в файл</h2>
            </div>
            {withMessage.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пожеланий пока нет.</p>
            ) : (
              <ul className="divide-y">
                {withMessage.map((upload) => (
                  <li key={upload.id} className="space-y-1 py-3">
                    <p className="font-serif text-base leading-snug">{upload.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {upload.guest_name} · {uploadStatusLabel(upload.status)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
