import Image from "next/image";

/**
 * Снимок, который ведущий вывел на экран крупно. Лежит поверх любого режима,
 * пока его не снимут из кабинета.
 */
export function LivePinnedPhoto({
  url,
  guestName,
  message,
  showNames,
  showMessages,
}: {
  url: string;
  guestName: string | null;
  message: string | null;
  showNames: boolean;
  showMessages: boolean;
}) {
  const hasCaption = (showNames && guestName) || (showMessages && message);

  return (
    <div className="absolute inset-x-0 top-0 bottom-[var(--bar)] z-30 flex flex-col bg-live">
      <div className="relative min-h-0 flex-1 p-8">
        <Image src={url} alt={message || guestName || "Снимок гостя"} fill priority sizes="100vw" className="object-contain p-8" />
      </div>
      {hasCaption ? (
        <div className="px-12 pb-8">
          {showNames && guestName ? (
            <div className="text-lg font-medium uppercase tracking-[0.18em] text-live-muted">{guestName}</div>
          ) : null}
          {showMessages && message ? (
            <p className="mt-2 max-w-4xl font-serif text-[calc(2.4*var(--u))] italic leading-snug text-live-foreground">{message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
