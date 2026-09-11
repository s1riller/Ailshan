import Image from "next/image";
import { CheckCircle2, Clock3, Lock, Sparkles, ThumbsUp, XCircle } from "lucide-react";

import { GamePhotoForm } from "@/components/game-photo-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { submitGameEntryAction, voteForPhotoAction } from "@/lib/actions/games";
import { pickTaskForTeam } from "@/lib/games/catalog";
import type { ContestEntry, ResolvedGame } from "@/lib/games/contest";

export type VotablePhoto = {
  id: string;
  guestName: string;
  signedUrl: string;
  votes: number;
};

type GuestGamesProps = {
  eventId: string;
  slug: string;
  games: ResolvedGame[];
  teamId: string | null;
  teamEntries: ContestEntry[];
  photos: VotablePhoto[];
  hasVoted: boolean;
  maxFileSizeMb: number;
};

function HiddenGameFields({ eventId, slug, gameType }: { eventId: string; slug: string; gameType: string }) {
  return (
    <>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="gameType" value={gameType} />
    </>
  );
}

export function GuestGames({
  eventId,
  slug,
  games,
  teamId,
  teamEntries,
  photos,
  hasVoted,
  maxFileSizeMb,
}: GuestGamesProps) {
  if (games.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Мини-игры конкурса</h2>
        <Badge variant="secondary">{games.length}</Badge>
      </div>

      {games.map((game) => {
        const { definition, config } = game;
        const entries = teamEntries.filter((entry) => entry.gameType === definition.type);
        const approved = entries.filter((entry) => entry.status === "approved");
        const pending = entries.filter((entry) => entry.status === "pending");
        const earned = approved.reduce((sum, entry) => sum + entry.score, 0);
        const usedUp = !definition.allowsMultipleEntries && entries.length > 0;
        const Icon = definition.icon;

        return (
          <Card key={definition.type}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5 shrink-0 text-primary" />
                  {config.title}
                </CardTitle>
                <Badge variant="secondary" className="shrink-0">
                  {config.points} б.
                </Badge>
              </div>
              {config.prompt ? <CardDescription className="pt-1">{config.prompt}</CardDescription> : null}
            </CardHeader>

            <CardContent className="space-y-3">
              {approved.length > 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Засчитано: +{earned} баллов команде
                </div>
              ) : null}

              {pending.length > 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                  <Clock3 className="h-4 w-4 shrink-0" />
                  {pending.length === 1 ? "Ответ ждёт проверки ведущего" : `${pending.length} ответов ждут проверки`}
                </div>
              ) : null}

              {entries.some((entry) => entry.status === "rejected") ? (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <XCircle className="h-4 w-4 shrink-0" />
                  Ведущий не засчитал результат
                </div>
              ) : null}

              {!teamId ? (
                <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 shrink-0" />
                  Вступите в команду выше, чтобы играть
                </div>
              ) : definition.input === "host" ? (
                <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Конкурс проходит в зале. Баллы за него начисляет ведущий.
                </p>
              ) : usedUp ? (
                <p className="text-sm text-muted-foreground">
                  {entries[0]?.content ? `Ваш ответ: «${entries[0].content}»` : "Команда уже участвовала."}
                </p>
              ) : (
                <GameForm
                  eventId={eventId}
                  slug={slug}
                  game={game}
                  teamId={teamId}
                  entries={entries}
                  photos={photos}
                  hasVoted={hasVoted}
                  maxFileSizeMb={maxFileSizeMb}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function GameForm({
  eventId,
  slug,
  game,
  teamId,
  entries,
  photos,
  hasVoted,
  maxFileSizeMb,
}: {
  eventId: string;
  slug: string;
  game: ResolvedGame;
  teamId: string;
  entries: ContestEntry[];
  photos: VotablePhoto[];
  hasVoted: boolean;
  maxFileSizeMb: number;
}) {
  const { definition, config } = game;

  if (definition.input === "text") {
    return (
      <form action={submitGameEntryAction} className="space-y-3">
        <HiddenGameFields eventId={eventId} slug={slug} gameType={definition.type} />
        <Textarea name="content" required placeholder="Ответ команды" className="min-h-24" maxLength={800} />
        <Button type="submit" className="h-12 w-full text-base">
          Отправить ответ
        </Button>
      </form>
    );
  }

  if (definition.input === "choice") {
    return (
      <form action={submitGameEntryAction} className="space-y-3">
        <HiddenGameFields eventId={eventId} slug={slug} gameType={definition.type} />
        <div className="grid gap-2">
          {config.options.map((option, index) => (
            <label
              key={option}
              className="flex min-h-14 cursor-pointer touch-manipulation items-center gap-3 rounded-lg border bg-card p-3 text-base transition-colors active:bg-secondary has-[:checked]:border-primary has-[:checked]:bg-secondary/60"
            >
              <input type="radio" name="optionIndex" value={index} required className="h-5 w-5 shrink-0" />
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="font-medium">{option}</span>
            </label>
          ))}
        </div>
        <Button type="submit" className="h-12 w-full text-base">
          Ответить от команды
        </Button>
      </form>
    );
  }

  if (definition.input === "task") {
    const task = pickTaskForTeam(config.options, teamId);

    if (!task) {
      return <p className="text-sm text-muted-foreground">Ведущий ещё не добавил задания.</p>;
    }

    return (
      <form action={submitGameEntryAction} className="space-y-3">
        <HiddenGameFields eventId={eventId} slug={slug} gameType={definition.type} />
        <input type="hidden" name="meta_task" value={task} />
        <div className="flex items-start gap-3 rounded-lg border bg-secondary/40 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Задание команды</div>
            <p className="mt-1 font-medium">{task}</p>
          </div>
        </div>
        <Textarea
          name="content"
          required
          placeholder="Расскажите, как выполнили задание"
          className="min-h-20"
          maxLength={800}
        />
        <Button type="submit" className="h-12 w-full text-base">
          Отправить на проверку
        </Button>
      </form>
    );
  }

  if (definition.input === "bingo") {
    const markedCells = new Set(
      entries.map((entry) => String((entry.metadata as Record<string, unknown>).cell ?? "")),
    );

    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {config.options.map((cell) => {
          const done = markedCells.has(cell);

          return (
            <form action={submitGameEntryAction} key={cell}>
              <HiddenGameFields eventId={eventId} slug={slug} gameType={definition.type} />
              <input type="hidden" name="meta_cell" value={cell} />
              <input type="hidden" name="content" value={cell} />
              <button
                type="submit"
                disabled={done}
                className={`flex min-h-16 w-full touch-manipulation items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors active:bg-secondary disabled:opacity-100 ${
                  done ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "bg-card"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : null}
                <span>{cell}</span>
              </button>
            </form>
          );
        })}
      </div>
    );
  }

  if (definition.input === "photo") {
    return <GamePhotoForm eventId={eventId} slug={slug} gameType={definition.type} maxFileSizeMb={maxFileSizeMb} />;
  }

  if (definition.input === "vote") {
    if (hasVoted) {
      return (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          <ThumbsUp className="h-4 w-4 shrink-0" />
          Ваш голос учтён
        </div>
      );
    }

    if (photos.length === 0) {
      return <p className="text-sm text-muted-foreground">Фотографии появятся, когда гости их загрузят.</p>;
    }

    return (
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <form action={voteForPhotoAction} key={photo.id} className="overflow-hidden rounded-lg border bg-card">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="uploadId" value={photo.id} />
            <div className="relative aspect-square bg-muted">
              {photo.signedUrl ? (
                <Image src={photo.signedUrl} alt="" fill className="object-cover" sizes="50vw" />
              ) : null}
            </div>
            <div className="space-y-2 p-2">
              <p className="truncate text-xs text-muted-foreground">{photo.guestName}</p>
              <Button type="submit" size="sm" variant="outline" className="w-full">
                <ThumbsUp className="h-4 w-4" />
                Голос
              </Button>
            </div>
          </form>
        ))}
      </div>
    );
  }

  return null;
}
