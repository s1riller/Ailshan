import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";

import { LiveAutoRefresh } from "@/components/live-auto-refresh";
import { LiveQr } from "@/components/live-qr";
import { QuizLiveOverlay } from "@/components/quiz-live-overlay";
import { getSiteUrl } from "@/lib/env";
import { isGamePlayable, loadContest, type ContestTeam } from "@/lib/games/contest";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 5;

type LivePhoto = {
  id: string;
  guest_name: string;
  message: string | null;
  signedUrl: string;
};

type LiveLayout = "masonry" | "featured" | "slideshow" | "compact";
type LiveTransition = "fade" | "slide" | "zoom" | "stories";
type LiveQrEffect = "fade" | "slide" | "pulse" | "stories";

type LiveGameEntry = {
  id: string;
  game_type: string;
  guest_name: string;
  content: string;
};

type PollResult = { choice: string; count: number; share: number };
type LivePoll = { prompt: string; results: PollResult[] };

const allowedLayouts: LiveLayout[] = ["masonry", "featured", "slideshow", "compact"];
const allowedTransitions: LiveTransition[] = ["fade", "slide", "zoom", "stories"];
const allowedQrEffects: LiveQrEffect[] = ["fade", "slide", "pulse", "stories"];

/** Больше всего снимков, которые может показать любая раскладка */
const MAX_WALL_PHOTOS = 32;

/** Меньше трёх снимков — стена ещё не сложилась: показываем приглашение */
const FEW_PHOTOS_LIMIT = 2;

/**
 * Игры, которым не место на стене: личные задания, письма в будущее,
 * клетки бинго и отчёты о фотозаданиях читают ведущий и команда, опрос
 * показан отдельно в виде долей, а бонусы ведущего — это просто баллы.
 */
const HIDDEN_ON_WALL = new Set(["secret_mission", "time_capsule", "bingo", "photo_challenge", "team_battle", "poll"]);

/** Капитель для стены: крупнее обычной, читается с десяти метров */
const WALL_OVERLINE = "text-lg font-medium uppercase tracking-[0.18em] text-live-muted";

const QR_HINT = "Наведите камеру, чтобы добавить снимок";

function getSafeLayout(value: string | null | undefined): LiveLayout {
  return allowedLayouts.includes(value as LiveLayout) ? (value as LiveLayout) : "masonry";
}

function getSafeTransition(value: string | null | undefined): LiveTransition {
  return allowedTransitions.includes(value as LiveTransition) ? (value as LiveTransition) : "fade";
}

function getSafeQrEffect(value: string | null | undefined): LiveQrEffect {
  return allowedQrEffects.includes(value as LiveQrEffect) ? (value as LiveQrEffect) : "fade";
}

function getSafeDuration(value: number | null | undefined, fallback = 5) {
  if (!value || Number.isNaN(value)) return fallback;

  return Math.min(Math.max(value, 3), 20);
}

function getSafeQrInterval(value: number | null | undefined, fallback = 30) {
  if (!value || Number.isNaN(value)) return fallback;

  return Math.min(Math.max(value, 10), 120);
}

/* ------------------------------------------------------------------ */
/* Сетка, которая заполняет экран при любом количестве снимков          */
/* ------------------------------------------------------------------ */

type GridPlan = { cols: number; rows: number; spans: Record<number, string> };

/**
 * Раздаёт растяжки так, чтобы в сетке cols×rows не осталось пустых
 * клеток: первый (самый свежий) снимок получает 2×2, дальше — по одной
 * двойной клетке на каждую недостающую. grid-auto-flow: dense заполняет
 * остальное.
 */
function planGrid(count: number, cols: number, rows: number): GridPlan {
  const spans: Record<number, string> = {};
  let missing = cols * rows - count;
  let index = 0;

  if (missing >= 3 && rows >= 2 && cols >= 2) {
    spans[0] = "col-span-2 row-span-2";
    missing -= 3;
    index = 1;
  }

  while (missing > 0 && index < count) {
    spans[index] = "col-span-2";
    missing -= 1;
    index += 3;
  }

  return { cols, rows, spans };
}

function masonryTier(count: number): [cols: number, rows: number] {
  if (count <= 3) return [3, 1];
  if (count === 4) return [2, 2];
  if (count <= 6) return [3, 2];
  if (count <= 8) return [4, 2];
  if (count <= 12) return [4, 3];

  return [6, 3];
}

