import { Clock3, Trophy, Users } from "lucide-react";

import { EventQrCode } from "@/components/event-qr-code";
import { QuizCountdown } from "@/components/quiz-countdown";

type QuizLiveStatus = "draft" | "countdown" | "active" | "finished";

export function QuizLiveOverlay({
  title,
  joinUrl,
  status,
  startsAt,
  question,
  answers,
  questionIndex,
  questionsCount,
  teams,
}: {
  title: string;
  joinUrl: string;
  status: QuizLiveStatus;
  startsAt: string | null;
  question: string | null;
  answers: string[];
  questionIndex: number;
  questionsCount: number;
  teams: Array<{ id: string; name: string; score: number; members: number }>;
}) {
  if (status === "draft") return null;

  if (status === "countdown" && startsAt) {
    return (
      <section className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 px-8 text-center text-white backdrop-blur-xl">
        <div className="grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10"><Clock3 className="h-8 w-8" /></div>
            <p className="mt-7 text-lg font-medium uppercase tracking-[0.24em] text-white/55">Приготовьтесь</p>
            <h1 className="mt-4 text-5xl font-semibold lg:text-7xl">{title}</h1>
            <QuizCountdown target={startsAt} className="mt-8 block text-[10rem] font-semibold leading-none lg:text-[14rem]" />
            <p className="mt-7 text-xl text-white/65">Соберите команду рядом. Вопрос появится на телефонах и на этом экране.</p>
          </div>
          <aside className="mx-auto w-full max-w-sm rounded-lg border border-white/15 bg-white/10 p-6 text-center shadow-2xl">
            <div className="scale-110"><EventQrCode value={joinUrl} title="Вступить в квиз" color="#ffffff" /></div>
            <h2 className="mt-6 text-2xl font-semibold">Подключайтесь сейчас</h2>
            <div className="mt-4 space-y-2 text-left text-sm text-white/65">
              <p>1. Наведите камеру на QR-код</p>
              <p>2. Создайте команду или введите код друзей</p>
              <p>3. Разрешите уведомление и ждите вопрос</p>
            </div>
          </aside>
        </div>
      </section>
    );
  }

  if (status === "active" && question) {
    return (
      <section className="fixed inset-0 z-[70] overflow-auto bg-black/92 px-8 py-10 text-white backdrop-blur-xl lg:px-16">
        <div className="mx-auto grid min-h-full max-w-7xl gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-lg font-medium uppercase tracking-[0.2em] text-white/50">Вопрос {questionIndex + 1} из {questionsCount}</p>
            <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-tight lg:text-7xl">{question}</h1>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {answers.map((answer, index) => (
                <div key={index} className="flex min-h-20 items-center gap-4 rounded-lg border border-white/15 bg-white/10 px-5 py-4 text-xl">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-semibold text-black">{String.fromCharCode(65 + index)}</span>
                  <span>{answer}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/10 p-5">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><Trophy className="h-5 w-5 text-amber-300" />Команды</div>
            <div className="space-y-2">{teams.slice(0, 8).map((team, index) => <div key={team.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-4 py-3"><div className="min-w-0"><div className="truncate font-medium">{index + 1}. {team.name}</div><div className="mt-0.5 flex items-center gap-1 text-xs text-white/45"><Users className="h-3 w-3" />{team.members}</div></div><strong>{team.score}</strong></div>)}</div>
            {teams.length === 0 ? <p className="text-sm text-white/50">Команды подключаются с телефонов.</p> : null}
          </div>
        </div>
      </section>
    );
  }

  if (status === "finished") {
    return (
      <section className="fixed inset-0 z-[70] flex items-center justify-center overflow-auto bg-black/92 px-8 py-12 text-white backdrop-blur-xl">
        <div className="w-full max-w-4xl text-center">
          <Trophy className="mx-auto h-16 w-16 text-amber-300" />
          <p className="mt-5 text-lg uppercase tracking-[0.2em] text-white/50">Квиз завершён</p>
          <h1 className="mt-3 text-6xl font-semibold">Результаты</h1>
          <div className="mx-auto mt-10 max-w-2xl space-y-3 text-left">{teams.slice(0, 10).map((team, index) => <div key={team.id} className="flex items-center justify-between rounded-lg border border-white/15 bg-white/10 px-6 py-4 text-xl"><span><span className="mr-4 text-white/45">{index + 1}</span>{team.name}</span><strong>{team.score} баллов</strong></div>)}</div>
        </div>
      </section>
    );
  }

  return null;
}
