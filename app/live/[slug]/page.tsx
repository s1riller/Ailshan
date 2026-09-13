import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { LiveAutoRefresh } from "@/components/live-auto-refresh";
import { LiveHaloReel } from "@/components/live-halo-reel";
import { ContainedPhoto, PhotoCaption, WALL_OVERLINE, type LivePhoto } from "@/components/live-photo-tiles";
import { LiveFeaturedGrid, LiveWallGrid } from "@/components/live-wall-grid";
import { LivePinnedPhoto } from "@/components/live-pinned-photo";
import { LiveStage } from "@/components/live-stage";
import { LiveWelcome } from "@/components/live-welcome";
import { PhotoLightbox, PhotoLightboxTrigger, type LightboxPhoto } from "@/components/photo-lightbox";
import { joinMeta } from "@/lib/labels";
import { safeLiveMode } from "@/lib/live-modes";
import { formatDate } from "@/lib/utils";
import { LiveQr } from "@/components/live-qr";
import { QuizLiveOverlay } from "@/components/quiz-live-overlay";
import { getSiteUrl } from "@/lib/env";
import { isGamePlayable, loadContest, type ContestTeam } from "@/lib/games/contest";
import { createAdminClient } from "@/lib/supabase/admin";
import { throwIfQueryFailed } from "@/lib/supabase/errors";

export const revalidate = 5;

type LiveLayout = "masonry" | "featured" | "slideshow" | "compact" | "halo";
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

const allowedLayouts: LiveLayout[] = ["masonry", "featured", "slideshow", "compact", "halo"];
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
/* Раскладки                                                            */
/* ------------------------------------------------------------------ */

