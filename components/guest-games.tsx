import { Check, ChevronDown } from "lucide-react";

import { ContestPhotoVote, type VotablePhoto } from "@/components/contest-photo-vote";
import { GamePhotoForm } from "@/components/game-photo-form";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { submitGameEntryAction } from "@/lib/actions/games";
import { pickTaskForTeam } from "@/lib/games/catalog";
import type { ContestEntry, ResolvedGame } from "@/lib/games/contest";
import { plural } from "@/lib/utils";

export type { VotablePhoto };

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

type GameState = "open" | "done" | "host";

type GameRow = {
  game: ResolvedGame;
  entries: ContestEntry[];
  earned: number;
  pendingCount: number;
  rejectedCount: number;
  state: GameState;
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

function buildRows(games: ResolvedGame[], teamEntries: ContestEntry[], hasVoted: boolean): GameRow[] {
  const rows = games.map<GameRow>((game) => {
    const { definition } = game;
    const entries = teamEntries.filter((entry) => entry.gameType === definition.type);
    const earned = entries.filter((entry) => entry.status === "approved").reduce((sum, entry) => sum + entry.score, 0);
    const pendingCount = entries.filter((entry) => entry.status === "pending").length;
    const rejectedCount = entries.filter((entry) => entry.status === "rejected").length;

    let state: GameState = "open";
    if (definition.input === "host") state = "host";
    else if (definition.input === "vote" ? hasVoted : !definition.allowsMultipleEntries && entries.length > 0) state = "done";

    return { game, entries, earned, pendingCount, rejectedCount, state };
  });

  // Сначала то, во что можно играть, затем сыгранное, в конце конкурсы в зале
  const order: Record<GameState, number> = { open: 0, done: 1, host: 2 };
  return rows.sort((a, b) => order[a.state] - order[b.state]);
}

/** Чип статуса справа в строке игры; для открытой игры — только баллы */
function GameStatus({ row }: { row: GameRow }) {
  const { state, earned, pendingCount, rejectedCount, entries, game } = row;
  const points = game.config.points;

  if (earned > 0) {
    return (
      <Badge dot variant="success" className="tabular">
        +{earned}
      </Badge>
    );
  }
  if (pendingCount > 0) {
    return (
      <Badge dot variant="warning">
        На проверке
      </Badge>
    );
  }
  if (rejectedCount > 0 && entries.length === rejectedCount && state === "done") {
    return (
      <Badge dot variant="destructive">
        Не засчитано
      </Badge>
    );
  }
  if (state === "host") {
    return <Badge variant="secondary">В зале</Badge>;
  }
  if (state === "done") {
    // Ответ проверен и оказался неверным: команда участвовала, но без баллов
    const checkedWithoutPoints = game.definition.hasCorrectOption && entries.some((entry) => entry.status === "approved");
    return <Badge variant="secondary">{checkedWithoutPoints ? "Без баллов" : "Сыграно"}</Badge>;
  }

  return <span className="tabular text-sm text-muted-foreground">{points} б.</span>;
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

  if (!teamId) {
    return (
      <p className="text-sm text-muted-foreground">
        {plural(games.length, "игра откроется", "игры откроются", "игр откроются")} после вступления в команду.
      </p>
    );
  }

  const rows = buildRows(games, teamEntries, hasVoted);
  const firstOpenIndex = rows.findIndex((row) => row.state === "open");
  const openCount = rows.filter((row) => row.state === "open").length;

  return (
    <section className="space-y-3" aria-labelledby="games-heading">
      <div className="flex items-end justify-between gap-3 border-b pb-3">
        <div>
          <div className="eyebrow">Игры</div>
          <h2 id="games-heading" className="font-serif text-2xl font-medium">
            {openCount > 0 ? `${plural(openCount, "игра открыта", "игры открыты", "игр открыто")}` : "Все игры сыграны"}
          </h2>
        </div>
      </div>

      <ul className="divide-y">
        {rows.map((row, index) => {
          const { game, state } = row;
          const number = String(index + 1).padStart(2, "0");

          if (state === "host") {
            return (
              <li key={game.definition.type} className="flex min-h-14 items-center gap-3 py-3">
                <span className="font-serif tabular w-7 shrink-0 text-lg text-muted-foreground">{number}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{game.config.title}</div>
                  <div className="truncate text-xs text-muted-foreground">Баллы начисляет ведущий</div>
                </div>
                <GameStatus row={row} />
              </li>
            );
          }

          return (
            <li key={game.definition.type}>
              {/* Ключ со статусом: сыгранная игра перемонтируется закрытой, а не остаётся раскрытой после ответа */}
              <details key={`${game.definition.type}-${state}`} className="group" open={index === firstOpenIndex}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="font-serif tabular w-7 shrink-0 text-lg text-muted-foreground">{number}</span>
                  <span className={`min-w-0 flex-1 truncate font-medium ${state === "done" ? "text-muted-foreground" : ""}`}>
                    {game.config.title}
                  </span>
                  <GameStatus row={row} />
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-3 pb-5 pl-10">
                  {game.config.prompt ? <p className="font-serif text-lg leading-snug">{game.config.prompt}</p> : null}
                  {state === "done" ? (
                    <DoneSummary row={row} />
                  ) : (
                    <GameForm
                      eventId={eventId}
                      slug={slug}
                      game={game}
                      teamId={teamId}
                      entries={row.entries}
                      photos={photos}
                      maxFileSizeMb={maxFileSizeMb}
                    />
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DoneSummary({ row }: { row: GameRow }) {
  const { game, entries, pendingCount, rejectedCount } = row;
  const answer = entries[0]?.content;

  if (game.definition.input === "vote") {
    return <p className="text-sm text-muted-foreground">Ваш голос учтён.</p>;
  }

  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      {answer ? <p>Ответ команды: «{answer}»</p> : <p>Команда уже участвовала.</p>}
      {pendingCount > 0 ? <p>Ведущий проверит ответ и начислит баллы.</p> : null}
      {rejectedCount > 0 && pendingCount === 0 ? <p>Ведущий не засчитал этот ответ.</p> : null}
    </div>
  );
}

function ChoiceOptions({ options }: { options: string[] }) {
  return (
    <div className="grid gap-2">
      {options.map((option, index) => (
        <label
          key={`${index}-${option}`}
          className="flex min-h-14 cursor-pointer touch-manipulation items-center gap-3 rounded-lg border bg-card px-4 py-2 text-base transition-colors active:bg-secondary has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
        >
          <input type="radio" name="optionIndex" value={index} required className="peer sr-only" />
          <span
            aria-hidden
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-input bg-card transition-colors peer-checked:border-accent peer-checked:bg-accent"
          >
            <span className="h-2 w-2 rounded-full bg-card" />
          </span>
          <span className="font-medium">{option}</span>
        </label>
      ))}
    </div>
  );
}

function GameForm({
  eventId,
  slug,
  game,
  teamId,
  entries,
  photos,
  maxFileSizeMb,
}: {
  eventId: string;
  slug: string;
  game: ResolvedGame;
  teamId: string;
  entries: ContestEntry[];
  photos: VotablePhoto[];
  maxFileSizeMb: number;
}) {
  const { definition, config } = game;

  if (definition.input === "text") {
    return (
      <form action={submitGameEntryAction} className="space-y-3">
        <HiddenGameFields eventId={eventId} slug={slug} gameType={definition.type} />
        <Textarea name="content" required placeholder="Ответ команды" className="min-h-24" maxLength={800} />
        <SubmitButton className="h-12 w-full text-base">Отправить ответ</SubmitButton>
      </form>
    );
  }

  if (definition.input === "choice") {
    return (
      <form action={submitGameEntryAction} className="space-y-3">
        <HiddenGameFields eventId={eventId} slug={slug} gameType={definition.type} />
        <ChoiceOptions options={config.options} />
        <SubmitButton className="h-12 w-full text-base">Ответить от команды</SubmitButton>
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
        <div className="rounded-lg border bg-secondary/60 p-4">
          <div className="eyebrow">Задание команды</div>
          <p className="mt-1 font-serif text-lg leading-snug">{task}</p>
        </div>
        <Textarea name="content" required placeholder="Расскажите, как выполнили задание" className="min-h-20" maxLength={800} />
        <SubmitButton className="h-12 w-full text-base">Отправить на проверку</SubmitButton>
      </form>
    );
  }

  if (definition.input === "bingo") {
    const cellStatus = new Map<string, ContestEntry["status"]>();
    for (const entry of entries) {
      const cell = String((entry.metadata as Record<string, unknown>).cell ?? "");
      if (cell) cellStatus.set(cell, entry.status);
    }

    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {config.options.map((cell) => {
          const status = cellStatus.get(cell);
          const done = status !== undefined;

          if (done) {
            return (
              <div
                key={cell}
                className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 py-2 text-sm ${
                  status === "rejected"
                    ? "border-destructive/30 text-muted-foreground line-through"
                    : status === "pending"
                      ? "border-warning/30 bg-warning-soft"
                      : "border-accent/40 bg-accent-soft"
                }`}
              >
                <Check className={`h-4 w-4 shrink-0 ${status === "pending" ? "text-warning" : "text-accent"}`} />
                <span className="flex-1">{cell}</span>
                {status === "pending" ? <span className="text-xs text-warning">На проверке</span> : null}
              </div>
            );
          }

          return (
            <form action={submitGameEntryAction} key={cell}>
              <HiddenGameFields eventId={eventId} slug={slug} gameType={definition.type} />
              <input type="hidden" name="meta_cell" value={cell} />
              <input type="hidden" name="content" value={cell} />
              <SubmitButton
                variant="outline"
                pendingText="Отмечаем…"
                className="h-auto min-h-14 w-full justify-start whitespace-normal px-4 py-2 text-left text-sm font-normal"
              >
                <span className="h-4 w-4 shrink-0 rounded-full border border-input" aria-hidden />
                {cell}
              </SubmitButton>
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
    if (photos.length === 0) {
      return <p className="text-sm text-muted-foreground">Снимки появятся, когда гости их загрузят, а организатор одобрит.</p>;
    }

    return <ContestPhotoVote eventId={eventId} slug={slug} photos={photos} />;
  }

  return null;
}
