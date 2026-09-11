create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user',
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  subject text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text not null default 'user',
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles
drop constraint if exists profiles_role_check,
add constraint profiles_role_check
check (role in ('user', 'super_admin'));

alter table public.applications
drop constraint if exists applications_status_check,
add constraint applications_status_check
check (status in ('new', 'in_progress', 'closed'));

alter table public.support_tickets
drop constraint if exists support_tickets_status_check,
add constraint support_tickets_status_check
check (status in ('open', 'in_progress', 'closed'));

alter table public.support_messages
drop constraint if exists support_messages_sender_role_check,
add constraint support_messages_sender_role_check
check (sender_role in ('user', 'super_admin'));

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists applications_status_idx on public.applications(status);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_messages_ticket_id_idx on public.support_messages(ticket_id);

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'user')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, role)
select id, coalesce(email, ''), 'user'
from auth.users
on conflict (id) do update set email = excluded.email;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update their profile email only" on public.profiles;
create policy "Users can update their profile email only"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Anyone can create applications" on public.applications;
create policy "Anyone can create applications"
on public.applications for insert
to anon, authenticated
with check (true);

drop policy if exists "Users can create tickets" on public.support_tickets;
create policy "Users can create tickets"
on public.support_tickets for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can read their tickets" on public.support_tickets;
create policy "Users can read their tickets"
on public.support_tickets for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create ticket messages" on public.support_messages;
create policy "Users can create ticket messages"
on public.support_messages for insert
to authenticated
with check (
  exists (
    select 1 from public.support_tickets
    where support_tickets.id = support_messages.ticket_id
    and support_tickets.user_id = auth.uid()
  )
);

drop policy if exists "Users can read ticket messages" on public.support_messages;
create policy "Users can read ticket messages"
on public.support_messages for select
to authenticated
using (
  exists (
    select 1 from public.support_tickets
    where support_tickets.id = support_messages.ticket_id
    and support_tickets.user_id = auth.uid()
  )
);

-- After running this file, make yourself a super admin:
-- update public.profiles set role = 'super_admin' where email = 'you@example.com';
