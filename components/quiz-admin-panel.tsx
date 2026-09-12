import Link from "next/link";
import { BellRing, CirclePlay, ExternalLink, Pencil, Plus, RotateCcw, Square, Trash2, Users } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { QuizCountdown } from "@/components/quiz-countdown";
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
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  addQuizQuestionAction,
  createQuizAction,
  deleteQuizAction,
  deleteQuizQuestionAction,
  finishQuizAction,
  nextQuizQuestionAction,
  resetQuizAction,
  startQuizAction,
  updateQuizAction,
  updateQuizQuestionAction,
} from "@/lib/actions/quiz";
import { QUIZ_STATUS_LABEL, labelOf } from "@/lib/labels";
import { cn, plural } from "@/lib/utils";

type Quiz = {
  id: string;
  title: string;
  status: "draft" | "countdown" | "active" | "finished";
  starts_at: string | null;
  current_question_index: number;
};

type Question = {
  id: string;
  question_text: string;
  answers: string[];
  correct_answer_index: number;
  points: number;
  position: number;
};

type Team = { id: string; name: string; join_code: string; members: number; score: number };

const selectClassName =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 text-base focus-visible:outline-none sm:h-10 sm:text-sm";

const letter = (index: number) => String.fromCharCode(65 + index);

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

function QuizStatusBadge({ status }: { status: Quiz["status"] }) {
  const variant = status === "active" ? "success" : status === "countdown" ? "warning" : "secondary";

  return (
    <Badge dot variant={variant}>
      {labelOf(QUIZ_STATUS_LABEL, status)}
    </Badge>
  );
}

