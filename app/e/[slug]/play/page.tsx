import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ContestFlash } from "@/components/contest-flash";
import { ContestLeaveTeam } from "@/components/contest-leave-team";
import { ContestTeamCode } from "@/components/contest-team-code";
import { GuestGames, type VotablePhoto } from "@/components/guest-games";
import { QuizCountdown } from "@/components/quiz-countdown";
import { QuizGuestSync } from "@/components/quiz-guest-sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { createQuizTeamAction, joinQuizTeamAction, submitQuizAnswerAction } from "@/lib/actions/quiz";
import { getSiteUrl } from "@/lib/env";
import { isGamePlayable, loadContest } from "@/lib/games/contest";
import { memberCookieName, teamCookieName } from "@/lib/games/session";
import { GUEST_NAME_COOKIE } from "@/lib/guest";
import { joinMeta } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { plural } from "@/lib/utils";

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

type PlaySearchParams = {
  joined?: string;
  answered?: string;
  quizError?: string;
  game?: string;
  gameError?: string;
  team?: string;
};

const FLASH_PARAMS = ["joined", "answered", "quizError", "game", "gameError"];

const GAME_RESULT_MESSAGES: Record<string, { text: string; tone: "success" | "error" }> = {
  ok: { text: "Ответ принят. Баллы начислены команде.", tone: "success" },
  correct: { text: "Верно. Баллы начислены команде.", tone: "success" },
  wrong: { text: "Ответ неверный — в этот раз без баллов.", tone: "error" },
  pending: { text: "Отправлено ведущему на проверку. Баллы начислим после подтверждения.", tone: "success" },
  voted: { text: "Ваш голос учтён.", tone: "success" },
};

/** Только слово без числа: число уже стоит крупно рядом */
function pointsWord(count: number) {
  return plural(count, "балл", "балла", "баллов").replace(/^\S+\s/, "");
}

const EVENT_COLUMNS = "id, title, slug, custom_slug, brand_name, cover_title, is_active, max_file_size_mb";

async function loadEvent(rawSlug: string) {
  const slug = decodeURIComponent(rawSlug);
  const admin = createAdminClient();
  const { data: event, error } = await admin
    .from("events")
    .select(EVENT_COLUMNS)
    .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
    .eq("is_active", true)
    .maybeSingle();

  // PGRST116 = строка не найдена — это честный 404. Остальное — поломка запроса
  // или схемы: в лог подробно, гостю — нейтральная страница ошибки.
  if (error && error.code !== "PGRST116") {
    console.error(`[play] event «${slug}»: ${error.message}`);
    throw new Error("Страница временно недоступна. Попробуйте обновить её через минуту.");
  }

  return { admin, event: event ?? null };
}

