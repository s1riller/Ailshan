create table if not exists public.event_quizzes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  title text not null default 'Командный квиз',
  status text not null default 'draft' check (status in ('draft', 'countdown', 'active', 'finished')),
  starts_at timestamptz,
  current_question_index integer not null default 0 check (current_question_index >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.event_quizzes(id) on delete cascade,
  question_text text not null,
  answers jsonb not null,
  correct_answer_index integer not null check (correct_answer_index between 0 and 3),
  points integer not null default 10 check (points between 1 and 1000),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (quiz_id, position)
);

create table if not exists public.quiz_teams (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.event_quizzes(id) on delete cascade,
  name text not null,
  join_code text not null,
  created_at timestamptz not null default now(),
  unique (quiz_id, join_code)
);

create table if not exists public.quiz_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.quiz_teams(id) on delete cascade,
  guest_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  team_id uuid not null references public.quiz_teams(id) on delete cascade,
  member_id uuid not null references public.quiz_team_members(id) on delete cascade,
  selected_answer_index integer not null check (selected_answer_index between 0 and 3),
  is_correct boolean not null,
  points integer not null default 0 check (points >= 0),
  created_at timestamptz not null default now(),
  unique (question_id, team_id)
);

create index if not exists quiz_questions_quiz_id_idx on public.quiz_questions(quiz_id, position);
create index if not exists quiz_teams_quiz_id_idx on public.quiz_teams(quiz_id);
create index if not exists quiz_team_members_team_id_idx on public.quiz_team_members(team_id);
create index if not exists quiz_answers_question_id_idx on public.quiz_answers(question_id);
create index if not exists quiz_answers_team_id_idx on public.quiz_answers(team_id);

alter table public.event_quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_teams enable row level security;
alter table public.quiz_team_members enable row level security;
alter table public.quiz_answers enable row level security;

create or replace function public.activate_due_quiz(p_quiz_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  was_activated boolean;
begin
  update public.event_quizzes
  set status = 'active', updated_at = now()
  where id = p_quiz_id
    and status = 'countdown'
    and starts_at <= now();

  was_activated := found;
  return was_activated;
end;
$$;

grant execute on function public.activate_due_quiz(uuid) to anon, authenticated, service_role;

drop policy if exists "Owners manage quizzes" on public.event_quizzes;
create policy "Owners manage quizzes" on public.event_quizzes for all to authenticated
using (exists (select 1 from public.events where events.id = event_quizzes.event_id and events.owner_id = auth.uid()))
with check (exists (select 1 from public.events where events.id = event_quizzes.event_id and events.owner_id = auth.uid()));

drop policy if exists "Owners manage quiz questions" on public.quiz_questions;
create policy "Owners manage quiz questions" on public.quiz_questions for all to authenticated
using (exists (
  select 1 from public.event_quizzes join public.events on events.id = event_quizzes.event_id
  where event_quizzes.id = quiz_questions.quiz_id and events.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.event_quizzes join public.events on events.id = event_quizzes.event_id
  where event_quizzes.id = quiz_questions.quiz_id and events.owner_id = auth.uid()
));

drop policy if exists "Owners read quiz teams" on public.quiz_teams;
create policy "Owners read quiz teams" on public.quiz_teams for select to authenticated
using (exists (
  select 1 from public.event_quizzes join public.events on events.id = event_quizzes.event_id
  where event_quizzes.id = quiz_teams.quiz_id and events.owner_id = auth.uid()
));

drop policy if exists "Owners read quiz members" on public.quiz_team_members;
create policy "Owners read quiz members" on public.quiz_team_members for select to authenticated
using (exists (
  select 1 from public.quiz_teams
  join public.event_quizzes on event_quizzes.id = quiz_teams.quiz_id
  join public.events on events.id = event_quizzes.event_id
  where quiz_teams.id = quiz_team_members.team_id and events.owner_id = auth.uid()
));

drop policy if exists "Owners read quiz answers" on public.quiz_answers;
create policy "Owners read quiz answers" on public.quiz_answers for select to authenticated
using (exists (
  select 1 from public.quiz_teams
  join public.event_quizzes on event_quizzes.id = quiz_teams.quiz_id
  join public.events on events.id = event_quizzes.event_id
  where quiz_teams.id = quiz_answers.team_id and events.owner_id = auth.uid()
));
