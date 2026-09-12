"use client";

import Image from "next/image";

import { PhotoLightboxTrigger } from "@/components/photo-lightbox";

/** Снимок на экране зала — данные, безопасные для клиентских компонентов */
export type LivePhoto = {
  id: string;
  guest_name: string;
  message: string | null;
  signedUrl: string;
};

/** Капитель для стены: крупнее обычной, читается с десяти метров */
export const WALL_OVERLINE = "text-lg font-medium uppercase tracking-[0.18em] text-live-muted";

export function PhotoCaption({
  photo,
  showMessages,
  showNames,
  size = "sm",
}: {
  photo: LivePhoto;
  showMessages: boolean;
  showNames: boolean;
  size?: "sm" | "lg";
}) {
  const hasMessage = showMessages && Boolean(photo.message);
  if (!showNames && !hasMessage) return null;

  const large = size === "lg";

  return (
    <div className={["absolute inset-x-0 bottom-0 bg-live/80 backdrop-blur-sm", large ? "px-8 py-5" : "px-4 py-3"].join(" ")}>
      {showNames ? (
        <p
          className={[
            "truncate font-medium uppercase text-live-muted",
            large ? "text-xl tracking-[0.18em]" : "text-base tracking-[0.14em]",
          ].join(" ")}
        >
          {photo.guest_name}
        </p>
      ) : null}

      {hasMessage ? (
        <p
          className={[
            "font-serif italic leading-snug text-live-foreground",
            large ? "mt-2 line-clamp-2 text-4xl" : "mt-1 line-clamp-2 text-2xl",
          ].join(" ")}
        >
          {photo.message}
        </p>
      ) : null}
    </div>
  );
}

/** Снимок целиком на размытом отражении себя же: без чёрных полей и без обрезки */
export function ContainedPhoto({ photo, sizes, priority = false }: { photo: LivePhoto; sizes: string; priority?: boolean }) {
  if (!photo.signedUrl) return null;

  return (
    <>
      <Image
        src={photo.signedUrl}
        alt=""
        aria-hidden
        fill
        className="scale-110 object-cover opacity-50 blur-2xl"
        sizes="200px"
      />
      <Image src={photo.signedUrl} alt="" fill className="object-contain" sizes={sizes} priority={priority} />
    </>
  );
}

export function PhotoTile({
  photo,
  index,
  span,
  sizes,
  priority,
  showMessages,
  showNames,
}: {
  photo: LivePhoto;
  /** Позиция в общем списке снимков стены — для открытия на весь экран */
  index: number;
  span?: string;
  sizes: string;
  priority: boolean;
  showMessages: boolean;
  showNames: boolean;
}) {
  return (
    <article
      className={["relative overflow-hidden rounded-xl border border-live-foreground/10 bg-live-foreground/5", span ?? ""].join(" ")}
    >
      {photo.signedUrl ? (
        <Image src={photo.signedUrl} alt="" fill className="object-cover" sizes={sizes} priority={priority} />
      ) : null}

      <PhotoCaption photo={photo} showMessages={showMessages} showNames={showNames} />
      <PhotoLightboxTrigger index={index} className="absolute inset-0 z-10 cursor-pointer" label="Открыть снимок на весь экран" />
    </article>
  );
}
