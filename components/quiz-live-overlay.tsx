import { QuizCountdown } from "@/components/quiz-countdown";
import { LiveQr } from "@/components/live-qr";
import { plural } from "@/lib/utils";

type QuizLiveStatus = "draft" | "countdown" | "active" | "finished";

type QuizLiveTeam = { id: string; name: string; score: number; members: number };

const ANSWER_LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];

/** Надзаголовок для стены: капитель крупнее обычной, читается с десяти метров */
const WALL_OVERLINE = "text-lg font-medium uppercase tracking-[0.18em] text-live-muted";

function TeamsBoard({ teams, limit }: { teams: QuizLiveTeam[]; limit: number }) {
  if (teams.length === 0) {
    return <p className="text-xl text-live-muted">Команды подключаются с телефонов.</p>;
  }

  return (
    <ol className="divide-y divide-live-foreground/10">
      {teams.slice(0, limit).map((team, index) => {
        const leads = index === 0 && team.score > 0;

        return (
          <li key={team.id} className="flex items-center gap-4 py-3">
            <span
              className={[
                "w-8 shrink-0 font-serif tabular text-2xl",
                leads ? "text-live-accent" : "text-live-muted",
              ].join(" ")}
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-serif text-2xl font-medium leading-tight">{team.name}</span>
              <span className="mt-0.5 block text-lg text-live-muted">
                {plural(team.members, "участник", "участника", "участников")}
              </span>
            </span>
            <span
              className={[
                "shrink-0 font-serif tabular text-3xl font-medium",
                leads ? "text-live-accent" : "text-live-foreground",
              ].join(" ")}
            >
              {team.score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

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
  teams: QuizLiveTeam[];
}) {
  if (status === "draft") return null;

  if (status === "countdown" && startsAt) {
    return (
      <section className="fixed inset-0 z-[70] flex items-center justify-center overflow-auto bg-live/95 px-10 py-12 text-live-foreground backdrop-blur-xl">
        <div className="grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[1fr_360px]">
          <div className="text-center lg:text-left">
            <p className={WALL_OVERLINE}>Приготовьтесь</p>
            <h1 className="mt-5 font-serif text-6xl font-medium leading-none lg:text-8xl">{title}</h1>
            <QuizCountdown
              target={startsAt}
              className="mt-10 block text-[9rem] font-medium leading-none lg:text-[13rem]"
            />
            <p className="mt-8 max-w-2xl text-2xl text-live-muted lg:text-3xl">
              Соберите команду рядом. Вопрос появится на телефонах и на этом экране.
            </p>
          </div>

          <aside className="mx-auto w-full max-w-sm rounded-xl border border-live-foreground/15 p-8 text-center">
            <LiveQr value={joinUrl} size={200} />
            <h2 className="mt-6 font-serif text-3xl font-medium">Подключайтесь сейчас</h2>
            <ol className="mt-5 space-y-2 text-left text-lg text-live-muted">
              <li>1. Наведите камеру на код</li>
              <li>2. Создайте команду или введите код друзей</li>
              <li>3. Держите страницу открытой — вопрос появится на ней</li>
            </ol>
          </aside>
        </div>
      </section>
    );
  }

  if (status === "active" && question) {
    return (
      <section className="fixed inset-0 z-[70] overflow-auto bg-live/95 px-10 py-12 text-live-foreground backdrop-blur-xl lg:px-16">
        <div className="mx-auto grid min-h-full max-w-7xl gap-12 lg:grid-cols-[1fr_380px] lg:items-center">
          <div>
            <p className={WALL_OVERLINE}>
              Вопрос {questionIndex + 1} из {questionsCount}
            </p>
            <h1 className="mt-6 max-w-5xl font-serif text-5xl font-medium leading-tight lg:text-7xl">{question}</h1>
            <ol className="mt-12 grid gap-4 sm:grid-cols-2">
              {answers.map((answer, index) => (
                <li
                  key={index}
                  className="flex min-h-24 items-center gap-5 rounded-xl border border-live-foreground/15 px-6 py-5 text-2xl lg:text-3xl"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-live-foreground/30 font-serif text-2xl font-medium">
                    {ANSWER_LETTERS[index] ?? index + 1}
                  </span>
                  <span className="leading-snug">{answer}</span>
                </li>
              ))}
            </ol>
          </div>

          <aside className="rounded-xl border border-live-foreground/15 p-6">
            <p className={WALL_OVERLINE}>Команды</p>
            <div className="mt-3">
              <TeamsBoard teams={teams} limit={8} />
            </div>
          </aside>
        </div>
      </section>
    );
  }

  if (status === "finished") {
    const winner = teams[0];

    return (
      <section className="fixed inset-0 z-[70] flex items-center justify-center overflow-auto bg-live/95 px-10 py-12 text-live-foreground backdrop-blur-xl">
        <div className="w-full max-w-4xl text-center">
          <p className={WALL_OVERLINE}>Квиз завершён</p>
          <h1 className="mt-4 font-serif text-6xl font-medium lg:text-7xl">
            {winner && winner.score > 0 ? winner.name : "Результаты"}
          </h1>
          {winner && winner.score > 0 ? (
            <p className="mt-3 text-2xl text-live-muted">
              Победа — {plural(winner.score, "балл", "балла", "баллов")}
            </p>
          ) : null}

          <div className="mx-auto mt-10 max-w-2xl border-t border-live-foreground/10 text-left">
            <TeamsBoard teams={teams} limit={10} />
          </div>
        </div>
      </section>
    );
  }

  return null;
}
