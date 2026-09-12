"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type LightboxPhoto = {
  id: string;
  url: string;
  guestName?: string | null;
  message?: string | null;
};

type LightboxContextValue = {
  open: (index: number) => void;
  openById: (id: string) => void;
  close: () => void;
};

const LightboxContext = createContext<LightboxContextValue | null>(null);

/**
 * Просмотр фото на весь экран. Провайдер держит список снимков и состояние,
 * триггеры оборачивают любую плитку. Оба — клиентские компоненты, поэтому
 * серверная страница отдаёт им только данные, а кнопки создаются на клиенте.
 *
 * Открытый снимок запоминается по id, а не по индексу: галерея и экран зала
 * обновляются сами, и когда приходит новое фото, список сдвигается — открытый
 * кадр при этом остаётся тем же.
 *
 * Листание: стрелки, свайп, клавиши ← → и Esc.
 */
export function PhotoLightbox({
  photos,
  size = "default",
  children,
}: {
  photos: LightboxPhoto[];
  /** «wall» — крупнее подписи и кнопки, для проектора */
  size?: "default" | "wall";
  children: React.ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const count = photos.length;
  const index = openId === null ? -1 : photos.findIndex((photo) => photo.id === openId);
  const current = index >= 0 ? photos[index] : null;
  const wall = size === "wall";

  const open = useCallback((next: number) => setOpenId(photos[next]?.id ?? null), [photos]);
  const openById = useCallback((id: string) => setOpenId(id), []);
  const close = useCallback(() => setOpenId(null), []);
  const step = useCallback(
    (delta: number) => {
      if (index < 0 || count === 0) return;
      setOpenId(photos[(index + delta + count) % count]?.id ?? null);
    },
    [count, index, photos],
  );

  useEffect(() => {
    if (!current) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [current, close, step]);

  return (
    <LightboxContext.Provider value={{ open, openById, close }}>
      {children}
      {current ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.guestName ? `Снимок: ${current.guestName}` : "Снимок"}
          className="fixed inset-0 z-50 flex flex-col bg-live text-live-foreground"
          onClick={close}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchStartX.current;
            touchStartX.current = null;
            if (start === null) return;
            const delta = (event.changedTouches[0]?.clientX ?? start) - start;
            if (Math.abs(delta) > 48) step(delta < 0 ? 1 : -1);
          }}
        >
          <div className={cn("flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6", wall && "px-8 pt-6")}>
            <span className={cn("tabular text-sm text-live-muted", wall && "text-xl")}>
              {index + 1} / {count}
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={close}
              aria-label="Закрыть"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full text-live-foreground transition-colors hover:bg-live-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-live-accent",
                wall && "h-14 w-14",
              )}
            >
              <X className={wall ? "h-7 w-7" : "h-5 w-5"} />
            </button>
          </div>

          <div className="relative min-h-0 flex-1" onClick={(event) => event.stopPropagation()}>
            <Image
              key={current.id}
              src={current.url}
              alt={current.message || current.guestName || "Снимок"}
              fill
              priority
              sizes="100vw"
              className="object-contain"
            />
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Предыдущий снимок"
                  className={cn(
                    "absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-live/60 text-live-foreground backdrop-blur transition-colors hover:bg-live-foreground/15 sm:flex",
                    wall && "left-6 h-16 w-16",
                  )}
                >
                  <ChevronLeft className={wall ? "h-8 w-8" : "h-6 w-6"} />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Следующий снимок"
                  className={cn(
                    "absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-live/60 text-live-foreground backdrop-blur transition-colors hover:bg-live-foreground/15 sm:flex",
                    wall && "right-6 h-16 w-16",
                  )}
                >
                  <ChevronRight className={wall ? "h-8 w-8" : "h-6 w-6"} />
                </button>
              </>
            ) : null}
          </div>

          <div
            className={cn("px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-8", wall && "px-12 pb-8")}
            onClick={(event) => event.stopPropagation()}
          >
            {current.guestName ? (
              <div className={cn("text-[11px] font-medium uppercase tracking-[0.16em] text-live-muted", wall && "text-lg tracking-[0.18em]")}>
                {current.guestName}
              </div>
            ) : null}
            {current.message ? (
              <p className={cn("mt-1 max-w-2xl font-serif text-xl italic leading-snug sm:text-2xl", wall && "max-w-4xl text-[2.4vw]")}>
                {current.message}
              </p>
            ) : null}
            {count > 1 && !wall ? <p className="mt-3 text-xs text-live-muted sm:hidden">Листайте свайпом</p> : null}
          </div>
        </div>
      ) : null}
    </LightboxContext.Provider>
  );
}

/** Программное открытие — для карусели и других интерактивных обёрток */
export function usePhotoLightbox() {
  return useContext(LightboxContext);
}

/** Кнопка-обёртка вокруг плитки: тап открывает снимок с этим индексом */
export function PhotoLightboxTrigger({
  index,
  className,
  children,
  label = "Открыть снимок",
}: {
  index: number;
  className?: string;
  children?: React.ReactNode;
  label?: string;
}) {
  const context = useContext(LightboxContext);
  if (!context) return <>{children}</>;

  return (
    <button
      type="button"
      onClick={() => context.open(index)}
      aria-label={label}
      className={cn(
        "block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {children}
    </button>
  );
}