/** Область стены над нижней полосой; высота полосы — переменная --bar на <main> */
const WALL_SECTION = "absolute inset-x-0 top-0 bottom-[var(--bar)] p-6";

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
  const section = [WALL_SECTION, "flex items-center justify-center", withPanel ? "stage-xl:pl-[30rem]" : ""].join(" ");
  const single = photos.length === 1;
  const hint = qrEnabled ? "Наведите камеру — первые снимки появятся здесь" : "Первые снимки появятся здесь";

  const invitation = (
    <div className={["flex flex-col items-center text-center", empty ? "" : "lg:items-start lg:text-left"].join(" ")}>
      <h1 className="font-serif text-[clamp(calc(5*var(--u)),4cqw,calc(10*var(--u)))] font-medium leading-none">{title}</h1>
      <span aria-hidden className="mt-10 block h-px w-20 bg-live-foreground/25 wide:mt-6" />
      {qrEnabled ? <LiveQr value={publicUrl} size={empty ? 220 : 180} max="34cqh" className="mt-10 wide:mt-6" /> : null}
      <p className="mt-8 max-w-xl text-[calc(1.4*var(--t))] leading-snug text-live-muted wide:mt-5">{hint}</p>
    </div>
  );

  if (empty) {
    return <section className={section}>{invitation}</section>;
  }

  return (
    <section className={section}>
      <div className="grid w-full max-w-[100rem] items-center gap-14 stage-lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] tall:grid-cols-1">
        <div className="flex items-start justify-center gap-6">
          {photos.map((photo, index) => {
            const hasCaption = showNames || (showMessages && Boolean(photo.message));

            return (
              <figure key={photo.id} className="flex min-w-0 flex-col">
                <div
                  className={[
                    "relative max-w-full overflow-hidden rounded-xl border border-live-foreground/10 bg-live-foreground/5",
                    single ? "aspect-[4/3] h-[56cqh]" : "aspect-[3/4] h-[52cqh]",
                  ].join(" ")}
                >
                  <ContainedPhoto photo={photo} sizes={single ? "50vw" : "30vw"} priority />
                  <PhotoLightboxTrigger index={index} className="absolute inset-0 z-10 cursor-pointer" label="Открыть снимок на весь экран" />
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
      <h1 className="min-w-0 truncate font-serif text-3xl font-medium leading-none lg:text-4xl">{title}</h1>

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
          <LiveQr value={qrUrl} size={100} max="calc(var(--bar) - 1.5rem)" className="p-2" />
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
    <aside className="pointer-events-none fixed bottom-[calc(var(--bar)+1.5rem)] left-6 z-40 hidden max-h-[calc(100cqh-var(--bar)-3rem)] w-[26rem] overflow-hidden rounded-xl stage-xl:block">
      <div className="space-y-6 rounded-xl border border-live-foreground/10 bg-live/85 p-6 backdrop-blur wide:space-y-4 wide:p-5">
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
          <ol className="space-y-4 wide:hidden">
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

  const { data: event, error } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      slug,
      custom_slug,
      brand_name,
      cover_title,
      date,
      location,
      is_active,
      live_layout,
      live_transition,
      slide_duration_seconds,
      live_qr_effect,
      live_qr_interval_seconds,
      show_messages_on_live,
      show_names_on_live,
      show_qr_on_live,
      live_mode,
      live_pinned_upload_id,
      live_screen_width,
      live_screen_height
    `,
    )
    .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
    .eq("is_active", true)
    .single();

  throwIfQueryFailed(error, "live/event");

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

/** Таблица команд на весь экран — режим «Таблица команд» с пульта ведущего */
function LiveContestBoard({
  title,
  teams,
  poll,
  latest,
}: {
  title: string;
  teams: ContestTeam[];
  poll: LivePoll | null;
  latest: LiveGameEntry[];
}) {
  const rows = teams.slice(0, 10);
  const leaderTotal = rows[0]?.total ?? 0;

  return (
    <section className={[WALL_SECTION, "grid grid-cols-[1.4fr_1fr] gap-12 px-12 py-10 wide:grid-cols-[2fr_1fr] wide:py-6"].join(" ")}>
      <div className="flex min-h-0 flex-col">
        <p className={WALL_OVERLINE}>Конкурс команд</p>
        <h1 className="mt-3 font-serif text-[calc(3.6*var(--t))] font-medium leading-none">{title}</h1>
        {rows.length > 0 ? (
          <ol className="mt-8 divide-y divide-live-foreground/10 border-t border-live-foreground/10 wide:mt-5 wide:columns-2 wide:gap-x-12 wide:divide-y-0 wide:border-t-0">
            {rows.map((team, index) => {
              const leads = index === 0 && team.total > 0;
              const share = leaderTotal > 0 ? Math.max(4, Math.round((team.total / leaderTotal) * 100)) : 0;

              return (
                <li key={team.id} className="grid grid-cols-[3rem_1fr_auto] items-center gap-6 py-4 wide:break-inside-avoid wide:border-b wide:border-live-foreground/10 wide:py-3">
                  <span className={["font-serif tabular text-[calc(2.4*var(--t))] leading-none", leads ? "text-live-accent" : "text-live-muted"].join(" ")}>
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-serif text-[calc(2.2*var(--t))] font-medium leading-none">{team.name}</div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-live-foreground/10">
                      <div
                        className={["h-full rounded-full", leads ? "bg-live-accent" : "bg-live-muted"].join(" ")}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                  <span className={["font-serif tabular text-[calc(3*var(--t))] leading-none", leads ? "text-live-accent" : ""].join(" ")}>
                    {team.total}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-10 text-2xl text-live-muted">Команды появятся, когда гости присоединятся к игре.</p>
        )}
      </div>

      <div className="flex min-h-0 flex-col gap-10 border-l border-live-foreground/10 pl-12">
        {poll ? (
          <div>
            <p className={WALL_OVERLINE}>Опрос</p>
            <p className="mt-3 font-serif text-[calc(2*var(--t))] leading-tight">{poll.prompt}</p>
            <ul className="mt-6 space-y-4">
              {poll.results.slice(0, 5).map((result) => (
                <li key={result.choice}>
                  <div className="flex items-baseline justify-between gap-4 text-xl">
                    <span className="truncate">{result.choice}</span>
                    <span className="tabular text-live-muted">{result.share}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-live-foreground/10">
                    <div className="h-full rounded-full bg-live-accent" style={{ width: `${Math.max(3, result.share)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {latest.length > 0 ? (
          <div>
            <p className={WALL_OVERLINE}>Последние ответы</p>
            <ul className="mt-4 space-y-5">
              {latest.slice(0, 4).map((entry) => (
                <li key={entry.id}>
                  <div className="text-base font-medium uppercase tracking-[0.18em] text-live-muted">{entry.guest_name}</div>
                  <p className="mt-1 line-clamp-2 font-serif text-[calc(1.6*var(--t))] italic leading-snug">{entry.content}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Закреплённый снимок может быть старше выборки стены — тогда грузим его отдельно */
async function loadPinned(
  supabase: ReturnType<typeof createAdminClient>,
  uploadId: string,
  eventId: string,
): Promise<LivePhoto | null> {
  const { data: upload } = await supabase
    .from("uploads")
    .select("id, guest_name, message, file_path")
    .eq("id", uploadId)
    .eq("event_id", eventId)
    .eq("status", "approved")
    .maybeSingle();
  if (!upload) return null;

  return {
    id: upload.id,
    guest_name: upload.guest_name,
    message: upload.message,
    signedUrl: await signedUrlFor(supabase, upload.file_path),
  };
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

  const { data, error: uploadsError } = await supabase
    .from("uploads")
    .select("id, guest_name, message, file_path, created_at")
    .eq("event_id", event.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(MAX_WALL_PHOTOS);

  throwIfQueryFailed(uploadsError, "live/uploads");
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

  // Режим экрана выбирает ведущий из кабинета; «авто» — заставка, пока снимков нет
  const mode = safeLiveMode(event.live_mode);
  const fewPhotos = photos.length <= FEW_PHOTOS_LIMIT;
  const showBoard = mode === "contest";
  const showWelcome = !showBoard && (mode === "welcome" || photos.length === 0);
  const showFewPhotos = !showBoard && !showWelcome && fewPhotos;
  const showGallery = !showBoard && !showWelcome && !showFewPhotos;
  const withPanel = mode === "split" && hasContestPanel && !showBoard;
  // В приглашении и на заставке QR стоит по центру — в полосе он бы дублировался
  const qrInBar = qrEnabled && showGallery;

  // Снимки стены для просмотра на весь экран по клику
  const wallPhotos: LightboxPhoto[] = photos
    .filter((photo) => photo.signedUrl)
    .map((photo) => ({
      id: photo.id,
      url: photo.signedUrl,
      guestName: showNames ? photo.guest_name : null,
      message: showMessages ? photo.message : null,
    }));

  // Снимок, выведенный ведущим на экран крупно
  const pinned = event.live_pinned_upload_id
    ? (photos.find((photo) => photo.id === event.live_pinned_upload_id) ??
      (await loadPinned(supabase, event.live_pinned_upload_id, event.id)))
    : null;

  // Ручной размер экрана: сцена рисуется в этих пикселях и сжимается под окно
  const screen =
    event.live_screen_width && event.live_screen_height
      ? { width: event.live_screen_width, height: event.live_screen_height }
      : null;

  return (
    <LiveStage
      screen={screen}
      className={[
        // --u: 1 % ширины 16:9-кадра, вписанного в сцену. На проекторе это 1 %
        // ширины, на LED-полосе 3:1 или вертикальной панели считается от
        // высоты — так шрифты стены не раздуваются, когда экран шире, чем выше.
        // Единицы контейнерные (cqw/cqh): сцена может быть больше окна.
        "bg-live text-live-foreground [--u:min(1cqw,1.7778cqh)] [--t:max(var(--u),0.65cqw)]",
        showWelcome ? "[--bar:0rem]" : qrInBar ? "[--bar:min(8.5rem,20cqh)]" : "[--bar:min(5.5rem,13cqh)]",
      ].join(" ")}
    >
      <LiveAutoRefresh keepAwake />
      <PhotoLightbox photos={wallPhotos} size="wall">

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

      {showWelcome ? (
        <LiveWelcome title={liveTitle} subtitle={joinMeta(formatDate(event.date), event.location) || null} qrUrl={qrEnabled ? publicUrl : null} />
      ) : null}

      {showFewPhotos ? (
        <WelcomeWall
          title={liveTitle}
          photos={photos}
          publicUrl={publicUrl}
          qrEnabled={qrEnabled}
          showMessages={showMessages}
          showNames={showNames}
          withPanel={withPanel}
        />
      ) : null}

      {showGallery && layout === "halo" ? (
        <LiveHaloReel
          photos={photos.map((photo) => ({
            id: photo.id,
            url: `/api/photo/${photo.id}`,
            guestName: photo.guest_name,
            message: photo.message,
          }))}
          title={liveTitle}
          showNames={showNames}
          showMessages={showMessages}
          withPanel={withPanel}
        />
      ) : null}

      {showGallery && layout === "featured" ? (
        <LiveFeaturedGrid photos={photos} showMessages={showMessages} showNames={showNames} />
      ) : null}

      {showGallery && layout === "slideshow" ? (
        <SlideshowGallery
          photos={photos}
          showMessages={showMessages}
          showNames={showNames}
          transition={transition}
          duration={slideDuration}
        />
      ) : null}

      {showGallery && layout === "compact" ? (
        <LiveWallGrid mode="compact" photos={photos} showMessages={showMessages} showNames={showNames} />
      ) : null}

      {showGallery && layout === "masonry" ? (
        <LiveWallGrid mode="masonry" photos={photos} showMessages={showMessages} showNames={showNames} />
      ) : null}

      {showBoard ? <LiveContestBoard title={liveTitle} teams={contest.teams} poll={poll} latest={latestEntries} /> : null}

      {pinned ? (
        <LivePinnedPhoto
          url={pinned.signedUrl}
          guestName={pinned.guest_name}
          message={pinned.message}
          showNames={showNames}
          showMessages={showMessages}
        />
      ) : null}

      {!showWelcome ? (
        <LiveBottomBar title={liveTitle} qrUrl={qrInBar ? publicUrl : null} qrEffect={qrEffect} qrInterval={qrInterval} />
      ) : null}

      {withPanel ? <LiveContestPanel teams={panelTeams} poll={poll} latest={latestEntries} /> : null}
      </PhotoLightbox>

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
    </LiveStage>
  );
}
