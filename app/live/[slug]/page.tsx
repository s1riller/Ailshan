import Image from "next/image";
import { notFound } from "next/navigation";
import { Heart } from "lucide-react";

import { EventQrCode } from "@/components/event-qr-code";
import { LiveAutoRefresh } from "@/components/live-auto-refresh";
import { getSiteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 5;

type LivePhoto = {
  id: string;
  guest_name: string;
  message: string | null;
  signedUrl: string;
};

type LiveLayout = "masonry" | "featured" | "slideshow" | "compact";
type LiveTransition = "fade" | "slide" | "zoom" | "stories";
type LiveQrEffect = "fade" | "slide" | "pulse" | "stories";

const allowedLayouts: LiveLayout[] = [
  "masonry",
  "featured",
  "slideshow",
  "compact",
];

const allowedTransitions: LiveTransition[] = [
  "fade",
  "slide",
  "zoom",
  "stories",
];

const allowedQrEffects: LiveQrEffect[] = ["fade", "slide", "pulse", "stories"];

function getSafeLayout(value: string | null | undefined): LiveLayout {
  if (allowedLayouts.includes(value as LiveLayout)) {
    return value as LiveLayout;
  }

  return "masonry";
}

function getSafeTransition(value: string | null | undefined): LiveTransition {
  if (allowedTransitions.includes(value as LiveTransition)) {
    return value as LiveTransition;
  }

  return "fade";
}

function getSafeQrEffect(value: string | null | undefined): LiveQrEffect {
  if (allowedQrEffects.includes(value as LiveQrEffect)) {
    return value as LiveQrEffect;
  }

  return "fade";
}

function getSafeDuration(value: number | null | undefined, fallback = 5) {
  if (!value || Number.isNaN(value)) return fallback;

  return Math.min(Math.max(value, 3), 20);
}

function getSafeQrInterval(value: number | null | undefined, fallback = 30) {
  if (!value || Number.isNaN(value)) return fallback;

  return Math.min(Math.max(value, 10), 120);
}

function getMasonryVisibilityClass(index: number) {
  if (index >= 18) return "hidden";
  if (index >= 12) return "hidden lg:block";
  if (index >= 9) return "hidden sm:block";

  return "";
}

function getCompactVisibilityClass(index: number) {
  if (index >= 32) return "hidden";
  if (index >= 20) return "hidden lg:block";

  return "";
}

function getMasonrySpanClass(index: number) {
  if (index === 0) return "col-span-2 row-span-2";
  if (index === 5) return "col-span-2";
  if (index === 9) return "row-span-2";
  if (index === 12) return "col-span-2";
  if (index === 15) return "row-span-2";

  return "";
}

function PhotoCaption({
  photo,
  showMessages,
  showNames,
}: {
  photo: LivePhoto;
  showMessages: boolean;
  showNames: boolean;
}) {
  if (!showNames && !showMessages) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3 text-white sm:p-4">
      {showNames ? (
        <p className="truncate text-sm font-semibold sm:text-base">
          {photo.guest_name}
        </p>
      ) : null}

      {showMessages && photo.message ? (
        <p className="mt-0.5 line-clamp-1 text-xs text-white/70 sm:text-sm">
          {photo.message}
        </p>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <section className="flex h-screen items-center justify-center px-5 pb-24 text-center text-white">
      <div className="max-w-3xl rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-black">
          <Heart className="h-8 w-8" />
        </div>

        <h2 className="mt-5 text-3xl font-semibold">
          Фото появятся после модерации
        </h2>

        <p className="mt-3 text-white/70">
          Как только организатор одобрит снимки, live-галерея сама обновится.
        </p>
      </div>
    </section>
  );
}

function MasonryGallery({
  photos,
  showMessages,
  showNames,
}: {
  photos: LivePhoto[];
  showMessages: boolean;
  showNames: boolean;
}) {
  const visiblePhotos = photos.slice(0, 18);

  return (
    <section className="grid h-screen grid-cols-3 grid-rows-3 gap-2 p-2 pb-24 sm:grid-cols-4 lg:grid-cols-6">
      {visiblePhotos.map((photo, index) => (
        <article
          key={photo.id}
          className={[
            "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl shadow-black/20",
            getMasonrySpanClass(index),
            getMasonryVisibilityClass(index),
          ].join(" ")}
        >
          {photo.signedUrl ? (
            <Image
              src={photo.signedUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-[2500ms] group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 20vw"
              priority={index < 8}
            />
          ) : null}

          <PhotoCaption
            photo={photo}
            showMessages={showMessages}
            showNames={showNames}
          />
        </article>
      ))}
    </section>
  );
}

function FeaturedGallery({
  photos,
  showMessages,
  showNames,
}: {
  photos: LivePhoto[];
  showMessages: boolean;
  showNames: boolean;
}) {
  const [hero, ...rest] = photos;

  return (
    <section className="grid h-screen gap-2 p-2 pb-24 lg:grid-cols-[1.5fr_0.5fr]">
      <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl">
        {hero?.signedUrl ? (
          <Image
            src={hero.signedUrl}
            alt=""
            fill
            className="object-cover"
            sizes="75vw"
            priority
          />
        ) : null}

        {hero ? (
          <PhotoCaption
            photo={hero}
            showMessages={showMessages}
            showNames={showNames}
          />
        ) : null}
      </article>

      <div className="hidden grid-rows-4 gap-2 lg:grid">
        {rest.slice(0, 4).map((photo) => (
          <article
            key={photo.id}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5"
          >
            {photo.signedUrl ? (
              <Image
                src={photo.signedUrl}
                alt=""
                fill
                className="object-cover"
                sizes="25vw"
              />
            ) : null}

            <PhotoCaption
              photo={photo}
              showMessages={showMessages}
              showNames={showNames}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function CompactGallery({
  photos,
  showMessages,
  showNames,
}: {
  photos: LivePhoto[];
  showMessages: boolean;
  showNames: boolean;
}) {
  const visiblePhotos = photos.slice(0, 32);

  return (
    <section className="grid h-screen grid-cols-4 grid-rows-5 gap-2 p-2 pb-24 sm:grid-cols-5 sm:grid-rows-4 lg:grid-cols-8">
      {visiblePhotos.map((photo, index) => (
        <article
          key={photo.id}
          className={[
            "relative overflow-hidden rounded-xl border border-white/10 bg-white/5",
            getCompactVisibilityClass(index),
          ].join(" ")}
        >
          {photo.signedUrl ? (
            <Image
              src={photo.signedUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 25vw, 12vw"
              priority={index < 12}
            />
          ) : null}

          <PhotoCaption
            photo={photo}
            showMessages={showMessages}
            showNames={showNames}
          />
        </article>
      ))}
    </section>
  );
}

function SlideshowGallery({
  photos,
  showMessages,
  showNames,
  transition,
  duration,
}: {
  photos: LivePhoto[];
  showMessages: boolean;
  showNames: boolean;
  transition: LiveTransition;
  duration: number;
}) {
  const visiblePhotos = photos.slice(0, 8);

  if (visiblePhotos.length === 0) {
    return <EmptyState />;
  }

  const animationName =
    transition === "stories" ? "live-stories" : `live-${transition}`;

  const totalDuration = Math.max(visiblePhotos.length, 1) * duration;

  return (
    <section className="relative h-screen overflow-hidden pb-24">
      {transition === "stories" ? (
        <div
          className="fixed left-6 right-6 top-5 z-30 grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${visiblePhotos.length}, minmax(0, 1fr))`,
          }}
        >
          {visiblePhotos.map((photo, index) => (
            <span
              key={photo.id}
              className="h-1 overflow-hidden rounded-full bg-white/20"
            >
              <span
                className="block h-full bg-white"
                style={{
                  animationName: "live-story-progress",
                  animationDuration: `${totalDuration}s`,
                  animationDelay: `${index * duration}s`,
                  animationIterationCount: "infinite",
                }}
              />
            </span>
          ))}
        </div>
      ) : null}

      {visiblePhotos.map((photo, index) => (
        <article
          key={photo.id}
          className="absolute inset-0 opacity-0"
          style={{
            animationName,
            animationDuration: `${totalDuration}s`,
            animationDelay: `${index * duration}s`,
            animationIterationCount: "infinite",
          }}
        >
          {photo.signedUrl ? (
            <Image
              src={photo.signedUrl}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority={index === 0}
            />
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-black/20" />

          <PhotoCaption
            photo={photo}
            showMessages={showMessages}
            showNames={showNames}
          />
        </article>
      ))}
    </section>
  );
}

function LiveBottomBar({
  title,
  photosCount,
  qrEnabled,
  qrInterval,
}: {
  title: string;
  photosCount: number;
  qrEnabled: boolean;
  qrInterval: number;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4 sm:p-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-white shadow-2xl backdrop-blur-xl sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/50">
            Ailshan live
          </p>

          <h1 className="mt-1 truncate text-base font-semibold sm:text-xl">
            {title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-xs sm:text-sm">
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-white/80">
            {photosCount} фото
          </span>

          <span className="hidden rounded-full border border-white/10 bg-white/10 px-3 py-1 text-white/70 sm:inline-flex">
            автообновление
          </span>

          {qrEnabled ? (
            <span className="hidden rounded-full border border-white/10 bg-white/10 px-3 py-1 text-white/70 md:inline-flex">
              QR каждые {qrInterval} сек
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LiveQrOverlay({
  publicUrl,
  effect,
  interval,
}: {
  publicUrl: string;
  effect: LiveQrEffect;
  interval: number;
}) {
  return (
    <div
      className="fixed bottom-28 right-6 z-50 hidden lg:block"
      style={{
        animationName: `live-qr-${effect}`,
        animationDuration: `${interval}s`,
        animationIterationCount: "infinite",
      }}
    >
      <div className="flex flex-col items-center rounded-2xl border border-black/10 bg-white/95 p-3 text-black shadow-2xl shadow-black/30 backdrop-blur">
        <EventQrCode value={publicUrl} title="Загрузить фото" />

        <p className="mt-2 max-w-40 text-center text-xs font-medium text-black/60">
          Наведите камеру и отправьте фото
        </p>
      </div>
    </div>
  );
}

export default async function LivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const supabase = createAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      slug,
      custom_slug,
      brand_name,
      cover_title,
      is_active,
      live_layout,
      live_transition,
      slide_duration_seconds,
      live_qr_effect,
      live_qr_interval_seconds,
      show_messages_on_live,
      show_names_on_live,
      show_qr_on_live
    `,
    )
    .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
    .eq("is_active", true)
    .single();

  if (!event) {
    notFound();
  }

  const { data } = await supabase
    .from("uploads")
    .select("id, guest_name, message, file_path, created_at")
    .eq("event_id", event.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const uploads = data ?? [];

  const photos = await Promise.all(
    uploads.map(async (upload) => {
      const { data } = await supabase.storage
        .from("event-photos")
        .createSignedUrl(upload.file_path, 60 * 20);

      return {
        id: upload.id,
        guest_name: upload.guest_name,
        message: upload.message,
        signedUrl: data?.signedUrl ?? "",
      };
    }),
  );

  const layout = getSafeLayout(event.live_layout);
  const transition = getSafeTransition(event.live_transition);
  const slideDuration = getSafeDuration(event.slide_duration_seconds);
  const qrEffect = getSafeQrEffect(event.live_qr_effect);
  const qrInterval = getSafeQrInterval(event.live_qr_interval_seconds);

  const showMessages = event.show_messages_on_live ?? true;
  const showNames = event.show_names_on_live ?? true;
  const publicUrl = `${getSiteUrl()}/e/${event.custom_slug || event.slug}`;
  const liveTitle = event.cover_title || event.brand_name || event.title;

  return (
    <main className="relative h-screen overflow-hidden bg-[hsl(var(--live-background))] text-[hsl(var(--live-foreground))]">
      <LiveAutoRefresh />

      <style>{`
        @keyframes live-fade {
          0%, 100% {
            opacity: 0;
            transform: scale(1.03);
          }

          6%, 30% {
            opacity: 1;
            transform: scale(1);
          }

          36% {
            opacity: 0;
            transform: scale(1.01);
          }
        }

        @keyframes live-slide {
          0%, 100% {
            opacity: 0;
            transform: translateX(54px) scale(1.02);
          }

          8%, 30% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }

          38% {
            opacity: 0;
            transform: translateX(-54px) scale(1.02);
          }
        }

        @keyframes live-zoom {
          0%, 100% {
            opacity: 0;
            transform: scale(1.15);
          }

          8%, 30% {
            opacity: 1;
            transform: scale(1.04);
          }

          38% {
            opacity: 0;
            transform: scale(1);
          }
        }

        @keyframes live-stories {
          0%, 100% {
            opacity: 0;
            transform: scale(1.05);
          }

          5%, 32% {
            opacity: 1;
            transform: scale(1);
          }

          38% {
            opacity: 0;
            transform: scale(1.02);
          }
        }

        @keyframes live-story-progress {
          0%, 4% {
            transform: translateX(-100%);
          }

          5%, 32% {
            transform: translateX(0);
          }

          33%, 100% {
            transform: translateX(100%);
          }
        }

        @keyframes live-qr-fade {
          0%, 8% {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
            pointer-events: none;
          }

          12%, 38% {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
          }

          44%, 100% {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
            pointer-events: none;
          }
        }

        @keyframes live-qr-slide {
          0%, 8% {
            opacity: 0;
            transform: translateX(42px);
            pointer-events: none;
          }

          12%, 38% {
            opacity: 1;
            transform: translateX(0);
            pointer-events: auto;
          }

          44%, 100% {
            opacity: 0;
            transform: translateX(42px);
            pointer-events: none;
          }
        }

        @keyframes live-qr-pulse {
          0%, 8% {
            opacity: 0;
            transform: scale(0.92);
            pointer-events: none;
          }

          12%, 38% {
            opacity: 1;
            transform: scale(1);
            pointer-events: auto;
          }

          18%, 28% {
            transform: scale(1.035);
          }

          44%, 100% {
            opacity: 0;
            transform: scale(0.92);
            pointer-events: none;
          }
        }

        @keyframes live-qr-stories {
          0%, 8% {
            opacity: 0;
            transform: translateY(24px) scale(0.94);
            pointer-events: none;
          }

          12%, 36% {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
          }

          42%, 100% {
            opacity: 0;
            transform: translateY(24px) scale(0.94);
            pointer-events: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <div className="absolute inset-0">
        {photos.length === 0 ? <EmptyState /> : null}

        {photos.length > 0 && layout === "featured" ? (
          <FeaturedGallery
            photos={photos}
            showMessages={showMessages}
            showNames={showNames}
          />
        ) : null}

        {photos.length > 0 && layout === "slideshow" ? (
          <SlideshowGallery
            photos={photos}
            showMessages={showMessages}
            showNames={showNames}
            transition={transition}
            duration={slideDuration}
          />
        ) : null}

        {photos.length > 0 && layout === "compact" ? (
          <CompactGallery
            photos={photos}
            showMessages={showMessages}
            showNames={showNames}
          />
        ) : null}

        {photos.length > 0 && layout === "masonry" ? (
          <MasonryGallery
            photos={photos}
            showMessages={showMessages}
            showNames={showNames}
          />
        ) : null}
      </div>

      <LiveBottomBar
        title={liveTitle}
        photosCount={photos.length}
        qrEnabled={event.show_qr_on_live ?? false}
        qrInterval={qrInterval}
      />

      {event.show_qr_on_live ? (
        <LiveQrOverlay
          publicUrl={publicUrl}
          effect={qrEffect}
          interval={qrInterval}
        />
      ) : null}
    </main>
  );
}
