"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { leaveQuizTeamAction } from "@/lib/actions/quiz";

/**
 * Выход из команды — с подтверждением: рядом с этой кнопкой другие элементы
 * шапки, и промах пальцем не должен выбрасывать гостя из игры.
 */
export function ContestLeaveTeam({ eventId, slug, teamName }: { eventId: string; slug: string; teamName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Выйти из команды"
        title="Выйти из команды"
        onClick={() => setOpen(true)}
      >
        <LogOut className="h-5 w-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent position="bottom">
          <DialogHeader>
            <DialogTitle>Выйти из команды «{teamName}»?</DialogTitle>
            <DialogDescription>Баллы команды сохранятся. Чтобы вернуться, понадобится код команды.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Остаться
            </Button>
            <form action={leaveQuizTeamAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="slug" value={slug} />
              <SubmitButton variant="destructive" pendingText="Выходим…" className="w-full">
                Выйти из команды
              </SubmitButton>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
