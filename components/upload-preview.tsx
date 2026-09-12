"use client";

import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Превью фото с открытием на весь экран.
 *
 * Клиентский компонент намеренно: если создавать <button> для DialogTrigger
 * в серверном компоненте и рендерить его несколько раз на странице, React Flight
 * дедуплицирует повторяющиеся поддеревья и отдаёт их клиенту как React.lazy —
 * Radix Slot такое не разворачивает и падает с «failed to slot onto its children».
 */
export function UploadPreview({
  signedUrl,
  guestName,
  message,
  className = "h-16 w-16",
}: {
  signedUrl: string;
  guestName: string;
  message: string | null;
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Открыть снимок: ${guestName}`}
          className={cn(
            "relative shrink-0 overflow-hidden rounded-lg border bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className,
          )}
        >
          {signedUrl ? <Image src={signedUrl} alt="" fill className="object-cover" sizes="96px" /> : null}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-medium">{guestName}</DialogTitle>
          <DialogDescription className={message ? "font-serif text-base text-foreground" : undefined}>
            {message || "Без пожелания"}
          </DialogDescription>
        </DialogHeader>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-secondary">
          {signedUrl ? <Image src={signedUrl} alt="" fill className="object-contain" sizes="90vw" /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