export function QuizAdminPanel({
  eventId,
  playUrl,
  liveUrl,
  quiz,
  questions,
  teams,
}: {
  eventId: string;
  playUrl: string;
  liveUrl: string;
  quiz: Quiz | null;
  questions: Question[];
  teams: Team[];
}) {
  if (!quiz) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="eyebrow">Квиз</div>
          <CardTitle className="pt-1">Командный квиз</CardTitle>
          <CardDescription>
            Подготовьте вопросы, соберите гостей в команды и объявите старт с обратным отсчётом. Команды квиза участвуют
            и в мини-играх.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createQuizAction} className="space-y-4">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="space-y-2">
              <Label htmlFor="quiz-title">Название</Label>
              <Input id="quiz-title" name="title" defaultValue="Квиз нашего вечера" required />
            </div>
            <SubmitButton pendingText="Создаём…">
              <Plus className="h-4 w-4" />
              Создать квиз
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    );
  }

  const status = quiz.status;
  const editable = status === "draft" || status === "finished";
  const currentQuestion = questions[quiz.current_question_index];
  const rankedTeams = [...teams].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4">
          <SectionHeader
            eyebrow="Квиз"
            title={quiz.title}
            description="Пульт ведущего. Страницы гостей и экран зала обновляются сами."
            aside={
              <div className="flex items-center gap-2">
                {editable ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Переименовать квиз">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Переименовать квиз</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Название квиза</DialogTitle>
                        <DialogDescription>Обновится у ведущего, гостей и на экране зала.</DialogDescription>
                      </DialogHeader>
                      <form action={updateQuizAction} className="space-y-4">
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="quizId" value={quiz.id} />
                        <Input name="title" defaultValue={quiz.title} required aria-label="Название квиза" />
                        <DialogFooter>
                          <SubmitButton pendingText="Сохраняем…">Сохранить</SubmitButton>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                ) : null}
                <QuizStatusBadge status={status} />
              </div>
            }
          />

          {status === "countdown" && quiz.starts_at ? (
            <div className="rounded-xl border bg-card p-5 text-center">
              <div className="eyebrow">До начала</div>
              <QuizCountdown target={quiz.starts_at} className="tabular mt-1 block font-serif text-5xl font-medium" />
            </div>
          ) : null}

          {status === "active" && currentQuestion ? (
            <div className="rounded-xl border bg-card p-4">
              <div className="eyebrow">
                Вопрос {quiz.current_question_index + 1} из {questions.length}
              </div>
              <div className="mt-2 font-serif text-xl font-medium leading-snug">{currentQuestion.question_text}</div>
            </div>
          ) : null}

          {editable && questions.length > 0 ? (
            <form
              action={startQuizAction}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end"
            >
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="quizId" value={quiz.id} />
              <div className="flex-1 space-y-2">
                <Label htmlFor="countdownSeconds">Обратный отсчёт</Label>
                <select id="countdownSeconds" name="countdownSeconds" className={selectClassName}>
                  <option value="10">10 секунд</option>
                  <option value="30">30 секунд</option>
                  <option value="60">1 минута</option>
                  <option value="120">2 минуты</option>
                </select>
              </div>
              <SubmitButton size="lg" pendingText="Объявляем…" className="w-full sm:w-auto">
                <CirclePlay className="h-4 w-4" />
                Объявить старт
              </SubmitButton>
            </form>
          ) : null}

          {editable && questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Добавьте хотя бы один вопрос, и здесь появится кнопка старта.</p>
          ) : null}

          {status === "active" ? (
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <form action={nextQuizQuestionAction}>
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="quizId" value={quiz.id} />
                <SubmitButton size="lg" pendingText="Переключаем…" className="w-full sm:w-auto">
                  {quiz.current_question_index + 1 >= questions.length ? "Показать результаты" : "Следующий вопрос"}
                </SubmitButton>
              </form>
              <form action={finishQuizAction}>
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="quizId" value={quiz.id} />
                <SubmitButton size="lg" variant="outline" pendingText="Завершаем…" className="w-full sm:w-auto">
                  <Square className="h-4 w-4" />
                  Завершить
                </SubmitButton>
              </form>
            </div>
          ) : null}

          {status !== "draft" ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <RotateCcw className="h-4 w-4" />
                  Перезапустить квиз
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Перезапустить квиз?</DialogTitle>
                  <DialogDescription>
                    Ответы и баллы будут очищены. Вопросы, команды и участники сохранятся, а квиз вернётся в режим
                    подготовки.
                  </DialogDescription>
                </DialogHeader>
                <form action={resetQuizAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="quizId" value={quiz.id} />
                  <DialogFooter>
                    <SubmitButton variant="destructive" pendingText="Очищаем…">
                      <RotateCcw className="h-4 w-4" />
                      Очистить результаты
                    </SubmitButton>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Гости"
            title="Подключение"
            description="Откройте ссылку или покажите её рядом с QR-кодом события."
          />
          <code className="block break-all rounded-lg border bg-secondary/60 p-3 text-xs">{playUrl}</code>
          <CopyButton value={playUrl} label="Скопировать ссылку" className="w-full" />
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline">
              <Link href={playUrl} target="_blank">
                <ExternalLink className="h-4 w-4" />
                Как гость
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={liveUrl} target="_blank">
                <ExternalLink className="h-4 w-4" />
                Экран зала
              </Link>
            </Button>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0" />
            Гости нажимают «Сообщить о старте», чтобы телефон напомнил им о начале игры.
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="space-y-4">
          <SectionHeader
            eyebrow="Квиз"
            title="Вопросы"
            description={`${plural(questions.length, "вопрос", "вопроса", "вопросов")} подготовлено. Правильный ответ видит только ведущий.`}
          />

          {editable ? (
            <form action={addQuizQuestionAction} className="space-y-3 rounded-xl border bg-card p-4">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="quizId" value={quiz.id} />
              <div className="space-y-2">
                <Label htmlFor="question">Новый вопрос</Label>
                <Textarea id="question" name="question" required />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[0, 1, 2, 3].map((index) => (
                  <Input
                    key={index}
                    name={`answer${index}`}
                    placeholder={`${letter(index)}. Вариант ответа`}
                    aria-label={`Вариант ${letter(index)}`}
                    required
                  />
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="correctAnswerIndex">Правильный вариант</Label>
                  <select id="correctAnswerIndex" name="correctAnswerIndex" className={selectClassName}>
                    {[0, 1, 2, 3].map((index) => (
                      <option key={index} value={index}>
                        {letter(index)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question-points">Баллы</Label>
                  <Input id="question-points" name="points" type="number" min="1" max="1000" defaultValue="10" required />
                </div>
              </div>
              <SubmitButton variant="outline" pendingText="Добавляем…">
                <Plus className="h-4 w-4" />
                Добавить вопрос
              </SubmitButton>
            </form>
          ) : null}

          <div className="space-y-2">
            {questions.map((question, index) => (
              <div key={question.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="eyebrow">
                      Вопрос {index + 1} · {plural(question.points, "балл", "балла", "баллов")}
                    </div>
                    <div className="mt-1 font-serif text-lg font-medium leading-snug">{question.question_text}</div>
                  </div>
                  {editable ? (
                    <div className="flex shrink-0 items-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Редактировать вопрос">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Редактировать вопрос</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Вопрос {index + 1}</DialogTitle>
                            <DialogDescription>Текст, варианты, правильный ответ и баллы.</DialogDescription>
                          </DialogHeader>
                          <form action={updateQuizQuestionAction} className="space-y-3">
                            <input type="hidden" name="eventId" value={eventId} />
                            <input type="hidden" name="quizId" value={quiz.id} />
                            <input type="hidden" name="questionId" value={question.id} />
                            <Textarea name="question" defaultValue={question.question_text} required aria-label="Вопрос" />
                            {question.answers.map((answer, answerIndex) => (
                              <Input
                                key={answerIndex}
                                name={`answer${answerIndex}`}
                                defaultValue={answer}
                                aria-label={`Вариант ${letter(answerIndex)}`}
                                required
                              />
                            ))}
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor={`correct-${question.id}`}>Правильный вариант</Label>
                                <select
                                  id={`correct-${question.id}`}
                                  name="correctAnswerIndex"
                                  defaultValue={question.correct_answer_index}
                                  className={selectClassName}
                                >
                                  {[0, 1, 2, 3].map((answerIndex) => (
                                    <option key={answerIndex} value={answerIndex}>
                                      {letter(answerIndex)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`points-${question.id}`}>Баллы</Label>
                                <Input
                                  id={`points-${question.id}`}
                                  name="points"
                                  type="number"
                                  min="1"
                                  max="1000"
                                  defaultValue={question.points}
                                  required
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <SubmitButton pendingText="Сохраняем…">Сохранить вопрос</SubmitButton>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <form action={deleteQuizQuestionAction}>
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="quizId" value={quiz.id} />
                        <input type="hidden" name="questionId" value={question.id} />
                        <SubmitButton variant="ghost" size="icon" title="Удалить вопрос" pendingText="">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Удалить вопрос</span>
                        </SubmitButton>
                      </form>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                  {question.answers.map((answer, answerIndex) => (
                    <div
                      key={answerIndex}
                      className={cn(
                        "flex items-center gap-2",
                        answerIndex === question.correct_answer_index ? "font-medium text-accent" : "text-muted-foreground",
                      )}
                    >
                      {answerIndex === question.correct_answer_index ? (
                        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      ) : (
                        <span aria-hidden className="h-1.5 w-1.5 shrink-0" />
                      )}
                      {letter(answerIndex)}. {answer}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {questions.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Добавьте первый вопрос — после этого можно будет объявить старт.
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Квиз"
            title="Команды"
            description="Гости создают команды сами и делятся кодом с участниками."
          />
          {rankedTeams.length > 0 ? (
            <div className="divide-y rounded-xl border bg-card">
              {rankedTeams.map((team, index) => (
                <div key={team.id} className="flex items-center justify-between gap-3 p-3 sm:px-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="tabular w-5 text-sm text-muted-foreground">{index + 1}</span>
                      <span className="truncate font-serif text-lg font-medium leading-tight">{team.name}</span>
                      {index === 0 && team.score > 0 ? (
                        <Badge variant="accent" dot>
                          Лидер
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center gap-3 pl-8 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {team.members}
                      </span>
                      <span>
                        Код <strong className="tabular font-medium text-foreground">{team.join_code}</strong>
                      </span>
                    </div>
                  </div>
                  <span className="font-serif tabular text-2xl font-medium">{team.score}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Команды появятся, когда гости откроют ссылку квиза.
            </div>
          )}
          {editable ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4" />
                  Удалить квиз
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Удалить квиз полностью?</DialogTitle>
                  <DialogDescription>
                    Будут удалены вопросы, команды, участники и все результаты. Это действие нельзя отменить.
                  </DialogDescription>
                </DialogHeader>
                <form action={deleteQuizAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="quizId" value={quiz.id} />
                  <DialogFooter>
                    <SubmitButton variant="destructive" pendingText="Удаляем…">
                      Удалить квиз
                    </SubmitButton>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </section>
      </div>
    </div>
  );
}