/** Из сообщения после действия и query-параметров собираем одно уведомление */
function resolveFlash(query: PlaySearchParams): { message: string; tone: "success" | "error" } | null {
  if (query.quizError || query.gameError) return { message: String(query.quizError || query.gameError), tone: "error" };
  if (query.joined) return { message: "Вы в команде. Игры уже открыты, квиз начнётся по сигналу ведущего.", tone: "success" };
  if (query.answered) return { message: "Ответ команды принят. Ждите следующий вопрос.", tone: "success" };
  if (query.game && GAME_RESULT_MESSAGES[query.game]) {
    const result = GAME_RESULT_MESSAGES[query.game];
    return { message: result.text, tone: result.tone };
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { event } = await loadEvent(slug);
  if (!event) return { title: "Событие не найдено" };

  const title = `Конкурс вечера · ${event.cover_title || event.brand_name || event.title}`;
  return { title, openGraph: { title } };
}

export default async function EventPlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<PlaySearchParams>;
}) {
  const { slug: rawSlug } = await params;
  const query = await searchParams;
  const { admin, event } = await loadEvent(rawSlug);
  if (!event) notFound();

  const publicSlug = event.custom_slug || event.slug;
  const pageTitle = event.cover_title || event.brand_name || event.title;
  const cookieStore = await cookies();
  const savedGuestName = cookieStore.get(GUEST_NAME_COOKIE)?.value ?? "";

  const { data: quiz } = await admin
    .from("event_quizzes")
    .select("id, title, status, starts_at, current_question_index")
    .eq("event_id", event.id)
    .maybeSingle();

  if (quiz?.status === "countdown") {
    const { data: activated } = await admin.rpc("activate_due_quiz", { p_quiz_id: quiz.id });
    if (activated) quiz.status = "active";
  }

  if (!quiz) {
    return (
      <main className="pb-safe min-h-screen-dvh px-4 py-6 sm:py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <header>
            <div className="eyebrow">Конкурс вечера</div>
            <h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">{pageTitle}</h1>
          </header>
          <Card>
            <CardHeader>
              <CardTitle>Ведущий ещё готовит игру</CardTitle>
              <CardDescription>Откройте эту страницу немного позже — команда и игры появятся здесь.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/e/${publicSlug}`}>Вернуться к событию</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const [{ data: questionRows = [] }, { data: teamRows = [] }] = await Promise.all([
    admin
      .from("quiz_questions")
      .select("id, question_text, answers, correct_answer_index, points, position")
      .eq("quiz_id", quiz.id)
      .order("position"),
    admin.from("quiz_teams").select("id, name, join_code, created_at").eq("quiz_id", quiz.id).order("created_at"),
  ]);

  const questions = (questionRows ?? []).map((question) => ({ ...question, answers: question.answers as string[] })) as QuizQuestion[];
  const teams = teamRows ?? [];
  const teamIds = teams.map((team) => team.id);
  const questionIds = questions.map((question) => question.id);

  const [{ data: memberRows = [] }, { data: answerRows = [] }] = await Promise.all([
    teamIds.length
      ? admin.from("quiz_team_members").select("id, team_id, guest_name").in("team_id", teamIds)
      : Promise.resolve({ data: [] as { id: string; team_id: string; guest_name: string }[] }),
    questionIds.length
      ? admin.from("quiz_answers").select("id, question_id, team_id, member_id, selected_answer_index, is_correct, points, created_at").in("question_id", questionIds)
      : Promise.resolve({ data: [] as { id: string; question_id: string; team_id: string; member_id: string | null; selected_answer_index: number; is_correct: boolean; points: number; created_at: string }[] }),
  ]);

  const members = memberRows ?? [];
  const answers = answerRows ?? [];
  const savedTeamId = cookieStore.get(teamCookieName(event.id))?.value;
  const savedMemberId = cookieStore.get(memberCookieName(event.id))?.value;
  const team = teams.find((item) => item.id === savedTeamId) ?? null;
  const member = members.find((item) => item.id === savedMemberId && item.team_id === savedTeamId) ?? null;
  const inTeam = Boolean(team && member);

  const effectiveStatus = quiz.status as QuizStatus;
  const currentQuestion = questions[quiz.current_question_index];
  const teamAnswer = currentQuestion && team ? answers.find((answer) => answer.question_id === currentQuestion.id && answer.team_id === team.id) : null;

  // Конкурс: таблица по сумме баллов за квиз, игры и начисления ведущего
  const contest = await loadContest(event.id);
  const playableGames = contest.games.filter(isGamePlayable);
  const teamEntries = team ? contest.entries.filter((entry) => entry.teamId === team.id) : [];
  const hasVoted = Boolean(member && contest.votedMemberIds.has(member.id));
  const myPlace = team ? contest.teams.findIndex((item) => item.id === team.id) + 1 : 0;
  const myScore = team ? contest.teams.find((item) => item.id === team.id)?.total ?? 0 : 0;
  const teamMembersCount = team ? members.filter((item) => item.team_id === team.id).length : 0;

  const voteGameEnabled = inTeam && playableGames.some((game) => game.definition.type === "photo_vote");
  let photos: VotablePhoto[] = [];
  if (voteGameEnabled) {
    const { data: uploadRows = [] } = await admin
      .from("uploads")
      .select("id, guest_name, file_path")
      .eq("event_id", event.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(24);

    photos = await Promise.all(
      (uploadRows ?? []).map(async (upload) => {
        const { data } = await admin.storage.from("event-photos").createSignedUrl(upload.file_path, 60 * 20);
        return {
          id: upload.id,
          guestName: upload.guest_name,
          signedUrl: data?.signedUrl ?? "",
          votes: contest.votesByUpload.get(upload.id) ?? 0,
        };
      }),
    );
  }

  const flash = resolveFlash(query);
  // Если ведущий оставил квизу название по умолчанию, оно совпадает с надзаголовком — тогда в h1 идёт название события
  const quizTitleIsGeneric = quiz.title.trim().toLowerCase() === "конкурс вечера";
  const heading = quizTitleIsGeneric ? pageTitle : quiz.title;
  const subheading = quizTitleIsGeneric ? null : pageTitle;
  const prefilledCode = (query.team ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const joinUrl = `${getSiteUrl()}/e/${encodeURIComponent(publicSlug)}/play`;
  const showQuizBlock = effectiveStatus === "countdown" || effectiveStatus === "active";

  return (
    <main className="pb-safe min-h-screen-dvh">
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:pt-10">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow">Конкурс вечера</div>
            <h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">{heading}</h1>
            {subheading ? <p className="mt-1 text-sm text-muted-foreground">{subheading}</p> : null}
          </div>
          <Button asChild variant="ghost" className="shrink-0">
            <Link href={`/e/${publicSlug}`}>Фото</Link>
          </Button>
        </header>
      </div>

      {inTeam && team ? (
        <div className="sticky top-0 z-20 mt-6 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate font-serif text-xl font-medium leading-tight">{team.name}</div>
              <div className="tabular text-xs text-muted-foreground">
                {myPlace > 0 ? `${myPlace} место из ${contest.teams.length}` : "Место появится после первых баллов"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-serif tabular text-3xl font-medium leading-none">{myScore}</div>
              <div className="text-[11px] text-muted-foreground">{pointsWord(myScore)}</div>
            </div>
            <ContestLeaveTeam eventId={event.id} slug={publicSlug} teamName={team.name} />
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-2xl space-y-8 px-4 py-6 sm:py-8">
        <ContestFlash message={flash?.message ?? null} tone={flash?.tone ?? "success"} params={FLASH_PARAMS} />

        {!inTeam || !team || !member ? (
          <section className="space-y-4" aria-label="Вступление в команду">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Войти по коду</CardTitle>
                  <CardDescription>Код есть у того, кто создал команду.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={joinQuizTeamAction} className="space-y-4">
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="quizId" value={quiz.id} />
                    <input type="hidden" name="slug" value={publicSlug} />
                    <div className="space-y-2">
                      <Label htmlFor="join-guest-name">Ваше имя</Label>
                      <Input id="join-guest-name" name="guestName" autoComplete="name" defaultValue={savedGuestName} required maxLength={80} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="join-code">Код команды</Label>
                      <Input
                        id="join-code"
                        name="joinCode"
                        defaultValue={prefilledCode}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        inputMode="text"
                        pattern="[A-Za-z0-9]{4,8}"
                        minLength={4}
                        maxLength={8}
                        required
                        className="h-14 text-center font-serif text-2xl uppercase tracking-[0.3em] sm:h-12"
                      />
                    </div>
                    <SubmitButton className="h-12 w-full text-base" pendingText="Входим…">
                      Войти в команду
                    </SubmitButton>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Создать команду</CardTitle>
                  <CardDescription>Вы получите код и сможете пригласить свой стол.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={createQuizTeamAction} className="space-y-4">
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="quizId" value={quiz.id} />
                    <input type="hidden" name="slug" value={publicSlug} />
                    <div className="space-y-2">
                      <Label htmlFor="create-guest-name">Ваше имя</Label>
                      <Input id="create-guest-name" name="guestName" autoComplete="name" defaultValue={savedGuestName} required maxLength={80} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-team-name">Название команды</Label>
                      <Input id="create-team-name" name="teamName" placeholder="Стол № 4" required maxLength={60} />
                    </div>
                    <SubmitButton variant="outline" className="h-12 w-full text-base" pendingText="Создаём…">
                      Создать команду
                    </SubmitButton>
                  </form>
                </CardContent>
              </Card>
            </div>

            <GuestGames
              eventId={event.id}
              slug={publicSlug}
              games={playableGames}
              teamId={null}
              teamEntries={[]}
              photos={[]}
              hasVoted={false}
              maxFileSizeMb={event.max_file_size_mb ?? 10}
            />
          </section>
        ) : (
          <>
            <Card>
              <CardContent className="space-y-4 p-5 sm:p-6">
                <ContestTeamCode teamName={team.name} code={team.join_code} joinUrl={joinUrl} />
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-4 text-sm text-muted-foreground">
                  <span>{joinMeta(member.guest_name, plural(teamMembersCount, "участник", "участника", "участников"))}</span>
                  <QuizGuestSync status={effectiveStatus} />
                </div>
              </CardContent>
            </Card>

            {showQuizBlock && effectiveStatus === "countdown" && quiz.starts_at ? (
              <Card className="overflow-hidden border-live bg-live text-live-foreground">
                <CardContent className="py-10 text-center sm:py-12">
                  <div className="eyebrow text-live-muted">Квиз начинается через</div>
                  <QuizCountdown target={quiz.starts_at} className="mt-3 block text-7xl font-medium leading-none sm:text-8xl" />
                  <p className="mt-4 text-sm text-live-muted">Соберите команду рядом: вопрос появится на этой странице.</p>
                </CardContent>
              </Card>
            ) : null}

            {showQuizBlock && effectiveStatus === "active" && currentQuestion ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="accent">Квиз</Badge>
                    <span className="tabular text-sm text-muted-foreground">
                      {joinMeta(`Вопрос ${quiz.current_question_index + 1} из ${questions.length}`, plural(currentQuestion.points, "балл", "балла", "баллов"))}
                    </span>
                  </div>
                  <CardTitle className="pt-2 leading-tight">{currentQuestion.question_text}</CardTitle>
                  <CardDescription>Обсудите ответ. От команды принимается только один вариант.</CardDescription>
                </CardHeader>
                <CardContent>
                  {teamAnswer ? (
                    <div className="rounded-lg border border-success/30 bg-success-soft p-5 text-center">
                      <div className="font-serif text-xl font-medium">Ответ команды принят</div>
                      <div className="mt-1 text-sm text-muted-foreground">Ждите, пока ведущий откроет следующий вопрос.</div>
                    </div>
                  ) : (
                    <form action={submitQuizAnswerAction} className="space-y-4">
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="quizId" value={quiz.id} />
                      <input type="hidden" name="questionId" value={currentQuestion.id} />
                      <input type="hidden" name="slug" value={publicSlug} />
                      <div className="grid gap-2">
                        {currentQuestion.answers.map((answer, index) => (
                          <label
                            key={index}
                            className="flex min-h-14 cursor-pointer touch-manipulation items-center gap-3 rounded-lg border bg-card px-4 py-2 text-base transition-colors active:bg-secondary has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                          >
                            <input type="radio" name="answerIndex" value={index} required className="peer sr-only" />
                            <span
                              aria-hidden
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-input bg-card transition-colors peer-checked:border-accent peer-checked:bg-accent"
                            >
                              <span className="h-2 w-2 rounded-full bg-card" />
                            </span>
                            <span className="font-medium">{answer}</span>
                          </label>
                        ))}
                      </div>
                      <SubmitButton size="lg" className="h-14 w-full text-base">
                        Ответить от команды
                      </SubmitButton>
                    </form>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {effectiveStatus === "draft" && playableGames.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <h2 className="font-serif text-2xl font-medium">Команда собрана</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Ведущий откроет игры и объявит старт квиза. Держите страницу открытой.</p>
                </CardContent>
              </Card>
            ) : null}

            {effectiveStatus === "finished" ? (
              <p className="text-sm text-muted-foreground">Квиз завершён. Баллы за него уже в таблице.</p>
            ) : null}

            <GuestGames
              eventId={event.id}
              slug={publicSlug}
              games={playableGames}
              teamId={team.id}
              teamEntries={teamEntries}
              photos={photos}
              hasVoted={hasVoted}
              maxFileSizeMb={event.max_file_size_mb ?? 10}
            />
          </>
        )}

        <section className="space-y-3" aria-labelledby="standings-heading">
          <div className="border-b pb-3">
            <div className="eyebrow">Таблица</div>
            <h2 id="standings-heading" className="font-serif text-2xl font-medium">Команды вечера</h2>
          </div>
          {contest.teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Команды ещё не собрались.</p>
          ) : (
            <ol className="divide-y">
              {contest.teams.map((item, index) => {
                const mine = item.id === team?.id;
                return (
                  <li key={item.id} className={`flex min-h-14 items-center gap-3 py-3 ${mine ? "-mx-3 rounded-lg bg-accent-soft px-3" : ""}`}>
                    <span className="font-serif tabular w-7 shrink-0 text-lg text-muted-foreground">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-serif text-lg font-medium leading-tight">{item.name}</div>
                      <div className="tabular text-xs text-muted-foreground">
                        {joinMeta(`Квиз ${item.quizPoints}`, `Игры ${item.gamePoints + item.votePoints}`, `Зал ${item.bonusPoints}`)}
                      </div>
                    </div>
                    <span className="font-serif tabular text-2xl font-medium">{item.total}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