function compactTier(count: number): [cols: number, rows: number] {
  if (count <= 4) return [count, 1];
  if (count <= 8) return [4, 2];
  if (count <= 12) return [4, 3];
  if (count <= 18) return [6, 3];
  if (count <= 24) return [6, 4];

  return [8, 4];
}

/* ------------------------------------------------------------------ */
/* Снимок и подпись                                                     */
/* ------------------------------------------------------------------ */

function PhotoCaption({
  photo,
  showMessages,
  showNames,
  size = "sm",
}: {
  photo: LivePhoto;
  showMessages: boolean;
  showNames: boolean;
  size?: "sm" | "lg";
}) {
  const hasMessage = showMessages && Boolean(photo.message);
  if (!showNames && !hasMessage) return null;

  const large = size === "lg";

  return (
    <div className={["absolute inset-x-0 bottom-0 bg-live/80 backdrop-blur-sm", large ? "px-8 py-5" : "px-4 py-3"].join(" ")}>
      {showNames ? (
        <p
          className={[
            "truncate font-medium uppercase text-live-muted",
            large ? "text-xl tracking-[0.18em]" : "text-base tracking-[0.14em]",
          ].join(" ")}
        >
          {photo.guest_name}
        </p>
      ) : null}

      {hasMessage ? (
        <p
          className={[
            "font-serif italic leading-snug text-live-foreground",
            large ? "mt-2 line-clamp-2 text-4xl" : "mt-1 line-clamp-2 text-2xl",
          ].join(" ")}
        >
          {photo.message}
        </p>
      ) : null}
    </div>
  );
}

/** Снимок целиком на размытом отражении себя же: без чёрных полей и без обрезки */
function ContainedPhoto({ photo, sizes, priority = false }: { photo: LivePhoto; sizes: string; priority?: boolean }) {
  if (!photo.signedUrl) return null;

  return (
    <>
      <Image
        src={photo.signedUrl}
        alt=""
        aria-hidden
        fill
        className="scale-110 object-cover opacity-50 blur-2xl"
        sizes="200px"
      />
      <Image src={photo.signedUrl} alt="" fill className="object-contain" sizes={sizes} priority={priority} />
    </>
  );
}

