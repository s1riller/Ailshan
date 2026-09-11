import { CONTEST_GAMES, type ContestGameType, type GameDefinition } from "@/lib/games/catalog";
import { createAdminClient } from "@/lib/supabase/admin";

export type ContestGameConfig = {
  gameType: ContestGameType;
  title: string;
  prompt: string;
  options: string[];
  correctOption: number | null;
  points: number;
  requiresApproval: boolean;
  isEnabled: boolean;
};

export type ResolvedGame = {
  definition: GameDefinition;
  config: ContestGameConfig;
  /** Ведущий уже сохранял настройки этой игры */
  isConfigured: boolean;
};

export type ContestEntry = {
  id: string;
  gameType: string;
  guestName: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
  status: "pending" | "approved" | "rejected";
  teamId: string | null;
  memberId: string | null;
  createdAt: string;
};

export type ContestTeam = {
  id: string;
  name: string;
  joinCode: string;
  members: number;
  quizPoints: number;
  gamePoints: number;
  bonusPoints: number;
  votePoints: number;
  total: number;
};

export type ContestData = {
  quizId: string | null;
  teams: ContestTeam[];
  games: ResolvedGame[];
  entries: ContestEntry[];
  /** Голоса за фото: upload_id -> количество голосов */
  votesByUpload: Map<string, number>;
  votedTeamIds: Set<string>;
  votedMemberIds: Set<string>;
  totalVotes: number;
};

function defaultConfig(definition: GameDefinition): ContestGameConfig {
  return {
    gameType: definition.type,
    title: definition.label,
    prompt: definition.defaultPrompt,
    options: definition.defaultOptions ?? [],
    correctOption: definition.hasCorrectOption ? 0 : null,
    points: definition.defaultPoints,
    requiresApproval: definition.defaultRequiresApproval,
    isEnabled: false,
  };
}

type StoredGameRow = {
  game_type: string;
  title: string | null;
  prompt: string | null;
  options: unknown;
  correct_option: number | null;
  points: number | null;
  requires_approval: boolean | null;
  is_enabled: boolean | null;
};

function toConfig(definition: GameDefinition, row: StoredGameRow): ContestGameConfig {
  const options = Array.isArray(row.options) ? row.options.filter((item): item is string => typeof item === "string") : [];

  return {
    gameType: definition.type,
    title: row.title || definition.label,
    prompt: row.prompt ?? definition.defaultPrompt,
    options,
    correctOption: row.correct_option,
    points: row.points ?? definition.defaultPoints,
    requiresApproval: row.requires_approval ?? definition.defaultRequiresApproval,
    isEnabled: row.is_enabled ?? false,
  };
}

/**
 * Склеивает каталог игр с сохранёнными настройками: ведущий всегда видит все
 * игры, даже те, которые ещё ни разу не настраивал.
 */
export function resolveGames(rows: StoredGameRow[]): ResolvedGame[] {
  return CONTEST_GAMES.map((definition) => {
    const row = rows.find((item) => item.game_type === definition.type);

    return {
      definition,
      config: row ? toConfig(definition, row) : defaultConfig(definition),
      isConfigured: Boolean(row),
    };
  });
}

/** Игра готова к запуску: настроена и, если нужны варианты, они заполнены */
export function isGamePlayable(game: ResolvedGame): boolean {
  if (!game.config.isEnabled) return false;
  if (game.definition.needsOptions && game.config.options.length < 2) return false;

  return true;
}

/**
 * Одна загрузка данных конкурса для гостевой страницы, админки и live-экрана,
 * чтобы баллы везде считались по одним и тем же правилам.
 */
