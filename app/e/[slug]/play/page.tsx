import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { BellRing, CheckCircle2, Clock3, LogOut, Plus, Trophy, UserPlus, Users } from "lucide-react";

import { QuizCountdown } from "@/components/quiz-countdown";
import { QuizGuestSync } from "@/components/quiz-guest-sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createQuizTeamAction, joinQuizTeamAction, leaveQuizTeamAction, submitQuizAnswerAction } from "@/lib/actions/quiz";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type QuizStatus = "draft" | "countdown" | "active" | "finished";
type QuizQuestion = {
  id: string;
  question_text: string;
  answers: string[];
  correct_answer_index: number;
  points: number;
  position: number;
};

export default async function EventPlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ joined?: string; answered?: string; quizError?: string }>;
}) {
  const { slug: rawSlug } = await params;
  const query = await searchParams;
  const slug = decodeURIComponent(rawSlug);
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, title, slug, custom_slug, brand_name, cover_title, is_active")
    .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
    .eq("is_active", true)
    .single();
  if (!event) notFound();

  const publicSlug = event.custom_slug || event.slug;
  const { data: quiz } = await admin
    .from("event_quizzes")
    .select("id, title, status, starts_at, current_question_index")
    .eq("event_id", event.id)
    .maybeSingle();

  if (quiz?.status === "countdown") {
    const { data: activated } = await admin.rpc("activate_due_quiz", { p_quiz_id: quiz.id });
    if (activated) quiz.status = "active";
  }

  const pageTitle = event.cover_title || event.brand_name || event.title;
  if (!quiz) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-lg">
          <Card><CardHeader><Badge className="w-fit">Командный квиз</Badge><CardTitle className="pt-2">{pageTitle}</CardTitle><CardDescription>Ведущий ещё готовит игру. Откройте эту страницу немного позже.</CardDescription></CardHeader><CardContent><Button asChild variant="outline" className="w-full"><Link href={`/e/${publicSlug}`}>Вернуться к мероприятию</Link></Button></CardContent></Card>
        </div>
      </main>
    );
  }

  const [{ data: questionRows = [] }, { data: teamRows = [] }, { data: memberRows = [] }, { data: answerRows = [] }] = await Promise.all([
    admin.from("quiz_questions").select("id, question_text, answers, correct_answer_index, points, position").eq("quiz_id", quiz.id).order("position"),
    admin.from("quiz_teams").select("id, name, join_code, created_at").eq("quiz_id", quiz.id).order("created_at"),
    admin.from("quiz_team_members").select("id, team_id, guest_name").in("team_id", (await admin.from("quiz_teams").select("id").eq("quiz_id", quiz.id)).data?.map((team) => team.id) ?? []),
    admin.from("quiz_answers").select("id, question_id, team_id, member_id, selected_answer_index, is_correct, points, created_at").in("question_id", (await admin.from("quiz_questions").select("id").eq("quiz_id", quiz.id)).data?.map((question) => question.id) ?? []),
  ]);

  const questions = (questionRows ?? []).map((question) => ({ ...question, answers: question.answers as string[] })) as QuizQuestion[];
  const teams = teamRows ?? [];
  const members = memberRows ?? [];
  const answers = answerRows ?? [];
  const cookieStore = await cookies();
  const savedTeamId = cookieStore.get(`ailshan_quiz_team_${event.id}`)?.value;
  const savedMemberId = cookieStore.get(`ailshan_quiz_member_${event.id}`)?.value;
  const team = teams.find((item) => item.id === savedTeamId) ?? null;
  const member = members.find((item) => item.id === savedMemberId && item.team_id === savedTeamId) ?? null;

  const effectiveStatus = quiz.status as QuizStatus;
  const currentQuestion = questions[quiz.current_question_index];
  const teamAnswer = currentQuestion && team ? answers.find((answer) => answer.question_id === currentQuestion.id && answer.team_id === team.id) : null;
  const scores = new Map<string, number>();
  answers.forEach((answer) => scores.set(answer.team_id, (scores.get(answer.team_id) ?? 0) + answer.points));
  const leaderboard = teams.map((item) => ({ ...item, score: scores.get(item.id) ?? 0 })).sort((a, b) => b.score - a.score);

  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex items-start justify-between gap-4">
          <div><Badge>Командный квиз</Badge><h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{quiz.title}</h1><p className="mt-1 text-sm text-muted-foreground">{pageTitle}</p></div>
          <Button asChild variant="ghost" size="sm"><Link href={`/e/${publicSlug}`}>Фото</Link></Button>
        </header>

        {query.quizError ? <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">{query.quizError}</div> : null}
        {query.joined ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Готово. Вы в команде и получите вопрос после команды ведущего.</div> : null}
        {query.answered ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Ответ команды принят. Ждите следующий вопрос.</div> : null}

        {!team || !member ? (
          <>
            <Card>
              <CardHeader><CardTitle>Как участвовать</CardTitle><CardDescription>Это займёт меньше минуты.</CardDescription></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                {["Создайте команду или получите её код у друзей", "Разрешите уведомление о старте", "Обсуждайте вопрос и отправляйте один ответ от команды"].map((text, index) => <div key={text} className="rounded-md border bg-muted/30 p-3 text-sm"><div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</div>{text}</div>)}
              </CardContent>
            </Card>

            {quiz.status === "finished" ? (
              <Card><CardHeader><CardTitle>Квиз уже завершён</CardTitle><CardDescription>Посмотрите итоговую таблицу команд ниже.</CardDescription></CardHeader></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Создать команду</CardTitle><CardDescription>Вы получите код и сможете позвать друзей.</CardDescription></CardHeader>
                  <CardContent><form action={createQuizTeamAction} className="space-y-3"><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="quizId" value={quiz.id} /><input type="hidden" name="slug" value={publicSlug} /><div className="space-y-2"><Label>Ваше имя</Label><Input name="guestName" autoComplete="name" required /></div><div className="space-y-2"><Label>Название команды</Label><Input name="teamName" placeholder="Например, Молния" required /></div><Button type="submit" className="w-full"><Users className="h-4 w-4" />Создать</Button></form></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Войти по коду</CardTitle><CardDescription>Код покажет создатель вашей команды.</CardDescription></CardHeader>
                  <CardContent><form action={joinQuizTeamAction} className="space-y-3"><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="quizId" value={quiz.id} /><input type="hidden" name="slug" value={publicSlug} /><div className="space-y-2"><Label>Ваше имя</Label><Input name="guestName" autoComplete="name" required /></div><div className="space-y-2"><Label>Код команды</Label><Input name="joinCode" className="uppercase" placeholder="A1B2C3" minLength={4} maxLength={8} required /></div><Button type="submit" variant="outline" className="w-full"><UserPlus className="h-4 w-4" />Войти</Button></form></CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div><div className="text-xs text-muted-foreground">Ваша команда</div><div className="font-semibold">{team.name} <span className="ml-2 text-sm font-normal text-muted-foreground">код {team.join_code}</span></div><div className="mt-1 text-xs text-muted-foreground">{member.guest_name} · {members.filter((item) => item.team_id === team.id).length} участников</div></div>
                <div className="flex items-center gap-2"><QuizGuestSync quizId={quiz.id} quizTitle={quiz.title} status={effectiveStatus} startsAt={quiz.starts_at} /><form action={leaveQuizTeamAction}><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="slug" value={publicSlug} /><Button type="submit" variant="ghost" size="icon" title="Выйти из команды"><LogOut className="h-4 w-4" /></Button></form></div>
              </CardContent>
            </Card>

            {effectiveStatus === "draft" ? (
              <Card><CardContent className="py-12 text-center"><Clock3 className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-4 text-xl font-semibold">Команда собрана</h2><p className="mt-2 text-sm text-muted-foreground">Ведущий объявит старт. Не закрывайте страницу и включите уведомления.</p></CardContent></Card>
            ) : null}

            {quiz.status === "countdown" && quiz.starts_at && effectiveStatus === "countdown" ? (
              <Card className="overflow-hidden"><CardContent className="bg-foreground py-12 text-center text-background"><BellRing className="mx-auto h-9 w-9 opacity-70" /><div className="mt-4 text-sm font-medium uppercase tracking-widest opacity-60">Квиз начинается через</div><QuizCountdown target={quiz.starts_at} className="mt-2 block text-8xl font-semibold" /><p className="mt-4 text-sm opacity-70">Соберите команду рядом и приготовьтесь обсуждать.</p></CardContent></Card>
            ) : null}

            {effectiveStatus === "active" && currentQuestion ? (
              <Card>
                <CardHeader><Badge variant="secondary" className="w-fit">Вопрос {quiz.current_question_index + 1} из {questions.length} · {currentQuestion.points} баллов</Badge><CardTitle className="pt-2 text-xl sm:text-2xl">{currentQuestion.question_text}</CardTitle><CardDescription>Обсудите ответ. От команды принимается только один вариант.</CardDescription></CardHeader>
                <CardContent>
                  {teamAnswer ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800"><CheckCircle2 className="mx-auto h-9 w-9" /><div className="mt-3 font-semibold">Ответ команды принят</div><div className="mt-1 text-sm">Ждите, пока ведущий откроет следующий вопрос.</div></div>
                  ) : (
                    <form action={submitQuizAnswerAction} className="space-y-3"><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="quizId" value={quiz.id} /><input type="hidden" name="questionId" value={currentQuestion.id} /><input type="hidden" name="slug" value={publicSlug} /><div className="grid gap-2">{currentQuestion.answers.map((answer, index) => <label key={index} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-muted"><input type="radio" name="answerIndex" value={index} required /><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">{String.fromCharCode(65 + index)}</span><span className="font-medium">{answer}</span></label>)}</div><Button type="submit" size="lg" className="w-full">Ответить от команды</Button></form>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </>
        )}

        {effectiveStatus === "finished" ? (
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" />Результаты квиза</CardTitle><CardDescription>Итоговый рейтинг команд.</CardDescription></CardHeader><CardContent className="space-y-2">{leaderboard.map((item, index) => <div key={item.id} className="flex items-center justify-between rounded-md border p-3"><div><span className="mr-2 text-muted-foreground">{index + 1}</span><span className="font-medium">{item.name}</span></div><Badge>{item.score} баллов</Badge></div>)}{leaderboard.length === 0 ? <p className="text-sm text-muted-foreground">Команды ещё не участвовали.</p> : null}</CardContent></Card>
        ) : null}
      </div>
    </main>
  );
}
