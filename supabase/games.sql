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

alter table public.game_entries enable row level security;
alter table public.photo_votes enable row level security;

drop policy if exists "Guests can create game entries for active events" on public.game_entries;
create policy "Guests can create game entries for active events"
on public.game_entries for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.events
    where events.id = game_entries.event_id
    and events.is_active = true
  )
);

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

drop policy if exists "Guests can vote for approved photos" on public.photo_votes;
create policy "Guests can vote for approved photos"
on public.photo_votes for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.uploads
    join public.events on events.id = uploads.event_id
    where uploads.id = photo_votes.upload_id
    and uploads.event_id = photo_votes.event_id
    and uploads.status = 'approved'
    and events.is_active = true
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
