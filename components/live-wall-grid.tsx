"use client";

import { ContainedPhoto, PhotoCaption, PhotoTile, type LivePhoto } from "@/components/live-photo-tiles";
import { PhotoLightboxTrigger } from "@/components/photo-lightbox";
import { chooseGrid, planGrid } from "@/lib/live-grid";
import { useElementSize } from "@/lib/use-element-size";

/** Область стены над нижней полосой; высота полосы — переменная --bar на <main> */
const WALL_SECTION = "absolute inset-x-0 top-0 bottom-[var(--bar)] p-6";

/** Пока область не измерена — план под проектор 16:9 (1920×1080 минус полоса) */
const FALLBACK = { width: 1872, height: 896 };

const LIMITS = {
  masonry: { photos: 18, maxCols: 10, maxRows: 4 },
  compact: { photos: 32, maxCols: 12, maxRows: 5 },
} as const;

/**
 * Сетка снимков, которая подбирает столбцы и строки под реальный размер
 * области: на проекторе 16:9 — привычная мозаика, на LED-полосе 3:1 — один
 * ряд портретных плиток, на вертикальной панели — столбец. Считает
 * lib/live-grid, здесь только измерение и разметка.
 */
export function LiveWallGrid({
  photos,
  mode,
  showMessages,
  showNames,
}: {
  photos: LivePhoto[];
  mode: "masonry" | "compact";
  showMessages: boolean;
  showNames: boolean;
}) {
  const [ref, size] = useElementSize<HTMLElement>();
  const area = size.width > 0 && size.height > 0 ? size : FALLBACK;
  const limits = LIMITS[mode];
  const candidates = photos.slice(0, limits.photos);
  const [cols, rows] = chooseGrid(candidates.length, area.width, area.height, limits);
  const shown = candidates.slice(0, cols * rows);
  const plan = planGrid(shown.length, cols, rows);
  const tileWidth = Math.round(100 / cols);

  return (
    <section
      ref={ref}
      className={`${WALL_SECTION} grid grid-flow-dense gap-3`}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {shown.map((photo, index) => {
        const span = plan.spans[index];

        return (
          <PhotoTile
            key={photo.id}
            photo={photo}
            index={index}
            span={span}
            sizes={span ? `${tileWidth * 2}vw` : `${tileWidth}vw`}
            priority={index < 8}
            showMessages={showMessages}
            showNames={showNames}
          />
        );
      })}
    </section>
  );
}

/**
 * Главный кадр: свежий снимок крупно, рядом ещё четыре. На проекторе —
 * колонка справа; на широкой полосе кадр занимает столько, сколько позволяет
 * высота, а соседи встают квадратом 2×2, иначе они превращались бы в ленточки.
 */
export function LiveFeaturedGrid({
  photos,
  showMessages,
  showNames,
}: {
  photos: LivePhoto[];
  showMessages: boolean;
  showNames: boolean;
}) {
  const [ref, size] = useElementSize<HTMLElement>();
  const area = size.width > 0 && size.height > 0 ? size : FALLBACK;
  const [hero, ...rest] = photos;
  const side = rest.slice(0, 4);
  const wideStage = area.width / area.height >= 1.9;
  const heroWidth = Math.min(area.height * 1.4, area.width * 0.6);
  const sideCols = wideStage ? Math.min(2, side.length) : 1;
  const sideRows = Math.max(1, Math.ceil(side.length / sideCols));

  return (
    <section
      ref={ref}
      className={`${WALL_SECTION} grid gap-3`}
      style={{ gridTemplateColumns: wideStage ? `${Math.round(heroWidth)}px minmax(0, 1fr)` : "3fr 1fr" }}
    >
      <article className="relative overflow-hidden rounded-xl border border-live-foreground/10 bg-live-foreground/5">
        <ContainedPhoto photo={hero} sizes={wideStage ? "60vw" : "75vw"} priority />
        <PhotoCaption photo={hero} showMessages={showMessages} showNames={showNames} size="lg" />
        <PhotoLightboxTrigger index={0} className="absolute inset-0 z-10 cursor-pointer" label="Открыть снимок на весь экран" />
      </article>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${sideCols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${sideRows}, minmax(0, 1fr))`,
        }}
      >
        {side.map((photo, position) => (
          <PhotoTile
            key={photo.id}
            photo={photo}
            index={position + 1}
            sizes={wideStage ? "20vw" : "25vw"}
            priority
            showMessages={showMessages}
            showNames={showNames}
          />
        ))}
      </div>
    </section>
  );
}
