import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera } from "lucide-react";

import { LiveAutoRefresh } from "@/components/live-auto-refresh";
import { PhotoLightbox, PhotoLightboxTrigger, type LightboxPhoto } from "@/components/photo-lightbox";
import { Button } from "@/components/ui/button";
import { joinMeta } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, plural } from "@/lib/utils";

export const dynamic = "force-dynamic";

const GALLERY_LIMIT = 240;

async function loadEvent(rawSlug: string) {
  const slug = decodeURIComponent(rawSlug);
  const admin = createAdminClient();
  const { data: event, error } = await admin
    .from("events")
    .select("id, title, slug, custom_slug, brand_name, cover_title, date, location, is_active")
    .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
    .eq("is_active", true)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[gallery]", error);
    throw new Error("Галерея временно недоступна. Попробуйте обновить страницу через минуту.");
  }

  return { event, admin };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { event } = await loadEvent(slug);
  if (!event) return { title: "Событие не найдено" };

  const name = event.cover_title || event.brand_name || event.title;
  return {
    title: `Галерея — ${name}`,
    description: "Снимки гостей события. Обновляется по мере того, как гости присылают фотографии.",
  };
}

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const { event, admin } = await loadEvent(rawSlug);
  if (!event) notFound();

  const publicSlug = event.custom_slug || event.slug;
  const meta = joinMeta(formatDate(event.date), event.location);

  const [{ data: rows }, { count }] = await Promise.all([
    admin
      .from("uploads")
      .select("id, guest_name, message, created_at")
      .eq("event_id", event.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(GALLERY_LIMIT),
    admin.from("uploads").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "approved"),
  ]);

  // Постоянные адреса /api/photo/<id> — кэшируются браузером и оптимизатором,
  // поэтому автообновление не перекачивает уже показанные снимки
  const photos: LightboxPhoto[] = (rows ?? []).map((upload) => ({
    id: upload.id,
    url: `/api/photo/${upload.id}`,
    guestName: upload.guest_name,
    message: upload.message,
  }));
  const total = count ?? photos.length;

  return (
    <main className="min-h-screen-dvh px-4 pb-28 pt-6 sm:pt-10">
      <LiveAutoRefresh intervalMs={30000} />
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow">Галерея вечера</div>
            <h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">{event.cover_title || event.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {joinMeta(meta, total > 0 ? plural(total, "снимок", "снимка", "снимков") : null) || "Снимки гостей появятся здесь"}
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/e/${publicSlug}`}>
              <Camera className="h-4 w-4" />
              Добавить свой снимок
            </Link>
          </Button>
        </header>

        {photos.length === 0 ? (
          <section className="rounded-xl border border-dashed px-6 py-16 text-center">
            <p className="font-serif text-2xl font-medium">Первые снимки появятся здесь</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Как только гости пришлют фотографии и организатор их одобрит, галерея заполнится сама — страницу можно не обновлять.
            </p>
            <Button asChild className="mt-6">
              <Link href={`/e/${publicSlug}`}>Сделать первый снимок</Link>
            </Button>
          </section>
        ) : (
          <PhotoLightbox photos={photos}>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
              {photos.map((photo, index) => (
                <li key={photo.id}>
                  <PhotoLightboxTrigger
                    index={index}
                    label={photo.guestName ? `Открыть снимок: ${photo.guestName}` : "Открыть снимок"}
                    className="group overflow-hidden rounded-lg border bg-secondary"
                  >
                    <div className="relative aspect-square">
                      <Image
                        src={photo.url}
                        alt={photo.message || photo.guestName || "Снимок гостя"}
                        fill
                        loading={index < 8 ? "eager" : "lazy"}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    {photo.guestName ? (
                      <div className="truncate px-2.5 py-2 text-xs text-muted-foreground">{photo.guestName}</div>
                    ) : null}
                  </PhotoLightboxTrigger>
                </li>
              ))}
            </ul>
            {total > photos.length ? (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Показаны последние {photos.length} из {total}. Остальные — на экране зала и в архиве организатора.
              </p>
            ) : null}
          </PhotoLightbox>
        )}
      </div>
    </main>
  );
}
