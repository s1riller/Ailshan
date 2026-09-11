"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Pencil, Plus, RotateCcw, Trophy, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function GamesAdminPanel({ eventId, teams, games, pendingEntries, hasQuiz }: GamesAdminPanelProps) {
  const enabledCount = games.filter((game) => game.isEnabled).length;
  const totalPoints = teams.reduce((sum, team) => sum + team.total, 0);

  return (
    <div className="space-y-5">
      {!hasQuiz ? (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardHeader>
            <CardTitle className="text-base">Сначала создайте квиз</CardTitle>
            <CardDescription>
              Команды конкурса живут внутри квиза: гости вступают в них по коду, и именно командам
              начисляются баллы за мини-игры. Создайте квиз выше — даже без вопросов он нужен как список команд.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Игр открыто</div>
            <div className="text-2xl font-semibold sm:text-3xl">
              {enabledCount} <span className="text-base font-normal text-muted-foreground">из {games.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Команд</div>
            <div className="text-2xl font-semibold sm:text-3xl">{teams.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Баллов разыграно</div>
            <div className="text-2xl font-semibold sm:text-3xl">{totalPoints}</div>
          </CardContent>
        </Card>
      </div>

      {pendingEntries.length > 0 ? (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Ждут подтверждения
              <Badge>{pendingEntries.length}</Badge>
            </CardTitle>
            <CardDescription>Творческие задания начисляют баллы только после вашего подтверждения.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingEntries.map((entry) => (
              <ModerationRow key={entry.id} eventId={eventId} entry={entry} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Таблица конкурса
          </CardTitle>
          <CardDescription>Сумма баллов за квиз, мини-игры и конкурсы в зале.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {teams.map((team, index) => (
            <div key={team.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{index + 1}</span>
                  <span className="font-medium">{team.name}</span>
                  {index === 0 && team.total > 0 ? <Trophy className="h-4 w-4 text-amber-500" /> : null}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Квиз {team.quizPoints} · Игры {team.gamePoints + team.votePoints} · Зал {team.bonusPoints} ·{" "}
                  {team.members} участников · код {team.joinCode}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{team.total}</Badge>
                <AwardPointsDialog eventId={eventId} team={team} />
              </div>
            </div>
          ))}
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Команды появятся, когда гости откроют ссылку конкурса и вступят в них.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Мини-игры</CardTitle>
          <CardDescription>
            Включайте игры по ходу вечера — гости видят только открытые. Настройки можно менять на лету.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {games.map((game) => (
            <GameConfigCard key={game.gameType} eventId={eventId} config={game} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Сброс результатов</CardTitle>
          <CardDescription>
            Удаляет все результаты мини-игр и голоса. Команды, вопросы и настройки игр останутся.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive sm:w-auto">
                <RotateCcw className="h-4 w-4" />
                Обнулить баллы мини-игр
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Обнулить результаты?</DialogTitle>
                <DialogDescription>
                  Все ответы в мини-играх и голоса за фото будут удалены без возможности восстановления.
                  Баллы за квиз не затрагиваются.
                </DialogDescription>
              </DialogHeader>
              <form action={resetContestScoresAction}>
                <input type="hidden" name="eventId" value={eventId} />
                <DialogFooter>
                  <Button type="submit" variant="destructive">
                    <RotateCcw className="h-4 w-4" />
                    Обнулить
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

function ModerationRow({ eventId, entry }: { eventId: string; entry: PendingEntry }) {
  return (
    <article className="rounded-lg border bg-card p-3">
      <div className="flex gap-3">
        {entry.photoUrl ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
            <Image src={entry.photoUrl} alt="" fill className="object-cover" sizes="80px" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{gameLabel(entry.gameType)}</Badge>
            <span className="text-sm font-medium">{entry.teamName}</span>
            <span className="text-xs text-muted-foreground">{entry.guestName}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{entry.content}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:flex sm:items-end">
        <form action={moderateGameEntryAction} className="flex flex-1 items-end gap-2">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="entryId" value={entry.id} />
          <input type="hidden" name="status" value="approved" />
          <div className="w-24 space-y-1">
            <Label className="text-xs">Баллы</Label>
            <Input name="score" type="number" min="0" max="1000" defaultValue={entry.score} />
          </div>
          <Button type="submit" className="flex-1 sm:flex-none">
            <Check className="h-4 w-4" />
            Засчитать
          </Button>
        </form>
        <form action={moderateGameEntryAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="entryId" value={entry.id} />
          <input type="hidden" name="status" value="rejected" />
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            <X className="h-4 w-4" />
            Отклонить
          </Button>
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
            <Button type="submit">Начислить</Button>
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
    <div className={`rounded-lg border p-4 ${config.isEnabled ? "border-primary bg-secondary/30" : "bg-card"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-medium">{config.title}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{definition.description}</p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {config.points} б.
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {config.requiresApproval ? <Badge variant="outline">С подтверждением</Badge> : <Badge variant="outline">Автобаллы</Badge>}
        {needsMoreOptions ? <Badge variant="destructive">Нужны варианты</Badge> : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
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
                  <p className="text-xs text-muted-foreground">Пустые строки не сохраняются. Максимум 12.</p>
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
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:h-10"
                  >
                    {/* Только уже сохранённые варианты: иначе можно выбрать несуществующий и не сохранить игру */}
                    {config.options.map((option, index) => (
                      <option key={option} value={index}>
                        Вариант {index + 1} — {option}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Новые варианты появятся в этом списке после сохранения.
                  </p>
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

              <label className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm">
                <input
                  type="checkbox"
                  name="requiresApproval"
                  defaultChecked={config.requiresApproval}
                  className="mt-1 h-5 w-5"
                />
                <span>
                  <span className="block font-medium">Подтверждать вручную</span>
                  <span className="text-muted-foreground">Баллы начислятся только после вашей проверки ответа.</span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm">
                <input type="checkbox" name="isEnabled" defaultChecked={config.isEnabled} className="mt-1 h-5 w-5" />
                <span>
                  <span className="block font-medium">Игра открыта гостям</span>
                  <span className="text-muted-foreground">Появится на странице конкурса сразу после сохранения.</span>
                </span>
              </label>

              <DialogFooter>
                <Button type="submit">Сохранить</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <form action={toggleGameAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="gameType" value={definition.type} />
          <input type="hidden" name="isEnabled" value={config.isEnabled ? "false" : "true"} />
          <Button
            type="submit"
            size="sm"
            variant={config.isEnabled ? "secondary" : "default"}
            className="w-full"
            disabled={needsMoreOptions && !config.isEnabled}
          >
            {config.isEnabled ? "Закрыть" : "Открыть"}
          </Button>
        </form>
      </div>
    </div>
  );
}
