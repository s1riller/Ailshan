"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Pencil, Plus, RotateCcw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  awardTeamPointsAction,
  moderateGameEntryAction,
  resetContestScoresAction,
  saveGameConfigAction,
  toggleGameAction,
} from "@/lib/actions/games";
import { gameLabel, getGameDefinition } from "@/lib/games/catalog";
import type { ContestGameConfig, ContestTeam } from "@/lib/games/contest";
import { cn, plural } from "@/lib/utils";

export type PendingEntry = {
  id: string;
  gameType: string;
  guestName: string;
  teamName: string;
  content: string;
  score: number;
  createdAt: string;
  photoUrl: string | null;
};

type GamesAdminPanelProps = {
  eventId: string;
  teams: ContestTeam[];
  /**
   * Только данные игры. Описание из каталога (в нём лежит компонент иконки)
   * клиент достаёт сам: функции через границу сервер-клиент не сериализуются.
   */
  games: ContestGameConfig[];
  pendingEntries: PendingEntry[];
  hasQuiz: boolean;
};

/** Заголовок раздела: капитель, серифный заголовок, тонкая линия снизу */
function SectionHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 border-b pb-3">
      <div className="min-w-0">
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-1 font-serif text-2xl font-medium leading-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

export function GamesAdminPanel({ eventId, teams, games, pendingEntries, hasQuiz }: GamesAdminPanelProps) {
  const enabledCount = games.filter((game) => game.isEnabled).length;
  const totalPoints = teams.reduce((sum, team) => sum + team.total, 0);

  return (
    <div className="space-y-8">
      {!hasQuiz ? (
        <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm">
          <p className="font-medium text-warning">Сначала создайте квиз</p>
          <p className="mt-1 text-foreground">
            Команды конкурса живут внутри квиза: гости вступают в них по коду, и именно командам начисляются баллы за
            мини-игры. Квиз нужен даже без вопросов: он хранит команды.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="eyebrow">Открыто</div>
            <div className="mt-2 font-serif tabular text-3xl font-medium">
              {enabledCount}
              <span className="text-lg text-muted-foreground"> из {games.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="eyebrow">Команд</div>
            <div className="mt-2 font-serif tabular text-3xl font-medium">{teams.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="eyebrow">Баллов</div>
            <div className="mt-2 font-serif tabular text-3xl font-medium">{totalPoints}</div>
          </CardContent>
        </Card>
      </div>

      {pendingEntries.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader
            eyebrow="Конкурс"
            title={
              <span className="inline-flex items-center gap-2">
                Ждут подтверждения
                <Badge variant="warning" className="font-sans">
                  {pendingEntries.length}
                </Badge>
              </span>
            }
            description="Творческие задания начисляют баллы только после вашего подтверждения."
          />
          <div className="space-y-3">
            {pendingEntries.map((entry) => (
              <ModerationRow key={entry.id} eventId={eventId} entry={entry} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Конкурс"
          title="Таблица команд"
          description="Сумма баллов за квиз, мини-игры и конкурсы в зале."
        />
        {teams.length > 0 ? (
          <div className="divide-y rounded-xl border bg-card">
            {teams.map((team, index) => (
              <div key={team.id} className="flex items-start justify-between gap-3 p-3 sm:items-center sm:px-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="tabular w-5 text-sm text-muted-foreground">{index + 1}</span>
                    <span className="font-serif text-lg font-medium leading-tight">{team.name}</span>
                    {index === 0 && team.total > 0 ? (
                      <Badge variant="accent" dot>
                        Лидер
                      </Badge>
                    ) : null}
                  </div>
                  <div className="tabular mt-1 pl-8 text-xs text-muted-foreground">
                    Квиз {team.quizPoints} · Игры {team.gamePoints + team.votePoints} · Зал {team.bonusPoints} ·{" "}
                    {plural(team.members, "участник", "участника", "участников")} · код {team.joinCode}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-serif tabular text-2xl font-medium">{team.total}</span>
                  <AwardPointsDialog eventId={eventId} team={team} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Команды появятся, когда гости откроют ссылку конкурса и вступят в них.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Конкурс"
          title="Мини-игры"
          description="Открывайте игры по ходу вечера — гости видят только открытые. Настройки можно менять на лету."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {games.map((game) => (
            <GameConfigCard key={game.gameType} eventId={eventId} config={game} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Служебное"
          title="Сброс результатов"
          description="Удаляет результаты мини-игр и голоса. Команды, вопросы и настройки игр останутся."
        />
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4" />
              Обнулить баллы мини-игр
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Обнулить результаты?</DialogTitle>
              <DialogDescription>
                Ответы в мини-играх и голоса за фото будут удалены без возможности восстановления. Баллы за квиз
                останутся.
              </DialogDescription>
            </DialogHeader>
            <form action={resetContestScoresAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <DialogFooter>
                <SubmitButton variant="destructive" pendingText="Обнуляем…">
                  <RotateCcw className="h-4 w-4" />
                  Обнулить
                </SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}

function ModerationRow({ eventId, entry }: { eventId: string; entry: PendingEntry }) {
  return (
    <article className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex gap-3">
        {entry.photoUrl ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-secondary">
            <Image src={entry.photoUrl} alt="" fill className="object-cover" sizes="80px" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{gameLabel(entry.gameType)}</Badge>
            <span className="text-sm font-medium">{entry.teamName}</span>
            <span className="text-xs text-muted-foreground">{entry.guestName}</span>
          </div>
          {entry.content ? <p className="mt-2 font-serif text-base leading-snug">{entry.content}</p> : null}
        </div>
      </div>
      <div className="mt-3 grid gap-2 border-t pt-3 sm:flex sm:items-end">
        <form action={moderateGameEntryAction} className="flex flex-1 items-end gap-2">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="entryId" value={entry.id} />
          <input type="hidden" name="status" value="approved" />
          <div className="w-24 space-y-1">
            <Label htmlFor={`score-${entry.id}`} className="text-xs">
              Баллы
            </Label>
            <Input id={`score-${entry.id}`} name="score" type="number" min="0" max="1000" defaultValue={entry.score} />
          </div>
          <SubmitButton pendingText="Засчитываем…" className="flex-1 sm:flex-none">
            <Check className="h-4 w-4" />
            Засчитать
          </SubmitButton>
        </form>
        <form action={moderateGameEntryAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="entryId" value={entry.id} />
          <input type="hidden" name="status" value="rejected" />
          <SubmitButton variant="outline" pendingText="Отклоняем…" className="w-full sm:w-auto">
            <X className="h-4 w-4" />
            Отклонить
          </SubmitButton>
        </form>
      </div>
    </article>
  );
}

function AwardPointsDialog({ eventId, team }: { eventId: string; team: ContestTeam }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Начислить баллы">
          <Plus className="h-4 w-4" />
          Баллы
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Баллы команде «{team.name}»</DialogTitle>
          <DialogDescription>За конкурс в зале, который проходит вне телефона.</DialogDescription>
        </DialogHeader>
        <form action={awardTeamPointsAction} className="space-y-3">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="teamId" value={team.id} />
          <div className="space-y-2">
            <Label htmlFor={`points-${team.id}`}>Сколько баллов</Label>
            <Input id={`points-${team.id}`} name="points" type="number" min="1" max="1000" defaultValue="30" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`reason-${team.id}`}>За что</Label>
            <Input id={`reason-${team.id}`} name="reason" placeholder="Победа в конкурсе с шарами" maxLength={200} />
          </div>
          <DialogFooter>
            <SubmitButton pendingText="Начисляем…">Начислить</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GameConfigCard({ eventId, config }: { eventId: string; config: ContestGameConfig }) {
  const definition = getGameDefinition(config.gameType);
  const [open, setOpen] = useState(false);

  // Игра, которой нет в каталоге, показывать нечем — например, после отката кода
  if (!definition) return null;

  const Icon = definition.icon;
  const needsMoreOptions = definition.needsOptions && config.options.length < 2;

  return (
    <div className={cn("flex flex-col rounded-xl border bg-card p-4", config.isEnabled && "border-accent")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4 shrink-0", config.isEnabled ? "text-accent" : "text-muted-foreground")} />
            <span className="font-serif text-lg font-medium leading-tight">{config.title}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{definition.description}</p>
        </div>
        <Badge variant="secondary" className="tabular shrink-0">
          {plural(config.points, "балл", "балла", "баллов")}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {config.requiresApproval ? (
          <Badge variant="outline">С подтверждением</Badge>
        ) : (
          <Badge variant="outline">Баллы сразу</Badge>
        )}
        {needsMoreOptions ? (
          <Badge variant="warning" dot>
            Нужны варианты
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4" />
              Настроить
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{definition.label}</DialogTitle>
              <DialogDescription>{definition.description}</DialogDescription>
            </DialogHeader>
            <form action={saveGameConfigAction} className="space-y-3" onSubmit={() => setOpen(false)}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="gameType" value={definition.type} />

              <div className="space-y-2">
                <Label htmlFor={`title-${definition.type}`}>Название для гостей</Label>
                <Input id={`title-${definition.type}`} name="title" defaultValue={config.title} required maxLength={120} />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`prompt-${definition.type}`}>Текст задания</Label>
                <Textarea
                  id={`prompt-${definition.type}`}
                  name="prompt"
                  defaultValue={config.prompt}
                  className="min-h-20"
                  maxLength={600}
                />
              </div>

              {definition.needsOptions ? (
                <div className="space-y-2">
                  <Label>{definition.optionsLabel ?? "Варианты"}</Label>
                  <p className="text-xs text-muted-foreground">Пустые строки не сохраняются. Не больше 12.</p>
                  {Array.from({ length: Math.min(12, Math.max(4, config.options.length + 1)) }).map((_, index) => (
                    <Input
                      key={index}
                      name="options"
                      defaultValue={config.options[index] ?? ""}
                      placeholder={`Вариант ${index + 1}`}
                      maxLength={200}
                    />
                  ))}
                </div>
              ) : null}

              {definition.hasCorrectOption ? (
                <div className="space-y-2">
                  <Label htmlFor={`correct-${definition.type}`}>Правильный вариант</Label>
                  <select
                    id={`correct-${definition.type}`}
                    name="correctOption"
                    defaultValue={config.correctOption ?? 0}
                    className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base sm:h-10 sm:text-sm"
                  >
                    {/* Только уже сохранённые варианты: иначе можно выбрать несуществующий и не сохранить игру */}
                    {config.options.map((option, index) => (
                      <option key={`${index}-${option}`} value={index}>
                        Вариант {index + 1} — {option}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Новые варианты появятся в этом списке после сохранения.</p>
                </div>
              ) : (
                <input type="hidden" name="correctOption" value="" />
              )}

              <div className="space-y-2">
                <Label htmlFor={`points-${definition.type}`}>Баллы за участие</Label>
                <Input
                  id={`points-${definition.type}`}
                  name="points"
                  type="number"
                  min="0"
                  max="1000"
                  defaultValue={config.points}
                  required
                />
              </div>

              <label className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm">
                <input
                  type="checkbox"
                  name="requiresApproval"
                  defaultChecked={config.requiresApproval}
                  className="mt-0.5 h-5 w-5 rounded border-input"
                />
                <span>
                  <span className="block font-medium">Подтверждать вручную</span>
                  <span className="text-muted-foreground">Баллы начислятся только после вашей проверки ответа.</span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm">
                <input
                  type="checkbox"
                  name="isEnabled"
                  defaultChecked={config.isEnabled}
                  className="mt-0.5 h-5 w-5 rounded border-input"
                />
                <span>
                  <span className="block font-medium">Игра открыта гостям</span>
                  <span className="text-muted-foreground">Появится на странице конкурса сразу после сохранения.</span>
                </span>
              </label>

              <DialogFooter>
                <SubmitButton pendingText="Сохраняем…">Сохранить</SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Переключатель «открыта / закрыта»: точка шалфея означает, что игру видят гости */}
        <form action={toggleGameAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="gameType" value={definition.type} />
          <input type="hidden" name="isEnabled" value={config.isEnabled ? "false" : "true"} />
          <SubmitButton
            size="sm"
            variant="outline"
            pendingText={config.isEnabled ? "Закрываем…" : "Открываем…"}
            aria-pressed={config.isEnabled}
            title={config.isEnabled ? "Закрыть игру для гостей" : "Открыть игру гостям"}
            className={cn("w-full", config.isEnabled && "border-accent bg-accent-soft text-accent hover:bg-accent-soft")}
            disabled={needsMoreOptions && !config.isEnabled}
          >
            <span
              aria-hidden
              className={cn("h-2 w-2 shrink-0 rounded-full", config.isEnabled ? "bg-accent" : "bg-muted-foreground/40")}
            />
            {config.isEnabled ? "Открыта гостям" : "Закрыта"}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
