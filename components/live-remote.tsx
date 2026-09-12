import Image from "next/image";
import Link from "next/link";
import { Monitor, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { pinLivePhotoAction, setLiveModeAction } from "@/lib/actions/live";
import { LIVE_MODE_HINT, LIVE_MODE_LABEL, LIVE_MODES, type LiveMode } from "@/lib/live-modes";

export type PinnedPreview = {
  id: string;
  guestName: string;
  signedUrl: string;
};

/**
 * Пульт экрана зала. Стена перечитывает режим сама каждые несколько секунд,
 * поэтому ведущему не нужно подходить к ноутбуку с проектором.
 */
export function LiveRemote({
  eventId,
  mode,
  pinned,
  liveUrl,
  compact = false,
}: {
  eventId: string;
  mode: LiveMode;
  pinned: PinnedPreview | null;
  liveUrl: string;
  compact?: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 border-b pb-3">
        <div>
          <div className="eyebrow">Пульт</div>
          <h2 className="mt-1 font-serif text-2xl font-medium">Что сейчас на экране</h2>
          {!compact ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Переключается отсюда — проектор подхватит через несколько секунд.
            </p>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={liveUrl} target="_blank">
            <Monitor className="h-4 w-4" />
            Открыть
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {LIVE_MODES.map((value) => {
          const active = value === mode;
          return (
            <form key={value} action={setLiveModeAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="mode" value={value} />
              <SubmitButton
                variant={active ? "default" : "outline"}
                className="w-full"
                aria-pressed={active}
                pendingText="Переключаем…"
              >
                {LIVE_MODE_LABEL[value]}
              </SubmitButton>
            </form>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">{LIVE_MODE_HINT[mode]}</p>

      {pinned ? (
        <div className="flex items-center gap-4 rounded-xl border bg-card p-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-secondary">
            <Image src={pinned.signedUrl} alt="" fill className="object-cover" sizes="64px" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Сейчас на экране крупно</div>
            <div className="truncate font-medium">{pinned.guestName}</div>
          </div>
          <form action={pinLivePhotoAction}>
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="uploadId" value="" />
            <SubmitButton variant="outline" size="sm" pendingText="Снимаем…">
              <X className="h-4 w-4" />
              Снять
            </SubmitButton>
          </form>
        </div>
      ) : !compact ? (
        <p className="text-sm text-muted-foreground">
          Чтобы показать снимок крупно, нажмите «На экран» у любого одобренного снимка во вкладке «Загрузки».
        </p>
      ) : null}
    </section>
  );
}

/** Кнопка «На экран» у снимка; у выведенного — «Снять с экрана» */
export function PinToScreenButton({
  eventId,
  uploadId,
  status,
  pinnedId,
  size = "sm",
  className,
}: {
  eventId: string;
  uploadId: string;
  status: string;
  pinnedId: string | null;
  size?: "sm" | "default";
  className?: string;
}) {
  if (status !== "approved") return null;
  const isPinned = pinnedId === uploadId;

  return (
    <form action={pinLivePhotoAction} className={className}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="uploadId" value={isPinned ? "" : uploadId} />
      <SubmitButton variant={isPinned ? "secondary" : "outline"} size={size} className="w-full" pendingText="…">
        <Monitor className="h-4 w-4" />
        {isPinned ? "Снять с экрана" : "На экран"}
      </SubmitButton>
    </form>
  );
}
