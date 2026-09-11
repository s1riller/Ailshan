alter table public.profiles
add column if not exists full_name text,
add column if not exists phone text,
add column if not exists company_name text,
add column if not exists city text,
add column if not exists avatar_path text,
add column if not exists locale text not null default 'ru',
add column if not exists timezone text not null default 'Asia/Irkutsk',
add column if not exists ui_theme text not null default 'instagram',
add column if not exists email_notifications boolean not null default true,
add column if not exists onboarding_completed boolean not null default false,
add column if not exists events_limit integer not null default 3,
add column if not exists storage_limit_mb integer not null default 500;

alter table public.profiles
drop constraint if exists profiles_ui_theme_check,
add constraint profiles_ui_theme_check
check (ui_theme in ('default', 'wedding', 'corporate', 'evening', 'minimal', 'instagram'));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_is_read_idx on public.notifications(is_read);

alter table public.notifications enable row level security;

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Optional seed notification for existing users:
insert into public.notifications (user_id, title, body)
select id, 'Добро пожаловать в Ailshan', 'Заполните профиль и создайте первое мероприятие.'
from public.profiles
where not exists (
  select 1 from public.notifications
  where notifications.user_id = profiles.id
);
