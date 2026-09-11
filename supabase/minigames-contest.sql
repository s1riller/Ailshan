-- Мини-игры и командный конкурс.
-- Файл идемпотентный: его можно выполнить и на чистой базе, и поверх старой
-- games.sql — все объекты создаются через "if not exists".
--
-- Выполнить в Supabase SQL Editor. Требует уже выполненных schema.sql и team-quiz.sql
-- (нужны таблицы events, uploads, quiz_teams, quiz_team_members, quiz_answers).

-- ---------------------------------------------------------------------------
-- 1. Базовые таблицы игр (раньше жили в supabase/games.sql)
-- ---------------------------------------------------------------------------

create table if not exists public.game_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  game_type text not null,
  guest_name text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  score integer not null default 1,
  status text not null default 'approved',
  created_at timestamptz not null default now()
);

create table if not exists public.photo_votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  upload_id uuid not null references public.uploads(id) on delete cascade,
  guest_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists game_entries_event_id_idx on public.game_entries(event_id);
create index if not exists game_entries_game_type_idx on public.game_entries(game_type);
create index if not exists photo_votes_event_id_idx on public.photo_votes(event_id);
create index if not exists photo_votes_upload_id_idx on public.photo_votes(upload_id);

alter table public.game_entries
drop constraint if exists game_entries_game_type_check,
add constraint game_entries_game_type_check
check (
  game_type in (
    'photo_challenge',
    'bingo',
    'question',
    'guess_guest',
    'wheel_task',
    'team_battle',
    'poll',
    'secret_mission',
    'time_capsule',
    'millionaire'
  )
);

alter table public.game_entries
drop constraint if exists game_entries_status_check,
add constraint game_entries_status_check
check (status in ('pending', 'approved', 'rejected'));

alter table public.game_entries
drop constraint if exists game_entries_score_check,
add constraint game_entries_score_check
check (score between 0 and 1000);

-- ---------------------------------------------------------------------------
-- 2. Привязка результатов к командам конкурса
-- ---------------------------------------------------------------------------

alter table public.game_entries
add column if not exists team_id uuid references public.quiz_teams(id) on delete cascade;

alter table public.game_entries
add column if not exists member_id uuid references public.quiz_team_members(id) on delete set null;

create index if not exists game_entries_team_id_idx on public.game_entries(team_id);
create index if not exists game_entries_status_idx on public.game_entries(status);

alter table public.photo_votes
add column if not exists team_id uuid references public.quiz_teams(id) on delete cascade;

alter table public.photo_votes
add column if not exists member_id uuid references public.quiz_team_members(id) on delete set null;

create index if not exists photo_votes_team_id_idx on public.photo_votes(team_id);

-- Один голос на участника
create unique index if not exists photo_votes_member_unique_idx
on public.photo_votes(event_id, member_id)
where member_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Настройка мини-игр на мероприятии
-- ---------------------------------------------------------------------------

create table if not exists public.event_games (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  game_type text not null,
  title text not null,
  prompt text not null default '',
  -- Варианты ответа, список заданий или клетки бинго
  options jsonb not null default '[]'::jsonb,
  -- Индекс правильного варианта для игр с проверкой ответа
  correct_option integer,
  points integer not null default 10,
  requires_approval boolean not null default false,
  is_enabled boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, game_type)
);

create index if not exists event_games_event_id_idx on public.event_games(event_id);

alter table public.event_games
drop constraint if exists event_games_game_type_check,
add constraint event_games_game_type_check
check (
  game_type in (
    'photo_challenge',
    'bingo',
    'question',
    'guess_guest',
    'wheel_task',
    'team_battle',
    'poll',
    'secret_mission',
    'time_capsule',
    'millionaire',
    'photo_vote'
  )
);

alter table public.event_games
drop constraint if exists event_games_points_check,
add constraint event_games_points_check
check (points between 0 and 1000);

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
-- Серверные экшены ходят через service role и обходят RLS. Политики нужны на
-- случай прямого доступа с клиента и чтобы таблицы не были открыты наружу.

alter table public.game_entries enable row level security;
alter table public.photo_votes enable row level security;
alter table public.event_games enable row level security;

drop policy if exists "Public can read approved game entries" on public.game_entries;
create policy "Public can read approved game entries"
on public.game_entries for select
to anon, authenticated
using (
  status = 'approved'
  and exists (
    select 1 from public.events
    where events.id = game_entries.event_id
    and events.is_active = true
  )
);

drop policy if exists "Owners can manage game entries" on public.game_entries;
create policy "Owners can manage game entries"
on public.game_entries for all
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = game_entries.event_id
    and events.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.events
    where events.id = game_entries.event_id
    and events.owner_id = auth.uid()
  )
);

drop policy if exists "Public can read photo votes for active events" on public.photo_votes;
create policy "Public can read photo votes for active events"
on public.photo_votes for select
to anon, authenticated
using (
  exists (
    select 1 from public.events
    where events.id = photo_votes.event_id
    and events.is_active = true
  )
);

drop policy if exists "Owners can manage photo votes" on public.photo_votes;
create policy "Owners can manage photo votes"
on public.photo_votes for all
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = photo_votes.event_id
    and events.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.events
    where events.id = photo_votes.event_id
    and events.owner_id = auth.uid()
  )
);

drop policy if exists "Public can read enabled games" on public.event_games;
create policy "Public can read enabled games"
on public.event_games for select
to anon, authenticated
using (
  is_enabled = true
  and exists (
    select 1 from public.events
    where events.id = event_games.event_id
    and events.is_active = true
  )
);

drop policy if exists "Owners can manage event games" on public.event_games;
create policy "Owners can manage event games"
on public.event_games for all
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = event_games.event_id
    and events.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.events
    where events.id = event_games.event_id
    and events.owner_id = auth.uid()
  )
);
