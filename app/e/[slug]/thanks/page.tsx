import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { UploadStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { guestUploadsCookie, parseUploadIds } from "@/lib/guest";
import { createAdminClient } from "@/lib/supabase/admin";

/** Старое значение по умолчанию в базе — считаем, что текст организатор не задавал */
const LEGACY_THANKS = "Спасибо, ваше фото появится после модерации.";
const DEFAULT_THANKS = "Снимок передан организаторам. Лучшие фотографии появятся на экране в зале.";

const STATUS_HINT: Record<string, string> = {
  pending: "Организаторы посмотрят снимок и решат, показывать ли его на экране.",
  approved: "Снимок одобрен и может появиться на экране в зале.",
  rejected: "Организаторы решили не показывать этот снимок на экране.",
};

async function loadEvent(rawSlug: string) {
  const slug = decodeURIComponent(rawSlug);
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, custom_slug, brand_name, cover_title, thanks_text")
    .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
    .single();

  return { event, supabase };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { event } = await loadEvent(slug);
  if (!event) return { title: "Событие не найдено" };
  return { title: event.cover_title || event.brand_name || event.title, robots: { index: false } };
}

export default async function ThanksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const { event, supabase } = await loadEvent(rawSlug);

  if (!event) {
    notFound();
  }

  const publicSlug = event.custom_slug || event.slug;
  const thanksText = event.thanks_text?.trim() && event.thanks_text.trim() !== LEGACY_THANKS ? event.thanks_text.trim() : DEFAULT_THANKS;

  // Последний отправленный снимок — id лежит в cookie, которую поставила форма
  const cookieStore = await cookies();
  const lastId = parseUploadIds(cookieStore.get(guestUploadsCookie(event.id))?.value).at(-1);
  let lastUpload: { status: string; signedUrl: string | null } | null = null;

  if (lastId) {
    const { data: upload } = await supabase
      .from("uploads")
      .select("id, status, file_path")
      .eq("event_id", event.id)
      .eq("id", lastId)
      .maybeSingle();

    if (upload) {
      const { data } = await supabase.storage.from("event-photos").createSignedUrl(upload.file_path, 60 * 20);
      lastUpload = { status: upload.status, signedUrl: data?.signedUrl ?? null };
    }
  }

  return (
    <main className="pb-safe min-h-screen-dvh px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="eyebrow">{event.cover_title || event.brand_name || event.title}</div>
        <h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">Спасибо</h1>
        <p className="mt-3 text-base text-muted-foreground">{thanksText}</p>

        {lastUpload ? (
          <div className="mt-6 flex items-center gap-4 rounded-xl border bg-card p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
              {lastUpload.signedUrl ? (
                <Image src={lastUpload.signedUrl} alt="Ваш снимок" fill className="object-cover" sizes="80px" />
              ) : null}
            </div>
            <div className="min-w-0 space-y-2">
              <UploadStatusBadge status={lastUpload.status} />
              <p className="text-sm text-muted-foreground">{STATUS_HINT[lastUpload.status] ?? ""}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col items-center gap-4">
          <Button asChild variant="outline" className="w-full">
            <Link href={`/e/${publicSlug}`}>Добавить ещё снимок</Link>
          </Button>
          <Button asChild variant="link">
            <Link href={`/e/${publicSlug}/gallery`}>Смотреть галерею вечера</Link>
          </Button>
          <Button asChild variant="link">
            <Link href={`/e/${publicSlug}/play`}>Открыть игры вечера</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