function PhotoTile({
  photo,
  span,
  sizes,
  priority,
  showMessages,
  showNames,
}: {
  photo: LivePhoto;
  span?: string;
  sizes: string;
  priority: boolean;
  showMessages: boolean;
  showNames: boolean;
}) {
  return (
    <article
      className={["relative overflow-hidden rounded-xl border border-live-foreground/10 bg-live-foreground/5", span ?? ""].join(" ")}
    >
      {photo.signedUrl ? (
        <Image src={photo.signedUrl} alt="" fill className="object-cover" sizes={sizes} priority={priority} />
      ) : null}

      <PhotoCaption photo={photo} showMessages={showMessages} showNames={showNames} />
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Раскладки                                                            */
/* ------------------------------------------------------------------ */

/** Область стены над нижней полосой; высота полосы — переменная --bar на <main> */
const WALL_SECTION = "absolute inset-x-0 top-0 bottom-[var(--bar)] p-6";

function GridGallery({
  photos,
  plan,
  showMessages,
  showNames,
}: {
  photos: LivePhoto[];
  plan: GridPlan;
  showMessages: boolean;
  showNames: boolean;
}) {
  const tileWidth = Math.round(100 / plan.cols);

  return (
    <section
      className={`${WALL_SECTION} grid grid-flow-dense gap-3`}
      style={{
        gridTemplateColumns: `repeat(${plan.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${plan.rows}, minmax(0, 1fr))`,
      }}
    >
      {photos.map((photo, index) => {
        const span = plan.spans[index];

        return (
          <PhotoTile
            key={photo.id}
            photo={photo}
            span={span}
            sizes={span ? `${tileWidth * 2}vw` : `${tileWidth}vw`}
            priority={index < 8}
            showMessages={showMessages}
            showNames={showNames}
          />
        );
      })}
    </section>
  );
}

function MasonryGallery(props: { photos: LivePhoto[]; showMessages: boolean; showNames: boolean }) {
  const photos = props.photos.slice(0, 18);
  const [cols, rows] = masonryTier(photos.length);

  return <GridGallery {...props} photos={photos} plan={planGrid(photos.length, cols, rows)} />;
}

function CompactGallery(props: { photos: LivePhoto[]; showMessages: boolean; showNames: boolean }) {
  const photos = props.photos.slice(0, MAX_WALL_PHOTOS);
  const [cols, rows] = compactTier(photos.length);

  return <GridGallery {...props} photos={photos} plan={planGrid(photos.length, cols, rows)} />;
}

function FeaturedGallery({
  photos,
  showMessages,
  showNames,
}: {
  photos: LivePhoto[];
  showMessages: boolean;
  showNames: boolean;
}) {
  const [hero, ...rest] = photos;
  const side = rest.slice(0, 4);

  return (
    <section className={`${WALL_SECTION} grid gap-3`} style={{ gridTemplateColumns: "3fr 1fr" }}>
      <article className="relative overflow-hidden rounded-xl border border-live-foreground/10 bg-live-foreground/5">
        <ContainedPhoto photo={hero} sizes="75vw" priority />
        <PhotoCaption photo={hero} showMessages={showMessages} showNames={showNames} size="lg" />
      </article>

      <div className="grid gap-3" style={{ gridTemplateRows: `repeat(${side.length}, minmax(0, 1fr))` }}>
        {side.map((photo) => (
          <PhotoTile key={photo.id} photo={photo} sizes="25vw" priority showMessages={showMessages} showNames={showNames} />
        ))}
      </div>
    </section>
  );
}

function SlideshowGallery({
  photos,
  showMessages,
  showNames,
  transition,
  duration,
}: {
  photos: LivePhoto[];
  showMessages: boolean;
  showNames: boolean;
  transition: LiveTransition;
  duration: number;
}) {
  const visiblePhotos = photos.slice(0, 8);
  const animationName = `live-${transition}`;
  const totalDuration = Math.max(visiblePhotos.length, 1) * duration;

  return (
    <section className="absolute inset-x-0 top-0 bottom-[var(--bar)] overflow-hidden">
      {transition === "stories" ? (
        <div
          className="absolute left-6 right-6 top-5 z-30 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${visiblePhotos.length}, minmax(0, 1fr))` }}
        >
          {visiblePhotos.map((photo, index) => (
            <span key={photo.id} className="h-0.5 overflow-hidden rounded-full bg-live-foreground/20">
              <span
                className="block h-full bg-live-foreground"
                style={{
                  animationName: "live-story-progress",
                  animationDuration: `${totalDuration}s`,
                  animationDelay: `${index * duration}s`,
                  animationIterationCount: "infinite",
                  animationFillMode: "both",
                }}
              />
            </span>
          ))}
        </div>
      ) : null}

      {visiblePhotos.map((photo, index) => (
        <article
          key={photo.id}
          className="absolute inset-0 opacity-0"
          style={{
            animationName,
            animationDuration: `${totalDuration}s`,
            animationDelay: `${index * duration}s`,
            animationIterationCount: "infinite",
          }}
        >
          <ContainedPhoto photo={photo} sizes="100vw" priority={index === 0} />
          <PhotoCaption photo={photo} showMessages={showMessages} showNames={showNames} size="lg" />
        </article>
      ))}
    </section>
  );
}

/**
 * Начало вечера: снимков ещё нет или их один-два. Вместо плитки в углу —
 * название события, приглашение и первые кадры крупно по центру.
 */
function WelcomeWall({
  title,
  photos,
  publicUrl,
  qrEnabled,
  showMessages,
  showNames,
  withPanel,
}: {
  title: string;
  photos: LivePhoto[];
  publicUrl: string;
  qrEnabled: boolean;
  showMessages: boolean;
  showNames: boolean;
  /** Слева стоит панель конкурса — композиция уходит правее, чтобы не лечь под неё */
  withPanel: boolean;
}) {
  const empty = photos.length === 0;
  const section = [WALL_SECTION, "flex items-center justify-center", withPanel ? "xl:pl-[30rem]" : ""].join(" ");
  const single = photos.length === 1;
  const hint = qrEnabled ? "Наведите камеру — первые снимки появятся здесь" : "Первые снимки появятся здесь";

  const invitation = (
    <div className={["flex flex-col items-center text-center", empty ? "" : "lg:items-start lg:text-left"].join(" ")}>
      <h1 className="font-serif text-6xl font-medium leading-none lg:text-8xl">{title}</h1>
      <span aria-hidden className="mt-10 block h-px w-20 bg-live-foreground/25" />
      {qrEnabled ? <LiveQr value={publicUrl} size={empty ? 220 : 180} className="mt-10" /> : null}
      <p className="mt-8 max-w-xl text-2xl leading-snug text-live-muted lg:text-3xl">{hint}</p>
    </div>
  );

  if (empty) {
    return <section className={section}>{invitation}</section>;
  }

  return (
    <section className={section}>
      <div className="grid w-full max-w-[100rem] items-center gap-14 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex items-start justify-center gap-6">
          {photos.map((photo) => {
            const hasCaption = showNames || (showMessages && Boolean(photo.message));

            return (
              <figure key={photo.id} className="flex min-w-0 flex-col">
                <div
                  className={[
                    "relative max-w-full overflow-hidden rounded-xl border border-live-foreground/10 bg-live-foreground/5",
                    single ? "aspect-[4/3] h-[56vh]" : "aspect-[3/4] h-[52vh]",
                  ].join(" ")}
                >
                  <ContainedPhoto photo={photo} sizes={single ? "50vw" : "30vw"} priority />
                </div>

                {hasCaption ? (
                  <figcaption className="mt-4 min-w-0">
                    {showNames ? <p className={`truncate ${WALL_OVERLINE}`}>{photo.guest_name}</p> : null}
                    {showMessages && photo.message ? (
                      <p className="mt-1 line-clamp-2 font-serif text-2xl italic leading-snug">{photo.message}</p>
                    ) : null}
                  </figcaption>
                ) : null}
              </figure>
            );
          })}
        </div>

        {invitation}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Нижняя полоса и панель конкурса                                      */
/* ------------------------------------------------------------------ */

function LiveBottomBar({
  title,
  qrUrl,
  qrEffect,
  qrInterval,
}: {
  title: string;
  /** Адрес для QR в полосе; null — QR выключен или уже стоит по центру */
  qrUrl: string | null;
  qrEffect: LiveQrEffect;
  qrInterval: number;
}) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 flex h-[var(--bar)] items-center justify-between gap-8 border-t border-live-foreground/10 bg-live/85 px-8 backdrop-blur">
      <div className="flex min-w-0 items-center gap-6">
        <span className="flex shrink-0 items-center gap-2.5 text-base font-medium uppercase tracking-[0.14em] text-live-muted">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-live-accent" />В эфире
        </span>
        <h1 className="truncate font-serif text-3xl font-medium leading-none lg:text-4xl">{title}</h1>
      </div>

      {qrUrl ? (
        <div
          className="flex shrink-0 items-center gap-5"
          style={{
            animationName: `live-qr-${qrEffect}`,
            animationDuration: `${qrInterval}s`,
            animationIterationCount: "infinite",
          }}
        >
          <p className="hidden max-w-52 text-right text-lg leading-snug text-live-muted md:block">{QR_HINT}</p>
          <LiveQr value={qrUrl} size={100} className="p-2" />
        </div>
      ) : null}
    </footer>
  );
}

function LiveContestPanel({
  teams,
  poll,
  latest,
}: {
  teams: ContestTeam[];
  poll: LivePoll | null;
  latest: LiveGameEntry[];
}) {
  const topTeams = teams.slice(0, 3);

  return (
    <aside className="pointer-events-none fixed bottom-[calc(var(--bar)+1.5rem)] left-6 z-40 hidden w-[26rem] xl:block">
      <div className="space-y-6 rounded-xl border border-live-foreground/10 bg-live/85 p-6 backdrop-blur">
        <p className={WALL_OVERLINE}>Конкурс команд</p>

        {topTeams.length > 0 ? (
          <ol className="divide-y divide-live-foreground/10 border-t border-live-foreground/10">
            {topTeams.map((team, index) => {
              const leads = index === 0 && team.total > 0;

              return (
                <li key={team.id} className="flex items-center gap-4 py-3">
                  <span className={["w-7 shrink-0 font-serif tabular text-2xl", leads ? "text-live-accent" : "text-live-muted"].join(" ")}>
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-serif text-2xl font-medium leading-tight">{team.name}</span>
                  <span className={["shrink-0 font-serif tabular text-3xl font-medium", leads ? "text-live-accent" : ""].join(" ")}>
                    {team.total}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}

        {poll ? (
          <div className="space-y-3">
            <p className="text-xl leading-snug text-live-muted">{poll.prompt}</p>
            <ol className="space-y-3">
              {poll.results.map((result, index) => {
                const leads = index === 0 && result.count > 0;

                return (
                  <li key={result.choice}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="min-w-0 truncate text-xl">{result.choice}</span>
                      <span className={["shrink-0 font-serif tabular text-2xl font-medium", leads ? "text-live-accent" : "text-live-muted"].join(" ")}>
                        {result.share}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-live-foreground/10">
                      <div
                        className={["h-full rounded-full", leads ? "bg-live-accent" : "bg-live-foreground/45"].join(" ")}
                        style={{ width: `${result.share}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        {latest.length > 0 ? (
          <ol className="space-y-4">
            {latest.map((entry) => (
              <li key={entry.id}>
                <p className={`truncate ${WALL_OVERLINE}`}>{entry.guest_name}</p>
                <p className="mt-1 line-clamp-2 font-serif text-2xl italic leading-snug">{entry.content}</p>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Данные                                                               */
/* ------------------------------------------------------------------ */

const loadEvent = cache(async (slug: string) => {
  const supabase = createAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      slug,
      custom_slug,
      brand_name,
      cover_title,
      is_active,
      live_layout,
      live_transition,
      slide_duration_seconds,
      live_qr_effect,
      live_qr_interval_seconds,
      show_messages_on_live,
      show_names_on_live,
      show_qr_on_live
    `,
    )
    .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
    .eq("is_active", true)
    .single();

  return event;
});

/*
 * Подписанные ссылки живут 20 минут. Без кеша каждое обновление (раз в
 * 8 секунд) выдавало бы новый адрес на тот же файл — и все снимки на
 * стене перезапрашивались бы заново с миганием.
 */
const SIGNED_URL_TTL_SECONDS = 60 * 20;
const SIGNED_URL_REUSE_MS = 60 * 15 * 1000;
const signedUrlCache = new Map<string, { url: string; freshUntil: number }>();

async function signedUrlFor(supabase: ReturnType<typeof createAdminClient>, filePath: string) {
  const now = Date.now();
  const cached = signedUrlCache.get(filePath);
  if (cached && cached.freshUntil > now) return cached.url;

  const { data } = await supabase.storage.from("event-photos").createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);
  if (!data?.signedUrl) return "";

  if (signedUrlCache.size > 2000) {
    for (const [key, value] of signedUrlCache) {
      if (value.freshUntil <= now) signedUrlCache.delete(key);
    }
  }
  signedUrlCache.set(filePath, { url: data.signedUrl, freshUntil: now + SIGNED_URL_REUSE_MS });

  return data.signedUrl;
}

function liveTitleOf(event: { cover_title: string | null; brand_name: string | null; title: string }) {
  return event.cover_title || event.brand_name || event.title;
}

/** Доли голосов по вариантам опроса: сначала варианты ведущего, затем всё остальное */
function buildPoll(options: string[], prompt: string, votes: Array<{ content: string }>): LivePoll | null {
  if (votes.length === 0) return null;

  const counts = new Map<string, number>(options.map((option) => [option, 0]));
  for (const vote of votes) {
    counts.set(vote.content, (counts.get(vote.content) ?? 0) + 1);
  }

  return {
    prompt,
    results: Array.from(counts, ([choice, count]) => ({
      choice,
      count,
      share: Math.round((count / votes.length) * 100),
    }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4),
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const event = await loadEvent(decodeURIComponent(rawSlug));

  return {
    title: event ? `${liveTitleOf(event)} · Экран зала` : "Экран зала",
    robots: { index: false, follow: false },
  };
}

export default async function LivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const supabase = createAdminClient();
  const event = await loadEvent(slug);

  if (!event) {
    notFound();
  }

  const { data } = await supabase
    .from("uploads")
    .select("id, guest_name, message, file_path, created_at")
    .eq("event_id", event.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(MAX_WALL_PHOTOS);

  const uploads = data ?? [];

  const photos: LivePhoto[] = await Promise.all(
    uploads.map(async (upload) => ({
      id: upload.id,
      guest_name: upload.guest_name,
      message: upload.message,
      signedUrl: await signedUrlFor(supabase, upload.file_path),
    })),
  );

  const [{ data: gameEntriesData }, { data: pollRows }, contest] = await Promise.all([
    supabase
      .from("game_entries")
      .select("id, game_type, guest_name, content")
      .eq("event_id", event.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("game_entries")
      .select("content")
      .eq("event_id", event.id)
      .eq("game_type", "poll")
      .eq("status", "approved"),
    loadContest(event.id),
  ]);

  const latestEntries = ((gameEntriesData ?? []) as LiveGameEntry[])
    .filter((entry) => !HIDDEN_ON_WALL.has(entry.game_type))
    .slice(0, 2);

  const pollGame = contest.games.find((game) => game.definition.type === "poll");
  const poll = pollGame?.config.isEnabled ? buildPoll(pollGame.config.options, pollGame.config.prompt, pollRows ?? []) : null;

  // Таблица команд нужна, когда конкурс идёт; список команд квиза с нулями — нет
  const contestRunning = contest.games.some(isGamePlayable) || contest.teams.some((team) => team.total > 0);

  const { data: quiz } = await supabase
    .from("event_quizzes")
    .select("id, title, status, starts_at, current_question_index")
    .eq("event_id", event.id)
    .maybeSingle();
  if (quiz?.status === "countdown") {
    const { data: activated } = await supabase.rpc("activate_due_quiz", { p_quiz_id: quiz.id });
    if (activated) quiz.status = "active";
  }
  const { data: quizQuestionRows = [] } = quiz
    ? await supabase
        .from("quiz_questions")
        .select("id, question_text, answers, position")
        .eq("quiz_id", quiz.id)
        .order("position")
    : { data: [] };
  const { data: quizTeamRows = [] } = quiz
    ? await supabase.from("quiz_teams").select("id, name").eq("quiz_id", quiz.id)
    : { data: [] };
  const liveTeamIds = (quizTeamRows ?? []).map((team) => team.id);
  const liveQuestionIds = (quizQuestionRows ?? []).map((question) => question.id);
  const { data: liveMemberRows = [] } = liveTeamIds.length
    ? await supabase.from("quiz_team_members").select("team_id").in("team_id", liveTeamIds)
    : { data: [] };
  const { data: liveAnswerRows = [] } = liveQuestionIds.length
    ? await supabase.from("quiz_answers").select("team_id, points").in("question_id", liveQuestionIds)
    : { data: [] };
  const liveQuizTeams = (quizTeamRows ?? [])
    .map((team) => ({
      ...team,
      members: (liveMemberRows ?? []).filter((member) => member.team_id === team.id).length,
      score: (liveAnswerRows ?? []).filter((answer) => answer.team_id === team.id).reduce((sum, answer) => sum + answer.points, 0),
    }))
    .sort((a, b) => b.score - a.score);
  const liveQuizQuestions = (quizQuestionRows ?? []).map((question) => ({ ...question, answers: question.answers as string[] }));
  const liveQuizStatus = quiz?.status;
  const liveQuizQuestion = quiz ? liveQuizQuestions[quiz.current_question_index] : null;

  const layout = getSafeLayout(event.live_layout);
  const transition = getSafeTransition(event.live_transition);
  const slideDuration = getSafeDuration(event.slide_duration_seconds);
  const qrEffect = getSafeQrEffect(event.live_qr_effect);
  const qrInterval = getSafeQrInterval(event.live_qr_interval_seconds);

  const showMessages = event.show_messages_on_live ?? true;
  const showNames = event.show_names_on_live ?? true;
  const qrEnabled = event.show_qr_on_live ?? false;
  const publicUrl = `${getSiteUrl()}/e/${event.custom_slug || event.slug}`;
  const liveTitle = liveTitleOf(event);

  const panelTeams = contestRunning ? contest.teams : [];
  const hasContestPanel = panelTeams.length > 0 || poll !== null || latestEntries.length > 0;

  const fewPhotos = photos.length <= FEW_PHOTOS_LIMIT;
  // В приглашении QR стоит по центру — в полосе он бы дублировался
  const qrInBar = qrEnabled && !fewPhotos;

  return (
    <main
      className={[
        "relative h-screen overflow-hidden bg-live text-live-foreground",
        qrInBar ? "[--bar:8.5rem]" : "[--bar:5.5rem]",
      ].join(" ")}
    >
      <LiveAutoRefresh />

      <style>{`
        @keyframes live-fade {
          0%, 100% {
            opacity: 0;
            transform: scale(1.03);
          }

          6%, 30% {
            opacity: 1;
            transform: scale(1);
          }

          36% {
            opacity: 0;
            transform: scale(1.01);
          }
        }

        @keyframes live-slide {
          0%, 100% {
            opacity: 0;
            transform: translateX(54px) scale(1.02);
          }

          8%, 30% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }

          38% {
            opacity: 0;
            transform: translateX(-54px) scale(1.02);
          }
        }

        @keyframes live-zoom {
          0%, 100% {
            opacity: 0;
            transform: scale(1.15);
          }

          8%, 30% {
            opacity: 1;
            transform: scale(1.04);
          }

          38% {
            opacity: 0;
            transform: scale(1);
          }
        }

        @keyframes live-stories {
          0%, 100% {
            opacity: 0;
            transform: scale(1.05);
          }

          5%, 32% {
            opacity: 1;
            transform: scale(1);
          }

          38% {
            opacity: 0;
            transform: scale(1.02);
          }
        }

        @keyframes live-story-progress {
          0%, 4% {
            transform: translateX(-100%);
          }

          5%, 32% {
            transform: translateX(0);
          }

          33%, 100% {
            transform: translateX(100%);
          }
        }

        /* QR в полосе всегда виден: эффект — короткое напоминание раз в интервал */
        @keyframes live-qr-fade {
          0%, 88%, 100% {
            opacity: 1;
          }

          94% {
            opacity: 0.35;
          }
        }

        @keyframes live-qr-slide {
          0%, 88%, 100% {
            transform: translateX(0);
          }

          92% {
            transform: translateX(-10px);
          }

          96% {
            transform: translateX(6px);
          }
        }

        @keyframes live-qr-pulse {
          0%, 88%, 100% {
            transform: scale(1);
          }

          94% {
            transform: scale(1.07);
          }
        }

        @keyframes live-qr-stories {
          0%, 88%, 100% {
            transform: translateY(0);
          }

          94% {
            transform: translateY(-8px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      {fewPhotos ? (
        <WelcomeWall
          title={liveTitle}
          photos={photos}
          publicUrl={publicUrl}
          qrEnabled={qrEnabled}
          showMessages={showMessages}
          showNames={showNames}
          withPanel={hasContestPanel}
        />
      ) : null}

      {!fewPhotos && layout === "featured" ? (
        <FeaturedGallery photos={photos} showMessages={showMessages} showNames={showNames} />
      ) : null}

      {!fewPhotos && layout === "slideshow" ? (
        <SlideshowGallery
          photos={photos}
          showMessages={showMessages}
          showNames={showNames}
          transition={transition}
          duration={slideDuration}
        />
      ) : null}

      {!fewPhotos && layout === "compact" ? (
        <CompactGallery photos={photos} showMessages={showMessages} showNames={showNames} />
      ) : null}

      {!fewPhotos && layout === "masonry" ? (
        <MasonryGallery photos={photos} showMessages={showMessages} showNames={showNames} />
      ) : null}

      <LiveBottomBar title={liveTitle} qrUrl={qrInBar ? publicUrl : null} qrEffect={qrEffect} qrInterval={qrInterval} />

      {hasContestPanel ? <LiveContestPanel teams={panelTeams} poll={poll} latest={latestEntries} /> : null}

      {quiz && liveQuizStatus ? (
        <QuizLiveOverlay
          title={quiz.title}
          joinUrl={`${publicUrl}/play`}
          status={liveQuizStatus}
          startsAt={quiz.starts_at}
          question={liveQuizQuestion?.question_text ?? null}
          answers={liveQuizQuestion?.answers ?? []}
          questionIndex={quiz.current_question_index}
          questionsCount={liveQuizQuestions.length}
          teams={liveQuizTeams}
        />
      ) : null}
    </main>
  );
}
