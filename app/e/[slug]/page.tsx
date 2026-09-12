import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GuestUploadForm } from "@/components/guest-upload-form";
import { UploadStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { guestUploadsCookie, parseUploadIds } from "@/lib/guest";
import { joinMeta } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, plural } from "@/lib/utils";

const EVENT_FIELDS =
  "id, title, slug, custom_slug, brand_name, brand_color, cover_title, date, location, is_active, guest_intro, guest_instruction, max_file_size_mb";

/**
 * Значения по умолчанию из старой схемы: колонки not null, поэтому «не задано»
 * выглядит как этот текст. Показываем вместо него актуальную формулировку.
 */
const LEGACY_INTRO = "Поделитесь фото и пожеланием с мероприятия.";
const LEGACY_INSTRUCTION = "Загрузите фото и пожелание по ссылке мероприятия.";
const DEFAULT_INTRO = "Добавьте имя, пожелание и один снимок с события.";

function customText(value: string | null | undefined, legacy: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === legacy) return null;
  return trimmed;
}

async function loadEvent(rawSlug: string) {
  const slug = decodeURIComponent(rawSlug);
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select(EVENT_FIELDS)
    .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
    .eq("is_active", true)
    .single();

  return { event, supabase };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { event } = await loadEvent(slug);
  if (!event) return { title: "Событие не найдено" };

  const title = event.cover_title || event.brand_name || event.title;
  const description = customText(event.guest_intro, LEGACY_INTRO) ?? DEFAULT_INTRO;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function GuestEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const { event, supabase } = await loadEvent(rawSlug);

  if (!event) {
    notFound();
  }

  const publicSlug = event.custom_slug || event.slug;
  const meta = joinMeta(formatDate(event.date), event.location);
  const intro = customText(event.guest_intro, LEGACY_INTRO) ?? DEFAULT_INTRO;
  const instruction = customText(event.guest_instruction, LEGACY_INSTRUCTION);

  // Снимки этого гостя — по id из cookie, которую поставил браузер после отправки
  const cookieStore = await cookies();
  const ownIds = parseUploadIds(cookieStore.get(guestUploadsCookie(event.id))?.value);
  let ownUploads: Array<{ id: string; status: string; signedUrl: string | null }> = [];

  if (ownIds.length > 0) {
    const { data: rows } = await supabase
      .from("uploads")
      .select("id, status, file_path, created_at")
      .eq("event_id", event.id)
      .in("id", ownIds)
      .order("created_at", { ascending: false });

    ownUploads = await Promise.all(
      (rows ?? []).map(async (upload) => {
        const { data } = await supabase.storage.from("event-photos").createSignedUrl(upload.file_path, 60 * 20);
        return { id: upload.id, status: upload.status, signedUrl: data?.signedUrl ?? null };
      }),
    );
  }

  return (
    <main className="pb-safe min-h-screen-dvh px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-6">
          <div className="eyebrow">{event.brand_name || "Ailshan"}</div>
          <h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">{event.cover_title || event.title}</h1>
          {meta ? <p className="mt-2 text-sm text-muted-foreground">{meta}</p> : null}
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Поделитесь фото</CardTitle>
            <CardDescription>{intro}</CardDescription>
            {instruction ? (
              <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">{instruction}</p>
            ) : null}
          </CardHeader>
          <CardContent className="pb-0 sm:pb-0">
            <GuestUploadForm eventId={event.id} slug={publicSlug} maxFileSizeMb={event.max_file_size_mb ?? 10} />
          </CardContent>
        </Card>

        {ownUploads.length > 0 ? (
          <section className="mt-8">
            <div className="flex items-end justify-between gap-4 border-b pb-3">
              <div>
                <div className="eyebrow">Ваши снимки</div>
                <h2 className="mt-1 font-serif text-2xl font-medium">
                  {plural(ownUploads.length, "снимок", "снимка", "снимков")}
                </h2>
              </div>
            </div>
            <ul className="mt-4 grid grid-cols-3 gap-3">
              {ownUploads.map((upload) => (
                <li key={upload.id} className="space-y-2">
                  <div className="relative aspect-square overflow-hidden rounded-lg border bg-secondary">
                    {upload.signedUrl ? (
                      <Image
                        src={upload.signedUrl}
                        alt="Ваш снимок"
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 33vw, 170px"
                      />
                    ) : null}
                  </div>
                  <UploadStatusBadge status={upload.status} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8 rounded-xl border bg-card p-5 sm:p-6">
          <div className="eyebrow">Командная игра вечера</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Соберите команду или присоединитесь по коду. Ведущий объявит старт, и вопросы появятся у вас на телефоне.
          </p>
          <Button asChild className="mt-4 w-full" variant="outline">
            <Link href={`/e/${publicSlug}/play`}>Открыть игры</Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
