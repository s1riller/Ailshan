alter table public.events
add column if not exists live_transition text not null default 'fade',
add column if not exists slide_duration_seconds integer not null default 5,
add column if not exists live_qr_effect text not null default 'fade',
add column if not exists live_qr_interval_seconds integer not null default 20,
add column if not exists show_names_on_live boolean not null default true,
add column if not exists show_qr_on_live boolean not null default false,
add column if not exists guest_instruction text not null default 'Загрузите фото и пожелание по ссылке мероприятия.';

alter table public.events
drop constraint if exists events_live_transition_check,
add constraint events_live_transition_check
check (live_transition in ('fade', 'slide', 'zoom', 'stories'));

alter table public.events
drop constraint if exists events_slide_duration_seconds_check,
add constraint events_slide_duration_seconds_check
check (slide_duration_seconds between 3 and 20);

alter table public.events
drop constraint if exists events_live_qr_effect_check,
add constraint events_live_qr_effect_check
check (live_qr_effect in ('fade', 'slide', 'pulse', 'stories'));

alter table public.events
drop constraint if exists events_live_qr_interval_seconds_check,
add constraint events_live_qr_interval_seconds_check
check (live_qr_interval_seconds between 5 and 120);

create table if not exists public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  upload_id uuid references public.uploads(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists moderation_logs_event_id_idx on public.moderation_logs(event_id);

alter table public.moderation_logs enable row level security;

drop policy if exists "Owners can read moderation logs" on public.moderation_logs;
create policy "Owners can read moderation logs"
on public.moderation_logs for select
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = moderation_logs.event_id
    and events.owner_id = auth.uid()
  )
);
