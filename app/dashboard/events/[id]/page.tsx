import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ComponentType } from "react";
import {
  BarChart3,
  Check,
  Download,
  ExternalLink,
  Eye,
  Gamepad2,
  ImageIcon,
  MessageCircle,
  Monitor,
  Palette,
  QrCode,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { EventQrCode } from "@/components/event-qr-code";
import { EventSettingsForm } from "@/components/event-settings-form";
import { QuizAdminPanel } from "@/components/quiz-admin-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bulkModerateUploadsAction, moderateUploadAction } from "@/lib/actions/uploads";
import { requireActiveProfile } from "@/lib/authz";
import { getSiteUrl } from "@/lib/env";
import { isPro } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { UploadStatus } from "@/types/database";

type EventTab =
  | "overview"
  | "uploads"
  | "live"
  | "games"
  | "guests"
  | "qr"
  | "branding"
  | "settings"
  | "export"
  | "communications";

const tabs: Array<[EventTab, string, ComponentType<{ className?: string }>, string]> = [
  ["overview", "Обзор", BarChart3, "Сводка"],
  ["uploads", "Загрузки", ImageIcon, "Фото"],
  ["live", "Live", Monitor, "Экран"],
  ["games", "Игры", Gamepad2, "Интерактив"],
  ["guests", "Гости", Users, "Имена"],
  ["qr", "QR", QrCode, "Коды"],
  ["branding", "Брендинг", Palette, "Стиль"],
  ["settings", "Настройки", Settings, "Правила"],
  ["export", "Экспорт", Download, "Архив"],
  ["communications", "Коммуникации", MessageCircle, "Тексты"],
];

function statusBadge(status: UploadStatus) {
  if (status === "approved") return <Badge>Одобрено</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Отклонено</Badge>;
  return <Badge variant="secondary">pending</Badge>;
}

function getActiveTab(value?: string): EventTab {
  return tabs.some(([tab]) => tab === value) ? (value as EventTab) : "overview";
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
      "id, title, slug, date, location, is_active, guest_intro, thanks_text, live_layout, live_transition, slide_duration_seconds, live_qr_effect, live_qr_interval_seconds, show_messages_on_live, show_names_on_live, show_qr_on_live, auto_approve, max_file_size_mb, custom_slug, brand_name, brand_color, cover_title, archive_enabled, guest_instruction, photo_limit",
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (eventError) {
    if (eventError.code === "PGRST116") notFound();
    throw new Error(
      `Не удалось загрузить мероприятие: ${eventError.message}. Выполните supabase/event-control-center.sql и предыдущие миграции.`,
    );
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

  const publicSlug = event.custom_slug || event.slug;
  const publicUrl = `${getSiteUrl()}/e/${publicSlug}`;
  const playUrl = `${getSiteUrl()}/e/${publicSlug}/play`;
  const liveUrl = `${getSiteUrl()}/live/${publicSlug}`;
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
  const inviteText = `Привет! Загрузи фото с мероприятия «${event.title}» по ссылке:\n${publicUrl}\nФото появятся на live-экране после модерации.`;
  const pro = isPro(profile.plan);
  const { data: gameEntriesData = [] } = await admin
    .from("game_entries")
    .select("id, game_type, guest_name, content, metadata, score, status, created_at")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(80);
  const gameEntries = gameEntriesData ?? [];
  const { data: photoVotesData = [] } = await admin
    .from("photo_votes")
    .select("id, upload_id, guest_name, created_at")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(80);
  const photoVotes = photoVotesData ?? [];
  const gameLabels: Record<string, string> = {
    photo_challenge: "Фото-челлендж",
    bingo: "Бинго",
    question: "Вопрос дня",
    guess_guest: "Угадай гостя",
    wheel_task: "Колесо заданий",
    team_battle: "Битва команд",
    poll: "Опрос",
    secret_mission: "Тайная миссия",
    time_capsule: "Капсула пожеланий",
    millionaire: "Миллионер",
  };
  const gameStats = Object.entries(gameLabels).map(([type, label]) => ({
    type,
    label,
    count: gameEntries.filter((entry) => entry.game_type === type).length,
  }));
  const teamScores = Array.from(
    gameEntries
      .filter((entry) => entry.game_type === "team_battle")
      .reduce((map, entry) => {
        const metadata = (entry.metadata ?? {}) as Record<string, string>;
        const team = metadata.team || "Без команды";
        map.set(team, (map.get(team) ?? 0) + (entry.score ?? 0));
        return map;
      }, new Map<string, number>()),
  )
    .map(([team, score]) => ({ team, score }))
    .sort((a, b) => b.score - a.score);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={event.is_active ? "default" : "secondary"}>{event.is_active ? "Активно" : "Остановлено"}</Badge>
            <Badge variant="outline">{pro ? "Pro" : "Free"}</Badge>
            {event.auto_approve ? <Badge variant="outline">Автоодобрение</Badge> : null}
          </div>
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(event.date)} · {event.location || "Локация не указана"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={publicUrl} target="_blank">
              <QrCode className="h-4 w-4" />
              Гостевая
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={playUrl} target="_blank">
              <Gamepad2 className="h-4 w-4" />
              Игры
            </Link>
          </Button>
          <Button asChild>
            <Link href={liveUrl} target="_blank">
              <Monitor className="h-4 w-4" />
              Live
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-9">
        {tabs.map(([tab, label, Icon, hint]) => (
          <Link
            key={tab}
            href={`/dashboard/events/${event.id}?tab=${tab}`}
            className={`rounded-lg border bg-card p-3 transition-colors hover:bg-secondary/70 ${activeTab === tab ? "border-primary" : ""}`}
          >
            <Icon className="mb-2 h-4 w-4 text-primary" />
            <div className="text-sm font-medium">{label}</div>
            <div className="text-xs text-muted-foreground">{hint}</div>
          </Link>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Всего фото", uploadStats.total],
              ["На модерации", uploadStats.pending],
              ["Одобрено", uploadStats.approved],
              ["Отклонено", uploadStats.rejected],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardHeader>
                  <CardTitle className="text-sm">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card>
              <CardHeader>
                <CardTitle>Последние загрузки</CardTitle>
                <CardDescription>Быстрый контроль свежих фото.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {signedUploads.slice(0, 6).map((upload) => (
                  <article key={upload.id} className="overflow-hidden rounded-lg border bg-card">
                    <div className="relative aspect-square bg-muted">
                      {upload.signedUrl ? <Image src={upload.signedUrl} alt="" fill className="object-cover" sizes="240px" /> : null}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{upload.guest_name}</span>
                        {statusBadge(upload.status)}
                      </div>
                    </div>
                  </article>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Быстрые ссылки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <code className="block break-all rounded-md border bg-background p-3 text-xs">{publicUrl}</code>
                <CopyButton value={publicUrl} label="Скопировать гостевую" />
                <Button asChild variant="outline" className="w-full">
                  <Link href={liveUrl} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                    Открыть live
                  </Link>
                </Button>
                <div className="rounded-md border bg-background p-3 text-sm">
                  <div className="font-medium">Журнал модерации</div>
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    {(logs ?? []).map((log) => (
                      <div key={log.id}>{log.action}</div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "uploads" ? (
        <Card>
          <CardHeader>
            <CardTitle>Загрузки гостей</CardTitle>
            <CardDescription>Фильтры, поиск, просмотр и массовая модерация.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {["", "pending", "approved", "rejected"].map((status) => (
                <Button key={status || "all"} asChild size="sm" variant={statusFilter === status ? "default" : "outline"}>
                  <Link href={`/dashboard/events/${event.id}?tab=uploads${status ? `&status=${status}` : ""}`}>
                    {status || "all"}
                  </Link>
                </Button>
              ))}
            </div>
            <form className="flex gap-2">
              <input type="hidden" name="tab" value="uploads" />
              <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" name="q" placeholder="Поиск по имени или пожеланию" defaultValue={query.q ?? ""} />
              <Button type="submit" variant="outline">Найти</Button>
            </form>
            {signedUploads.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Загрузок пока нет.</div>
            ) : (
              <>
              <form id="bulk-moderation" action={bulkModerateUploadsAction} />
              <div className="space-y-3">
                <input form="bulk-moderation" type="hidden" name="eventId" value={event.id} />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
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
                          <input form="bulk-moderation" type="checkbox" name="uploadIds" value={upload.id} />
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <button type="button" className="relative h-16 w-16 overflow-hidden rounded-md border bg-muted">
                                {upload.signedUrl ? <Image src={upload.signedUrl} alt="" fill className="object-cover" sizes="64px" /> : null}
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>{upload.guest_name}</DialogTitle>
                                <DialogDescription>{upload.message || "Без пожелания"}</DialogDescription>
                              </DialogHeader>
                              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                                {upload.signedUrl ? <Image src={upload.signedUrl} alt="" fill className="object-contain" sizes="80vw" /> : null}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                        <TableCell className="font-medium">{upload.guest_name}</TableCell>
                        <TableCell className="max-w-[280px] text-muted-foreground">{upload.message || "—"}</TableCell>
                        <TableCell>{statusBadge(upload.status)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <form action={moderateUploadAction}>
                              <input type="hidden" name="uploadId" value={upload.id} />
                              <input type="hidden" name="eventId" value={event.id} />
                              <input type="hidden" name="status" value="approved" />
                              <Button size="sm" type="submit" disabled={upload.status === "approved"}>
                                <Check className="h-4 w-4" />
                                Одобрить
                              </Button>
                            </form>
                            <form action={moderateUploadAction}>
                              <input type="hidden" name="uploadId" value={upload.id} />
                              <input type="hidden" name="eventId" value={event.id} />
                              <input type="hidden" name="status" value="rejected" />
                              <Button size="sm" type="submit" variant="outline" disabled={upload.status === "rejected"}>
                                <X className="h-4 w-4" />
                                Отклонить
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex flex-wrap gap-2">
                  <input form="bulk-moderation" type="hidden" name="eventId" value={event.id} />
                  <Button form="bulk-moderation" type="submit" name="status" value="approved">
                    <ShieldCheck className="h-4 w-4" />
                    Одобрить выбранные
                  </Button>
                  <Button form="bulk-moderation" type="submit" name="status" value="rejected" variant="outline">
                    <X className="h-4 w-4" />
                    Отклонить выбранные
                  </Button>
                </div>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "live" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Live preview</CardTitle>
              <CardDescription>Режим: {event.live_layout}, эффект: {event.live_transition ?? "fade"}.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border bg-[hsl(var(--live-background))] p-4 text-[hsl(var(--live-foreground))]">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-semibold">{event.cover_title || event.brand_name || event.title}</span>
                  <Badge>{event.slide_duration_seconds ?? 5}s</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {signedUploads.slice(0, 6).map((upload, index) => (
                    <div key={upload.id} className={`relative overflow-hidden rounded-md bg-card/10 ${index === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"}`}>
                      {upload.signedUrl ? <Image src={upload.signedUrl} alt="" fill className="object-cover" sizes="240px" /> : null}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Настройки Live</CardTitle>
              <CardDescription>Меняются во вкладке “Настройки”.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>Макет: <strong>{event.live_layout}</strong></div>
              <div>Эффект: <strong>{event.live_transition ?? "fade"}</strong></div>
              <div>Имена: <strong>{event.show_names_on_live ? "да" : "нет"}</strong></div>
              <div>Пожелания: <strong>{event.show_messages_on_live ? "да" : "нет"}</strong></div>
              <div>QR: <strong>{event.show_qr_on_live ? "да" : "нет"}</strong></div>
              <Button asChild className="mt-4 w-full">
                <Link href={liveUrl} target="_blank">
                  <Eye className="h-4 w-4" />
                  Открыть fullscreen
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "games" ? (
        <QuizAdminPanel
          eventId={event.id}
          playUrl={playUrl}
          liveUrl={liveUrl}
          quiz={quizData as Parameters<typeof QuizAdminPanel>[0]["quiz"]}
          questions={quizQuestions}
          teams={quizTeams}
        />
      ) : null}

      {false && activeTab === "games" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Игровая ссылка</CardTitle>
                <CardDescription>Отправьте гостям или покажите рядом с QR.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <code className="block break-all rounded-md border bg-background p-3 text-xs">{playUrl}</code>
                <CopyButton value={playUrl} label="Скопировать ссылку игр" />
                <Button asChild variant="outline" className="w-full">
                  <Link href={playUrl} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                    Открыть игры
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Активность</CardTitle>
                <CardDescription>Все интерактивы события.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Ответы и задания</span>
                  <strong>{gameEntries.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Голоса за фото</span>
                  <strong>{photoVotes.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Команд</span>
                  <strong>{teamScores.length}</strong>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Топ команд</CardTitle>
                <CardDescription>Баллы из битвы столов / команд.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {teamScores.slice(0, 5).map((team) => (
                  <div key={team.team} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                    <span className="font-medium">{team.team}</span>
                    <Badge>{team.score}</Badge>
                  </div>
                ))}
                {teamScores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Командных баллов пока нет.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Мини-игры</CardTitle>
              <CardDescription>Все игры уже доступны гостям на странице интерактива.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gameStats.map((item) => (
                <div key={item.type} className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{item.label}</div>
                    <Badge variant={item.count > 0 ? "default" : "secondary"}>{item.count}</Badge>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">Голосование за фото</div>
                  <Badge variant={photoVotes.length > 0 ? "default" : "secondary"}>{photoVotes.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Последние ответы гостей</CardTitle>
              <CardDescription>Свежие действия из всех игр.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Игра</TableHead>
                    <TableHead>Гость</TableHead>
                    <TableHead>Ответ</TableHead>
                    <TableHead>Баллы</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gameEntries.slice(0, 20).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{gameLabels[entry.game_type] ?? entry.game_type}</TableCell>
                      <TableCell className="font-medium">{entry.guest_name}</TableCell>
                      <TableCell className="max-w-[420px] text-muted-foreground">{entry.content}</TableCell>
                      <TableCell>{entry.score}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {gameEntries.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Ответов пока нет. Откройте ссылку игр и отправьте первый тестовый ответ.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "guests" ? (
        <Card>
          <CardHeader>
            <CardTitle>Гости</CardTitle>
            <CardDescription>Список имен из загрузок и активность гостей.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Фото</TableHead>
                  <TableHead>Последнее пожелание</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((guest) => (
                  <TableRow key={guest.name}>
                    <TableCell className="font-medium">{guest.name}</TableCell>
                    <TableCell>{guest.total}</TableCell>
                    <TableCell className="text-muted-foreground">{guest.lastMessage || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "qr" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>QR для гостей</CardTitle>
              <CardDescription>Для печати, экрана или рассылки.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EventQrCode value={publicUrl} title={event.cover_title || event.brand_name || event.title} color={event.brand_color} />
              <code className="block break-all rounded-md border bg-background p-3 text-xs">{publicUrl}</code>
              <CopyButton value={publicUrl} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>QR для Live</CardTitle>
              <CardDescription>Полезно для backstage или технической команды.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EventQrCode value={liveUrl} title="Live экран" color={event.brand_color} />
              <code className="block break-all rounded-md border bg-background p-3 text-xs">{liveUrl}</code>
              <CopyButton value={liveUrl} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "branding" || activeTab === "settings" ? (
        <Card>
          <CardHeader>
            <CardTitle>{activeTab === "branding" ? "Брендинг и тексты" : "Настройки мероприятия"}</CardTitle>
            <CardDescription>Все параметры события собраны в одной форме.</CardDescription>
          </CardHeader>
          <CardContent>
            <EventSettingsForm event={event} isPro={pro} />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "export" ? (
        <Card>
          <CardHeader>
            <CardTitle>Экспорт</CardTitle>
            <CardDescription>Архив фото и CSV пожеланий.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild>
              <Link href={`/dashboard/events/${event.id}/export`}>
                <Download className="h-4 w-4" />
                Открыть экспорт
              </Link>
            </Button>
            {!pro ? <p className="text-sm text-muted-foreground">Экспорт архива доступен в Pro.</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "communications" ? (
        <Card>
          <CardHeader>
            <CardTitle>Коммуникации</CardTitle>
            <CardDescription>Готовые тексты для WhatsApp, Telegram или email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Приглашение гостям</div>
              <textarea className="min-h-36 w-full rounded-md border bg-background p-3 text-sm" readOnly value={inviteText} />
              <CopyButton value={inviteText} label="Скопировать приглашение" />
            </div>
            <div className="rounded-md border bg-background p-3 text-sm">
              <div className="font-medium">Инструкция на странице</div>
              <p className="mt-1 text-muted-foreground">{event.guest_instruction}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
