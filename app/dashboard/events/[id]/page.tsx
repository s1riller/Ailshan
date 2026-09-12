import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Check, Download, ExternalLink, Gamepad2, Monitor, ShieldCheck, Users, X } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { EventQrCode } from "@/components/event-qr-code";
import { EventSettingsForm } from "@/components/event-settings-form";
import { EventTabs } from "@/components/event-tabs";
import { GamesAdminPanel, type PendingEntry } from "@/components/games-admin-panel";
import { QuizAdminPanel } from "@/components/quiz-admin-panel";
import { EventStatusBadge, UploadStatusBadge } from "@/components/status-badge";
import { LiveRemote, PinToScreenButton } from "@/components/live-remote";
import { PhotoLightbox, PhotoLightboxTrigger } from "@/components/photo-lightbox";
import { UploadPreview } from "@/components/upload-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bulkModerateUploadsAction, moderateUploadAction } from "@/lib/actions/uploads";
import { requireActiveProfile } from "@/lib/authz";
import { getSiteUrl } from "@/lib/env";
import { loadContest } from "@/lib/games/contest";
import { safeLiveMode } from "@/lib/live-modes";
import { UPLOAD_FILTERS, joinMeta, planLabel } from "@/lib/labels";
import { isPro } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate, plural } from "@/lib/utils";
import type { UploadStatus } from "@/types/database";

import { getActiveTab } from "./tabs";

/** Название события во вкладке браузера: организатор с пятью открытыми событиями различает их */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("title").eq("id", id).maybeSingle();

  return { title: data?.title ? `${data.title} · Ailshan` : "Событие · Ailshan" };
}

/* Подписи для журнала модерации: действие из базы → фраза для организатора */
const LOG_ACTION_LABEL: Record<string, string> = {
  approved: "Снимок одобрен",
  rejected: "Снимок отклонён",
  pending: "Снимок возвращён на модерацию",
  bulk_approved: "Одобрено несколько снимков",
  bulk_rejected: "Отклонено несколько снимков",
};

const LIVE_LAYOUT_LABEL: Record<string, string> = {
  halo: "Карусель",
  masonry: "Плитка",
  featured: "Главный кадр",
  slideshow: "Слайд-шоу",
  compact: "Компактная сетка",
};

const LIVE_TRANSITION_LABEL: Record<string, string> = {
  fade: "Плавное затемнение",
  slide: "Сдвиг",
  zoom: "Приближение",
  stories: "Истории",
};

const timeFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : timeFormatter.format(date);
}

/** Заголовок раздела: капитель, серифный заголовок, ссылка справа и линия снизу */
function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 border-b pb-3">
      <div className="min-w-0">
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-1 font-serif text-2xl font-medium leading-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0 text-sm">{action}</div> : null}
    </div>
  );
}

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
      {children}
    </Link>
  );
}

/** Кнопки модерации: во всю ширину на телефоне, компактные в таблице */
function ModerationActions({
  uploadId,
  eventId,
  status,
  fullWidth = false,
}: {
  uploadId: string;
  eventId: string;
  status: UploadStatus;
  fullWidth?: boolean;
}) {
  return (
    <>
      <form action={moderateUploadAction} className={fullWidth ? "w-full" : undefined}>
        <input type="hidden" name="uploadId" value={uploadId} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="status" value="approved" />
        <SubmitButton
          size={fullWidth ? "default" : "sm"}
          variant={status === "pending" ? "default" : "outline"}
          pendingText="Одобряем…"
          className={fullWidth ? "w-full" : undefined}
          disabled={status === "approved"}
        >
          <Check className="h-4 w-4" />
          Одобрить
        </SubmitButton>
      </form>
      <form action={moderateUploadAction} className={fullWidth ? "w-full" : undefined}>
        <input type="hidden" name="uploadId" value={uploadId} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="status" value="rejected" />
        <SubmitButton
          size={fullWidth ? "default" : "sm"}
          variant="outline"
          pendingText="Отклоняем…"
          className={fullWidth ? "w-full" : undefined}
          disabled={status === "rejected"}
        >
          <X className="h-4 w-4" />
          Отклонить
        </SubmitButton>
      </form>
    </>
  );
}

