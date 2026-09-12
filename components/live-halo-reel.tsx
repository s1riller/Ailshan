"use client";

import { useMemo, useState } from "react";

import { HaloReel, type HaloReelItem } from "@/components/ui/halo-reel";

export type ReelPhoto = {
  id: string;
  url: string;
  guestName: string | null;
  message: string | null;
};

/**
 * Карусель снимков на экране зала.
 *
 * Стена перерисовывается каждые несколько секунд (router.refresh), и если бы
 * массив карточек создавался заново каждый раз, автопрокрутка перезапускалась
 * бы с рывком. Поэтому список пересобирается только когда меняется набор id.
 * Подпись у переднего снимка обновляется по колбэку кольца, без ререндера
 * самой карусели.
 */
export function LiveHaloReel({
  photos,
  title,
  showNames,
  showMessages,
  withPanel = false,
}: {
  photos: ReelPhoto[];
  title: string;
  showNames: boolean;
  showMessages: boolean;
  /** Слева стоит панель конкурса — кольцо смещается правее, чтобы не уйти под неё */
  withPanel?: boolean;
}) {
  const key = photos.map((photo) => photo.id).join("|");
  const items = useMemo<HaloReelItem[]>(
    () => photos.map((photo) => ({ src: photo.url, alt: photo.message || photo.guestName || "Снимок гостя" })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- пересобираем только при смене набора снимков
    [key],
  );
  const [front, setFront] = useState<ReelPhoto | null>(photos[0] ?? null);

  if (photos.length === 0) return null;

  const caption = front && (showNames || showMessages) ? front : null;

  return (
    <div className="absolute inset-x-0 top-0 bottom-[var(--bar)] isolate z-0">
      <HaloReel
        items={items}
        aria-label="Снимки гостей"
        cardWidth={420}
        cardHeight={560}
        minScale={0.32}
        radiusXRatio={withPanel ? 0.3 : 0.42}
        radiusYRatio={0.34}
        centerXRatio={withPanel ? 0.3 : 0.02}
        spread={1.15}
        holdDuration={2600}
        stepDuration={900}
        draggable={false}
        pauseOnHover={false}
        cardClassName="rounded-2xl border border-live-foreground/10 bg-live shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]"
        onFrontChange={(_, index) => setFront(photos[index] ?? null)}
        className="h-full bg-transparent"
        centerLabel={
          <div className="max-w-[28vw] text-left">
            <div className="text-lg font-medium uppercase tracking-[0.18em] text-live-muted">Снимки гостей</div>
            <div className="mt-4 font-serif text-[4.2vw] font-medium leading-[1.02] text-live-foreground">{title}</div>
            {caption ? (
              <div className="mt-10 border-t border-live-foreground/15 pt-6">
                {showNames && caption.guestName ? (
                  <div className="text-base font-medium uppercase tracking-[0.18em] text-live-muted">{caption.guestName}</div>
                ) : null}
                {showMessages && caption.message ? (
                  <p className="mt-2 font-serif text-[1.9vw] italic leading-snug text-live-foreground">{caption.message}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
