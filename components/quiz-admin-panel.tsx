import Link from "next/link";
import { BellRing, CirclePlay, ExternalLink, Plus, RotateCcw, Square, Trash2, Trophy, Users } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { QuizCountdown } from "@/components/quiz-countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addQuizQuestionAction,
  createQuizAction,
  deleteQuizQuestionAction,
  finishQuizAction,
  nextQuizQuestionAction,
  resetQuizAction,
  startQuizAction,
} from "@/lib/actions/quiz";

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

const statusLabels = {
  draft: "Подготовка",
  countdown: "Обратный отсчёт",
  active: "Идёт игра",
  finished: "Завершён",
};

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
          <CardTitle>Создать командный квиз</CardTitle>
          <CardDescription>Подготовьте вопросы, соберите гостей в команды и объявите старт с обратным отсчётом.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createQuizAction} className="space-y-4">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="space-y-2">
              <Label htmlFor="quiz-title">Название</Label>
              <Input id="quiz-title" name="title" defaultValue="Квиз нашего вечера" required />
            </div>
            <Button type="submit"><Plus className="h-4 w-4" />Создать квиз</Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  const effectiveStatus = quiz.status;
  const currentQuestion = questions[quiz.current_question_index];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{quiz.title}</CardTitle>
                <CardDescription>Пульт ведущего. Гостевые страницы обновляются автоматически.</CardDescription>
              </div>
              <Badge variant={effectiveStatus === "active" ? "default" : "secondary"}>{statusLabels[effectiveStatus]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {quiz.status === "countdown" && quiz.starts_at ? (
              <div className="rounded-md border bg-muted/40 p-5 text-center">
                <div className="text-sm text-muted-foreground">До начала</div>
                <QuizCountdown target={quiz.starts_at} className="mt-1 block text-5xl font-semibold" />
              </div>
            ) : null}

            {effectiveStatus === "active" && currentQuestion ? (
              <div className="rounded-md border p-4">
                <div className="text-xs font-medium uppercase text-muted-foreground">Вопрос {quiz.current_question_index + 1} из {questions.length}</div>
                <div className="mt-2 text-lg font-semibold">{currentQuestion.question_text}</div>
              </div>
            ) : null}

            {(quiz.status === "draft" || quiz.status === "finished") && questions.length > 0 ? (
              <form action={startQuizAction} className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-end">
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="quizId" value={quiz.id} />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="countdownSeconds">Обратный отсчёт</Label>
                  <select id="countdownSeconds" name="countdownSeconds" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="10">10 секунд</option>
                    <option value="30">30 секунд</option>
                    <option value="60">1 минута</option>
                    <option value="120">2 минуты</option>
                  </select>
                </div>
                <Button type="submit"><CirclePlay className="h-4 w-4" />Объявить старт</Button>
              </form>
            ) : null}

            {effectiveStatus === "active" ? (
              <div className="flex flex-wrap gap-2">
                <form action={nextQuizQuestionAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="quizId" value={quiz.id} />
                  <Button type="submit">{quiz.current_question_index + 1 >= questions.length ? "Показать результаты" : "Следующий вопрос"}</Button>
                </form>
                <form action={finishQuizAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="quizId" value={quiz.id} />
                  <Button type="submit" variant="outline"><Square className="h-4 w-4" />Завершить</Button>
                </form>
              </div>
            ) : null}

            {quiz.status === "finished" ? (
              <form action={resetQuizAction}>
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="quizId" value={quiz.id} />
                <Button type="submit" variant="outline"><RotateCcw className="h-4 w-4" />Вернуть в подготовку</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Подключение гостей</CardTitle><CardDescription>Откройте ссылку или покажите её рядом с QR-кодом мероприятия.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <code className="block break-all rounded-md border bg-muted/40 p-3 text-xs">{playUrl}</code>
            <CopyButton value={playUrl} label="Скопировать ссылку квиза" />
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline"><Link href={playUrl} target="_blank"><ExternalLink className="h-4 w-4" />Гость</Link></Button>
              <Button asChild variant="outline"><Link href={liveUrl} target="_blank"><ExternalLink className="h-4 w-4" />Live</Link></Button>
            </div>
            <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0" />
              Гости нажимают «Сообщить о старте», чтобы браузер показал уведомление.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Вопросы</CardTitle><CardDescription>{questions.length} подготовлено. Правильный ответ видит только ведущий.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {(quiz.status === "draft" || quiz.status === "finished") ? (
              <form action={addQuizQuestionAction} className="space-y-3 rounded-md border p-4">
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="quizId" value={quiz.id} />
                <div className="space-y-2"><Label htmlFor="question">Новый вопрос</Label><Textarea id="question" name="question" required /></div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((index) => <Input key={index} name={`answer${index}`} placeholder={`${String.fromCharCode(65 + index)}. Вариант ответа`} required />)}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Правильный вариант</Label><select name="correctAnswerIndex" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{[0, 1, 2, 3].map((index) => <option key={index} value={index}>{String.fromCharCode(65 + index)}</option>)}</select></div>
                  <div className="space-y-2"><Label>Баллы</Label><Input name="points" type="number" min="1" max="1000" defaultValue="10" required /></div>
                </div>
                <Button type="submit"><Plus className="h-4 w-4" />Добавить вопрос</Button>
              </form>
            ) : null}

            <div className="space-y-2">
              {questions.map((question, index) => (
                <div key={question.id} className="rounded-md border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="text-xs text-muted-foreground">Вопрос {index + 1} · {question.points} баллов</div><div className="mt-1 font-medium">{question.question_text}</div></div>
                    {(quiz.status === "draft" || quiz.status === "finished") ? (
                      <form action={deleteQuizQuestionAction}>
                        <input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="quizId" value={quiz.id} /><input type="hidden" name="questionId" value={question.id} />
                        <Button type="submit" variant="ghost" size="icon" title="Удалить вопрос"><Trash2 className="h-4 w-4" /></Button>
                      </form>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">{question.answers.map((answer, answerIndex) => <div key={answerIndex} className={answerIndex === question.correct_answer_index ? "font-medium text-emerald-700" : "text-muted-foreground"}>{String.fromCharCode(65 + answerIndex)}. {answer}</div>)}</div>
                </div>
              ))}
              {questions.length === 0 ? <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Добавьте первый вопрос, затем можно будет объявить старт.</div> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Команды</CardTitle><CardDescription>Гости создают команды сами и делятся кодом со своими участниками.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {teams.sort((a, b) => b.score - a.score).map((team, index) => (
              <div key={team.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0"><div className="flex items-center gap-2"><span className="font-medium">{index + 1}. {team.name}</span>{index === 0 && team.score > 0 ? <Trophy className="h-4 w-4 text-amber-500" /> : null}</div><div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{team.members}</span><span>Код: <strong>{team.join_code}</strong></span></div></div>
                <Badge>{team.score}</Badge>
              </div>
            ))}
            {teams.length === 0 ? <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Команды появятся, когда гости откроют ссылку квиза.</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