export default async function EventAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; status?: string; q?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const activeTab = getActiveTab(query.tab);
  const { profile } = await requireActiveProfile();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, title, slug, date, location, is_active, guest_intro, thanks_text, live_layout, live_transition, slide_duration_seconds, live_qr_effect, live_qr_interval_seconds, show_messages_on_live, show_names_on_live, show_qr_on_live, auto_approve, max_file_size_mb, custom_slug, brand_name, brand_color, cover_title, archive_enabled, guest_instruction, photo_limit, live_mode, live_pinned_upload_id",
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (eventError) {
    if (eventError.code === "PGRST116") notFound();
    // Технические детали — в лог; организатору достаточно знать, что делать дальше
    console.error("events.load", eventError);
    throw new Error("Не удалось открыть событие. Обновите страницу через минуту — если не поможет, напишите в поддержку.");
  }
  if (!event) notFound();

  const statusFilter = ["pending", "approved", "rejected"].includes(query.status ?? "") ? query.status : "";
  const search = (query.q ?? "").trim().toLowerCase();
  let uploadsQuery = supabase
    .from("uploads")
    .select("id, guest_name, message, file_path, file_type, status, created_at")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });
  if (statusFilter) uploadsQuery = uploadsQuery.eq("status", statusFilter);
  const { data } = await uploadsQuery;
  const uploads = (data ?? []).filter((upload) => {
    if (!search) return true;
    return `${upload.guest_name} ${upload.message ?? ""}`.toLowerCase().includes(search);
  });

  const admin = createAdminClient();
  const signedUploads = await Promise.all(
    uploads.map(async (upload) => {
      const { data } = await admin.storage.from("event-photos").createSignedUrl(upload.file_path, 60 * 20);
      return { ...upload, signedUrl: data?.signedUrl ?? "" };
    }),
  );

  const { data: allUploads = [] } = await admin
    .from("uploads")
    .select("id, guest_name, message, status, created_at")
    .eq("event_id", event.id);
  const uploadItems = allUploads ?? [];
  const { data: logs = [] } = await admin
    .from("moderation_logs")
    .select("id, action, created_at, upload_id")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(8);
  const guestNameByUpload = new Map(uploadItems.map((upload) => [upload.id, upload.guest_name]));

  const publicSlug = event.custom_slug || event.slug;
  const publicUrl = `${getSiteUrl()}/e/${publicSlug}`;
  const playUrl = `${getSiteUrl()}/e/${publicSlug}/play`;
  const liveUrl = `${getSiteUrl()}/live/${publicSlug}`;
  const galleryUrl = `${getSiteUrl()}/e/${publicSlug}/gallery`;

  // Пульт экрана: текущий режим и снимок, выведенный крупно
  const liveMode = safeLiveMode(event.live_mode);
  const pinnedId: string | null = event.live_pinned_upload_id ?? null;
  const pinnedFromList = pinnedId ? signedUploads.find((upload) => upload.id === pinnedId) : undefined;
  const pinnedPreview = pinnedFromList
    ? { id: pinnedFromList.id, guestName: pinnedFromList.guest_name, signedUrl: pinnedFromList.signedUrl }
    : pinnedId
      ? await (async () => {
          const { data: row } = await admin
            .from("uploads")
            .select("id, guest_name, file_path")
            .eq("id", pinnedId)
            .eq("event_id", event.id)
            .maybeSingle();
          if (!row) return null;
          const { data: signed } = await admin.storage.from("event-photos").createSignedUrl(row.file_path, 60 * 20);
          return { id: row.id, guestName: row.guest_name, signedUrl: signed?.signedUrl ?? "" };
        })()
      : null;
  const uploadStats = {
    total: uploadItems.length,
    pending: uploadItems.filter((upload) => upload.status === "pending").length,
    approved: uploadItems.filter((upload) => upload.status === "approved").length,
    rejected: uploadItems.filter((upload) => upload.status === "rejected").length,
  };
  const guests = Array.from(
    uploadItems.reduce((map, upload) => {
      const key = upload.guest_name || "Гость";
      const current = map.get(key) ?? { name: key, total: 0, lastMessage: "", lastAt: "" };
      current.total += 1;
      current.lastMessage = upload.message || current.lastMessage;
      current.lastAt = upload.created_at;
      map.set(key, current);
      return map;
    }, new Map<string, { name: string; total: number; lastMessage: string; lastAt: string }>()),
  ).map(([, value]) => value);
  const inviteText = `Дорогие гости, делитесь фотографиями с события «${event.title}» по ссылке:\n${publicUrl}\nЛучшие снимки появятся на экране в зале уже сегодня вечером.`;
  const pro = isPro(profile.plan);
  const subtitle = joinMeta(formatDate(event.date), event.location);
  // Конкурс: баллы команд, настройки мини-игр и очередь на подтверждение
  const contest = await loadContest(event.id);
  const teamNameById = new Map(contest.teams.map((team) => [team.id, team.name]));
  const pendingEntries: PendingEntry[] = await Promise.all(
    contest.entries
      .filter((entry) => entry.status === "pending")
      .slice(0, 30)
      .map(async (entry) => {
        const filePath = typeof entry.metadata.filePath === "string" ? entry.metadata.filePath : null;
        const signed = filePath
          ? await admin.storage.from("event-photos").createSignedUrl(filePath, 60 * 20)
          : null;

        return {
          id: entry.id,
          gameType: entry.gameType,
          guestName: entry.guestName,
          teamName: (entry.teamId ? teamNameById.get(entry.teamId) : null) ?? "Без команды",
          content: entry.content,
          score: entry.score,
          createdAt: entry.createdAt,
          photoUrl: signed?.data?.signedUrl ?? null,
        };
      }),
  );

  const { data: quizData } = await admin
    .from("event_quizzes")
    .select("id, title, status, starts_at, current_question_index")
    .eq("event_id", event.id)
    .maybeSingle();
  if (quizData?.status === "countdown") {
    const { data: activated } = await admin.rpc("activate_due_quiz", { p_quiz_id: quizData.id });
    if (activated) quizData.status = "active";
  }
  const { data: quizQuestionData = [] } = quizData
    ? await admin
        .from("quiz_questions")
        .select("id, question_text, answers, correct_answer_index, points, position")
        .eq("quiz_id", quizData.id)
        .order("position")
    : { data: [] };
  const { data: quizTeamData = [] } = quizData
    ? await admin.from("quiz_teams").select("id, name, join_code").eq("quiz_id", quizData.id)
    : { data: [] };
  const quizTeamIds = (quizTeamData ?? []).map((team) => team.id);
  const quizQuestionIds = (quizQuestionData ?? []).map((question) => question.id);
  const { data: quizMemberData = [] } = quizTeamIds.length
    ? await admin.from("quiz_team_members").select("id, team_id").in("team_id", quizTeamIds)
    : { data: [] };
  const { data: quizAnswerData = [] } = quizQuestionIds.length
    ? await admin.from("quiz_answers").select("team_id, points").in("question_id", quizQuestionIds)
    : { data: [] };
  const quizTeams = (quizTeamData ?? []).map((team) => ({
    ...team,
    members: (quizMemberData ?? []).filter((member) => member.team_id === team.id).length,
    score: (quizAnswerData ?? [])
      .filter((answer) => answer.team_id === team.id)
      .reduce((sum, answer) => sum + answer.points, 0),
  }));
  const quizQuestions = (quizQuestionData ?? []).map((question) => ({
    ...question,
    answers: question.answers as string[],
  }));

  const uploadsHref = (status: string) => `/dashboard/events/${event.id}?tab=uploads${status ? `&status=${status}` : ""}`;

  return (
    <div className="space-y-6">
      {/* Шапка события */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <EventStatusBadge isActive={event.is_active} />
            {event.auto_approve ? <Badge variant="outline">Автоодобрение</Badge> : null}
            <span className="eyebrow">тариф {planLabel(profile.plan)}</span>
          </div>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">{event.title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-wrap">
          <Button asChild variant="outline" className="w-full px-2 lg:w-auto lg:px-4">
            <Link href={publicUrl} target="_blank">
              <Users className="h-4 w-4" />
              <span className="lg:hidden">Гостевая</span>
              <span className="hidden lg:inline">Гостевая страница</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full px-2 lg:w-auto lg:px-4">
            <Link href={playUrl} target="_blank">
              <Gamepad2 className="h-4 w-4" />
              Игры
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full px-2 lg:w-auto lg:px-4">
            <Link href={liveUrl} target="_blank">
              <Monitor className="h-4 w-4" />
              <span className="lg:hidden">Проектор</span>
              <span className="hidden lg:inline">Открыть на проекторе</span>
            </Link>
          </Button>
        </div>
      </div>

      <EventTabs eventId={event.id} active={activeTab} />

      {activeTab === "overview" ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              ["Всего снимков", uploadStats.total, ""],
              ["На модерации", uploadStats.pending, "pending"],
              ["Одобрено", uploadStats.approved, "approved"],
              ["Отклонено", uploadStats.rejected, "rejected"],
            ].map(([label, value, filter]) => (
              <Link key={String(label)} href={uploadsHref(String(filter))} className="group">
                <Card className="h-full p-4 transition-colors group-hover:bg-secondary/60 sm:p-5">
                  <div className="eyebrow">{label}</div>
                  <div className="mt-2 font-serif tabular text-3xl font-medium">{value}</div>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <section className="space-y-4">
              <SectionHeader
                eyebrow="Обзор"
                title="Последние загрузки"
                action={<SectionLink href={uploadsHref("")}>Все загрузки</SectionLink>}
              />
              {signedUploads.length === 0 ? (
                <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Снимков пока нет — гости ещё не начали.
                </p>
              ) : (
                <PhotoLightbox
                  photos={signedUploads.slice(0, 6).map((upload) => ({
                    id: upload.id,
                    url: upload.signedUrl,
                    guestName: upload.guest_name,
                    message: upload.message,
                  }))}
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {signedUploads.slice(0, 6).map((upload, index) => (
                      <article key={upload.id} className="overflow-hidden rounded-xl border bg-card">
                        <PhotoLightboxTrigger index={index} label={`Открыть снимок: ${upload.guest_name}`}>
                          <div className="relative aspect-square bg-secondary">
                            {upload.signedUrl ? (
                              <Image src={upload.signedUrl} alt="" fill className="object-cover" sizes="240px" />
                            ) : null}
                          </div>
                        </PhotoLightboxTrigger>
                        <div className="space-y-1.5 p-3">
                          <p className="truncate text-sm font-medium">{upload.guest_name}</p>
                          <UploadStatusBadge status={upload.status} />
                        </div>
                      </article>
                    ))}
                  </div>
                </PhotoLightbox>
              )}
            </section>

            <div className="space-y-8">
              <section className="space-y-4">
                <SectionHeader eyebrow="Обзор" title="Быстрые ссылки" />
                <code className="block break-all rounded-lg border bg-secondary/60 p-3 text-xs">{publicUrl}</code>
                <div className="grid grid-cols-2 gap-2">
                  <CopyButton value={publicUrl} label="Скопировать" className="w-full" />
                  <Button asChild variant="outline" className="w-full">
                    <Link href={liveUrl} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                      Проектор
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="col-span-2 w-full">
                    <Link href={galleryUrl} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                      Галерея для гостей
                    </Link>
                  </Button>
                </div>
              </section>

              <section className="space-y-4">
                <SectionHeader eyebrow="Обзор" title="Журнал модерации" />
                {(logs ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Решений по снимкам пока не было.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {(logs ?? []).map((log) => (
                      <li key={log.id} className="flex items-baseline justify-between gap-3 py-2">
                        <span className="min-w-0">
                          <span className="block">{LOG_ACTION_LABEL[log.action] ?? log.action}</span>
                          {log.upload_id && guestNameByUpload.get(log.upload_id) ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {guestNameByUpload.get(log.upload_id)}
                            </span>
                          ) : null}
                        </span>
                        <span className="tabular shrink-0 text-xs text-muted-foreground">{formatTime(log.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "uploads" ? (
        <section className="space-y-4">
          <SectionHeader
            eyebrow="Модерация"
            title="Загрузки гостей"
            description={`${plural(uploadStats.total, "снимок", "снимка", "снимков")}, ${uploadStats.pending} на модерации.`}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {UPLOAD_FILTERS.map(([value, label]) => {
                const active = statusFilter === value;

                return (
                  <Link
                    key={value || "all"}
                    href={uploadsHref(value)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
                      active ? "border-accent bg-accent-soft text-accent" : "bg-card text-foreground hover:bg-secondary",
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
            <form className="flex gap-2 sm:w-80">
              <input type="hidden" name="tab" value="uploads" />
              {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
              <Input name="q" placeholder="Поиск по имени" defaultValue={query.q ?? ""} aria-label="Поиск по имени" />
              <Button type="submit" variant="outline" className="shrink-0">
                Найти
              </Button>
            </form>
          </div>

          {signedUploads.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {search || statusFilter ? "По этому запросу снимков нет." : "Снимков пока нет — гости ещё не начали."}
            </p>
          ) : (
            <>
              {/* Телефон: карточки — фото крупнее, кнопки модерации под палец */}
              <div className="space-y-3 lg:hidden">
                {signedUploads.map((upload) => (
                  <article key={upload.id} className="overflow-hidden rounded-xl border bg-card">
                    <div className="flex gap-3 p-3">
                      <UploadPreview
                        signedUrl={upload.signedUrl}
                        guestName={upload.guest_name}
                        message={upload.message}
                        className="h-20 w-20"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-medium">{upload.guest_name}</p>
                          <UploadStatusBadge status={upload.status} className="shrink-0" />
                        </div>
                        {upload.message ? (
                          <p className="mt-1 line-clamp-2 font-serif text-base leading-snug">{upload.message}</p>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">Без пожелания</p>
                        )}
                        <label className="mt-2 inline-flex min-h-8 items-center gap-2 text-xs text-muted-foreground">
                          <input
                            form="bulk-moderation"
                            type="checkbox"
                            name="uploadIds"
                            value={upload.id}
                            className="h-5 w-5 rounded border-input"
                          />
                          Выбрать
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t p-3">
                      <ModerationActions uploadId={upload.id} eventId={event.id} status={upload.status} fullWidth />
                      <PinToScreenButton
                        eventId={event.id}
                        uploadId={upload.id}
                        status={upload.status}
                        pinnedId={pinnedId}
                        size="default"
                        className="col-span-2"
                      />
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <span className="sr-only">Выбрать</span>
                      </TableHead>
                      <TableHead>Фото</TableHead>
                      <TableHead>Гость</TableHead>
                      <TableHead>Пожелание</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signedUploads.map((upload) => (
                      <TableRow key={upload.id}>
                        <TableCell>
                          <input
                            form="bulk-moderation"
                            type="checkbox"
                            name="uploadIds"
                            value={upload.id}
                            aria-label={`Выбрать снимок: ${upload.guest_name}`}
                            className="h-4 w-4 rounded border-input"
                          />
                        </TableCell>
                        <TableCell>
                          <UploadPreview
                            signedUrl={upload.signedUrl}
                            guestName={upload.guest_name}
                            message={upload.message}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{upload.guest_name}</TableCell>
                        <TableCell className={cn("max-w-[280px]", upload.message ? "font-serif text-base" : "text-muted-foreground")}>
                          {upload.message || "—"}
                        </TableCell>
                        <TableCell>
                          <UploadStatusBadge status={upload.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <ModerationActions uploadId={upload.id} eventId={event.id} status={upload.status} />
                            <PinToScreenButton eventId={event.id} uploadId={upload.id} status={upload.status} pinnedId={pinnedId} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/*
                Форма массовой модерации: чекбоксы в карточках и таблице привязаны к ней
                через атрибут form, а кнопки лежат внутри — иначе они не узнают о состоянии отправки.
              */}
              <form
                id="bulk-moderation"
                action={bulkModerateUploadsAction}
                className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center"
              >
                <input type="hidden" name="eventId" value={event.id} />
                <span className="text-sm text-muted-foreground sm:mr-auto">Для отмеченных снимков</span>
                <SubmitButton name="status" value="approved" variant="outline" pendingText="Одобряем…" className="w-full sm:w-auto">
                  <ShieldCheck className="h-4 w-4" />
                  Одобрить выбранные
                </SubmitButton>
                <SubmitButton name="status" value="rejected" variant="outline" pendingText="Отклоняем…" className="w-full sm:w-auto">
                  <X className="h-4 w-4" />
                  Отклонить выбранные
                </SubmitButton>
              </form>
            </>
          )}
        </section>
      ) : null}

      {activeTab === "live" ? (
        <div className="space-y-10">
        <LiveRemote eventId={event.id} mode={liveMode} pinned={pinnedPreview} liveUrl={liveUrl} />
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="space-y-4">
            <SectionHeader
              eyebrow="Экран зала"
              title="Предпросмотр экрана"
              description="Так снимки выглядят на проекторе — первые одобренные кадры."
            />
            <div className="overflow-hidden rounded-xl bg-live p-4 text-live-foreground sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="truncate font-serif text-xl font-medium">
                  {event.cover_title || event.brand_name || event.title}
                </span>
                <span className="tabular shrink-0 text-xs text-live-muted">
                  кадр каждые {event.slide_duration_seconds ?? 5} с
                </span>
              </div>
              {signedUploads.length === 0 ? (
                <p className="py-10 text-center text-sm text-live-muted">
                  Экран пока пуст — первые одобренные снимки появятся здесь.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {signedUploads.slice(0, 6).map((upload, index) => (
                    <div
                      key={upload.id}
                      className={cn(
                        "relative overflow-hidden rounded-lg bg-live-foreground/10",
                        index === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square",
                      )}
                    >
                      {upload.signedUrl ? (
                        <Image src={upload.signedUrl} alt="" fill className="object-cover" sizes="240px" />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader
              eyebrow="Экран зала"
              title="Параметры экрана"
              action={<SectionLink href={`/dashboard/events/${event.id}?tab=settings`}>Изменить</SectionLink>}
            />
            <dl className="divide-y text-sm">
              {[
                ["Раскладка", LIVE_LAYOUT_LABEL[event.live_layout ?? "masonry"] ?? event.live_layout],
                ["Эффект", LIVE_TRANSITION_LABEL[event.live_transition ?? "fade"] ?? event.live_transition],
                ["Имена гостей", event.show_names_on_live ? "показываются" : "скрыты"],
                ["Пожелания", event.show_messages_on_live ? "показываются" : "скрыты"],
                ["QR-код", event.show_qr_on_live ? "показывается" : "скрыт"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <Button asChild variant="outline" className="w-full">
              <Link href={liveUrl} target="_blank">
                <Monitor className="h-4 w-4" />
                Открыть на проекторе
              </Link>
            </Button>
          </section>
        </div>
        </div>
      ) : null}

      {activeTab === "games" ? (
        <div className="space-y-10">
          <LiveRemote eventId={event.id} mode={liveMode} pinned={pinnedPreview} liveUrl={liveUrl} compact />
          <QuizAdminPanel
            eventId={event.id}
            playUrl={playUrl}
            liveUrl={liveUrl}
            quiz={quizData as Parameters<typeof QuizAdminPanel>[0]["quiz"]}
            questions={quizQuestions}
            teams={quizTeams}
          />
          <GamesAdminPanel
            eventId={event.id}
            teams={contest.teams}
            games={contest.games.map((game) => game.config)}
            pendingEntries={pendingEntries}
            hasQuiz={Boolean(contest.quizId)}
          />
        </div>
      ) : null}

      {activeTab === "guests" ? (
        <section className="space-y-4">
          <SectionHeader
            eyebrow="Гости"
            title="Кто загружал"
            description={`${plural(guests.length, "гость", "гостя", "гостей")} оставили снимки.`}
          />
          {guests.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Имена появятся, когда гости загрузят первые снимки.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Снимков</TableHead>
                  <TableHead>Последнее пожелание</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((guest) => (
                  <TableRow key={guest.name}>
                    <TableCell className="font-medium">{guest.name}</TableCell>
                    <TableCell className="tabular">{guest.total}</TableCell>
                    <TableCell className={guest.lastMessage ? "font-serif text-base" : "text-muted-foreground"}>
                      {guest.lastMessage || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      ) : null}

      {activeTab === "qr" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div>
                <div className="eyebrow">Для гостей</div>
                <h2 className="mt-1 font-serif text-2xl font-medium">QR на столы и в приглашение</h2>
                <p className="mt-1 text-sm text-muted-foreground">Для печати, экрана или рассылки.</p>
              </div>
              <EventQrCode
                value={publicUrl}
                title={event.cover_title || event.brand_name || event.title}
                color={event.brand_color}
              />
              <code className="block break-all rounded-lg border bg-secondary/60 p-3 text-xs">{publicUrl}</code>
              <CopyButton value={publicUrl} label="Скопировать ссылку" className="w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div>
                <div className="eyebrow">Для технической команды</div>
                <h2 className="mt-1 font-serif text-2xl font-medium">QR для экрана зала</h2>
                <p className="mt-1 text-sm text-muted-foreground">Чтобы открыть экран на проекторе с любого устройства.</p>
              </div>
              <EventQrCode value={liveUrl} title="Экран зала" color={event.brand_color} />
              <code className="block break-all rounded-lg border bg-secondary/60 p-3 text-xs">{liveUrl}</code>
              <CopyButton value={liveUrl} label="Скопировать ссылку" className="w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div>
                <div className="eyebrow">Для гостей</div>
                <h2 className="mt-1 font-serif text-2xl font-medium">QR в общую галерею</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Все одобренные снимки вечера, обновляется сама. Хорошо смотрится на фотозоне и у выхода.
                </p>
              </div>
              <EventQrCode value={galleryUrl} title="Галерея вечера" color={event.brand_color} />
              <code className="block break-all rounded-lg border bg-secondary/60 p-3 text-xs">{galleryUrl}</code>
              <CopyButton value={galleryUrl} label="Скопировать ссылку" className="w-full" />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "branding" || activeTab === "settings" ? (
        <section className="space-y-4">
          <SectionHeader
            eyebrow={activeTab === "branding" ? "Оформление" : "Настройки"}
            title={activeTab === "branding" ? "Оформление и тексты" : "Настройки события"}
            description="Все параметры события собраны в одной форме."
          />
          <Card>
            <CardContent className="p-5 sm:p-6">
              <EventSettingsForm event={event} isPro={pro} />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeTab === "export" ? (
        <section className="space-y-4">
          <SectionHeader
            eyebrow="После события"
            title="Экспорт"
            description="Архив фотографий и файл с пожеланиями."
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/dashboard/events/${event.id}/export`}>
                <Download className="h-4 w-4" />
                Открыть экспорт
              </Link>
            </Button>
            {!pro ? <p className="text-sm text-muted-foreground">Архив доступен на тарифе Премиум.</p> : null}
          </div>
        </section>
      ) : null}

      {activeTab === "communications" ? (
        <section className="space-y-4">
          <SectionHeader eyebrow="Гостям" title="Приглашение" description="Готовые тексты для мессенджеров и почты." />
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <label htmlFor="invite-text" className="text-sm font-medium">
                Текст приглашения
              </label>
              <textarea
                id="invite-text"
                rows={7}
                className="w-full rounded-lg border bg-card p-3 font-serif text-base leading-relaxed"
                readOnly
                value={inviteText}
              />
              <CopyButton value={inviteText} label="Скопировать приглашение" className="w-full sm:w-auto" />
            </div>
            <div className="space-y-2 rounded-xl border bg-card p-4 text-sm">
              <div className="eyebrow">Подсказка на гостевой странице</div>
              <p className="text-muted-foreground">
                {event.guest_instruction || "Не задана — добавьте её во вкладке «Настройки»."}
              </p>
              <p className="pt-2">
                <SectionLink href={`/dashboard/events/${event.id}?tab=settings`}>Изменить тексты</SectionLink>
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
