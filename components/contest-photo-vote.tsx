"use client";

import { ThumbsUp } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { voteForPhotoAction } from "@/lib/actions/games";
import { plural } from "@/lib/utils";

export type VotablePhoto = {
  id: string;
  guestName: string;
  signedUrl: string;
  votes: number;
};

/**
 * Голосование за снимок. Клиентский компонент намеренно: триггер диалога,
 * созданный в серверном компоненте и повторённый на странице несколько раз,
 * React Flight дедуплицирует, и Radix Slot падает (см. upload-preview.tsx).
 * Один диалог на весь список — открывается для выбранного снимка.
 */
export function ContestPhotoVote({
  eventId,
  slug,
  photos,
}: {
  eventId: string;
  slug: string;
  photos: VotablePhoto[];
}) {
  const [openPhoto, setOpenPhoto] = useState<VotablePhoto | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {photos.map((photo) => (
          <div key={photo.id} className="overflow-hidden rounded-xl border bg-card">
            <button
              type="button"
              onClick={() => setOpenPhoto(photo)}
              className="relative block min-h-60 w-full bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Открыть снимок: ${photo.guestName}`}
            >
              {photo.signedUrl ? (
                <Image src={photo.signedUrl} alt="" fill className="object-cover" sizes="(min-width: 640px) 50vw, 100vw" />
              ) : null}
            </button>
            <div className="space-y-3 p-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate font-serif text-lg">{photo.guestName}</p>
                <p className="tabular shrink-0 text-xs text-muted-foreground">{plural(photo.votes, "голос", "голоса", "голосов")}</p>
              </div>
              <form action={voteForPhotoAction}>
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="uploadId" value={photo.id} />
                <SubmitButton variant="outline" className="h-11 w-full" pendingText="Отправляем…">
                  <ThumbsUp className="h-4 w-4" />
                  Отдать голос
                </SubmitButton>
              </form>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={openPhoto !== null} onOpenChange={(open) => !open && setOpenPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{openPhoto?.guestName}</DialogTitle>
            <DialogDescription>
              {openPhoto ? plural(openPhoto.votes, "голос", "голоса", "голосов") : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-secondary sm:aspect-[4/3]">
            {openPhoto?.signedUrl ? (
              <Image src={openPhoto.signedUrl} alt="" fill className="object-contain" sizes="90vw" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