export async function loadContest(eventId: string): Promise<ContestData> {
  const admin = createAdminClient();

  const [{ data: quiz }, { data: gameRows }, { data: entryRows }] = await Promise.all([
    admin.from("event_quizzes").select("id").eq("event_id", eventId).maybeSingle(),
    admin
      .from("event_games")
      .select("game_type, title, prompt, options, correct_option, points, requires_approval, is_enabled")
      .eq("event_id", eventId),
    admin
      .from("game_entries")
      .select("id, game_type, guest_name, content, metadata, score, status, team_id, member_id, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const games = resolveGames((gameRows ?? []) as StoredGameRow[]);
  const entries: ContestEntry[] = (entryRows ?? []).map((row) => ({
    id: row.id,
    gameType: row.game_type,
    guestName: row.guest_name,
    content: row.content,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    score: row.score ?? 0,
    status: (row.status ?? "approved") as ContestEntry["status"],
    teamId: row.team_id ?? null,
    memberId: row.member_id ?? null,
    createdAt: row.created_at,
  }));

  const quizId = quiz?.id ?? null;

  if (!quizId) {
    return {
      quizId: null,
      teams: [],
      games,
      entries,
      votesByUpload: new Map(),
      votedTeamIds: new Set(),
      votedMemberIds: new Set(),
      totalVotes: 0,
    };
  }

  const { data: teamRows } = await admin
    .from("quiz_teams")
    .select("id, name, join_code")
    .eq("quiz_id", quizId)
    .order("created_at");
  const teamList = teamRows ?? [];
  const teamIds = teamList.map((team) => team.id);

  const [{ data: memberRows }, { data: questionRows }, { data: voteRows }] = await Promise.all([
    teamIds.length
      ? admin.from("quiz_team_members").select("id, team_id").in("team_id", teamIds)
      : Promise.resolve({ data: [] as { id: string; team_id: string }[] }),
    admin.from("quiz_questions").select("id").eq("quiz_id", quizId),
    admin.from("photo_votes").select("upload_id, team_id, member_id").eq("event_id", eventId),
  ]);

  const questionIds = (questionRows ?? []).map((question) => question.id);
  const { data: answerRows } = questionIds.length
    ? await admin.from("quiz_answers").select("team_id, points").in("question_id", questionIds)
    : { data: [] as { team_id: string; points: number }[] };

  const votesByUpload = new Map<string, number>();
  const votedTeamIds = new Set<string>();
  const votedMemberIds = new Set<string>();
  const votesByTeam = new Map<string, number>();

  for (const vote of voteRows ?? []) {
    votesByUpload.set(vote.upload_id, (votesByUpload.get(vote.upload_id) ?? 0) + 1);
    if (vote.team_id) {
      votedTeamIds.add(vote.team_id);
      votesByTeam.set(vote.team_id, (votesByTeam.get(vote.team_id) ?? 0) + 1);
    }
    if (vote.member_id) votedMemberIds.add(vote.member_id);
  }

  const votePointsPerVote = games.find((game) => game.definition.type === "photo_vote")?.config.points ?? 0;

  const quizPointsByTeam = new Map<string, number>();
  for (const answer of answerRows ?? []) {
    quizPointsByTeam.set(answer.team_id, (quizPointsByTeam.get(answer.team_id) ?? 0) + (answer.points ?? 0));
  }

  const gamePointsByTeam = new Map<string, number>();
  const bonusPointsByTeam = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status !== "approved" || !entry.teamId) continue;

    const target = entry.gameType === "team_battle" ? bonusPointsByTeam : gamePointsByTeam;
    target.set(entry.teamId, (target.get(entry.teamId) ?? 0) + entry.score);
  }

  const memberCounts = new Map<string, number>();
  for (const member of memberRows ?? []) {
    memberCounts.set(member.team_id, (memberCounts.get(member.team_id) ?? 0) + 1);
  }

  const teams: ContestTeam[] = teamList
    .map((team) => {
      const quizPoints = quizPointsByTeam.get(team.id) ?? 0;
      const gamePoints = gamePointsByTeam.get(team.id) ?? 0;
      const bonusPoints = bonusPointsByTeam.get(team.id) ?? 0;
      const votePoints = (votesByTeam.get(team.id) ?? 0) * votePointsPerVote;

      return {
        id: team.id,
        name: team.name,
        joinCode: team.join_code,
        members: memberCounts.get(team.id) ?? 0,
        quizPoints,
        gamePoints,
        bonusPoints,
        votePoints,
        total: quizPoints + gamePoints + bonusPoints + votePoints,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return {
    quizId,
    teams,
    games,
    entries,
    votesByUpload,
    votedTeamIds,
    votedMemberIds,
    totalVotes: (voteRows ?? []).length,
  };
}
