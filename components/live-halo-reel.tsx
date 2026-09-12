"use client";

import { useMemo, useState } from "react";

import { PhotoLightbox, usePhotoLightbox, type LightboxPhoto } from "@/components/photo-lightbox";
import { HaloReel, type HaloReelItem } from "@/components/ui/halo-reel";
import { useElementSize } from "@/lib/use-element-size";

/** Карточка на проекторе 16:9; на низких экранах уменьшается вместе с кольцом */
const CARD_HEIGHT = 560;
const CARD_RATIO = 0.75;

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
 * самой карусели. Клик по карточке открывает снимок на весь экран.
 *
 * Размер карточек и вертикальный радиус кольца считаются от высоты области:
 * на LED-полосе 3:1 карточки под проектор не влезали бы по высоте и резались.
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
  const lightboxPhotos: LightboxPhoto[] = photos.map((photo) => ({
    id: photo.id,
    url: photo.url,
    guestName: showNames ? photo.guestName : null,
    message: showMessages ? photo.message : null,
  }));

  if (photos.length === 0) return null;

  return (
    <PhotoLightbox photos={lightboxPhotos} size="wall">
      <Reel photos={photos} title={title} showNames={showNames} showMessages={showMessages} withPanel={withPanel} />
    </PhotoLightbox>
  );
}

function Reel({
  photos,
  title,
  showNames,
  showMessages,
  withPanel,
}: {
  photos: ReelPhoto[];
  title: string;
  showNames: boolean;
  showMessages: boolean;
  withPanel: boolean;
}) {
  const lightbox = usePhotoLightbox();
  const key = photos.map((photo) => photo.id).join("|");
  const items = useMemo<HaloReelItem[]>(
    () => photos.map((photo) => ({ src: photo.url, alt: photo.message || photo.guestName || "Снимок гостя" })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- пересобираем только при смене набора снимков
    [key],
  );
  const [front, setFront] = useState<ReelPhoto | null>(photos[0] ?? null);
  const caption = front && (showNames || showMessages) ? front : null;

  // Низкая область (полоса, а не проектор): кольцо площе, карточки — половина
  // высоты, чтобы передняя целиком помещалась над нижней полосой.
  const [ref, size] = useElementSize<HTMLDivElement>();
  const short = size.height > 0 && size.height < 800;
  const cardHeight = short ? Math.max(220, Math.round(size.height * 0.5)) : CARD_HEIGHT;
  const cardWidth = Math.round(cardHeight * CARD_RATIO);
  // На полосе шире 2:1 кольцо уходит к центру, а подпись остаётся справа;
  // карточки меньше, поэтому шаг между ними больше — иначе они слипаются.
  const wideStage = size.width > 0 && size.width / Math.max(size.height, 1) >= 2;
  const radiusX = wideStage ? (withPanel ? 0.24 : 0.32) : withPanel ? 0.3 : 0.42;
  const centerX = wideStage ? (withPanel ? 0.42 : 0.28) : withPanel ? 0.3 : 0.02;

  return (
    <div ref={ref} className="absolute inset-x-0 top-0 bottom-[var(--bar)] isolate z-0">
      <HaloReel
        items={items}
        aria-label="Снимки гостей"
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        minScale={0.32}
        radiusXRatio={radiusX}
        radiusYRatio={short ? 0.24 : 0.34}
        centerXRatio={centerX}
        spread={short ? 1.7 : 1.15}
        holdDuration={2600}
        stepDuration={900}
        draggable={false}
        pauseOnHover={false}
        cardClassName="rounded-2xl border border-live-foreground/10 bg-live shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]"
        onFrontChange={(_, index) => setFront(photos[index] ?? null)}
        onCardClick={(_, index) => {
          const photo = photos[index];
          if (photo) lightbox?.openById(photo.id);
        }}
        className="h-full bg-transparent"
        centerLabel={
          <div className="max-w-[28cqw] text-left">
            <div className="text-[calc(0.95*var(--t))] font-medium uppercase tracking-[0.18em] text-live-muted">Снимки гостей</div>
            <div className="mt-4 font-serif text-[calc(4.2*var(--t))] font-medium leading-[1.02] text-live-foreground">{title}</div>
            {caption ? (
              <div className="mt-[calc(2*var(--u))] border-t border-live-foreground/15 pt-[calc(1.2*var(--u))]">
                {showNames && caption.guestName ? (
                  <div className="text-[calc(0.85*var(--t))] font-medium uppercase tracking-[0.18em] text-live-muted">{caption.guestName}</div>
                ) : null}
                {showMessages && caption.message ? (
                  <p className="mt-2 line-clamp-3 font-serif text-[calc(1.9*var(--t))] italic leading-snug text-live-foreground">{caption.message}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
