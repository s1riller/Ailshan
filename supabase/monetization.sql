alter table public.profiles
add column if not exists plan text not null default 'free',
add column if not exists storage_retention_days integer not null default 14;

alter table public.profiles
drop constraint if exists profiles_plan_check,
add constraint profiles_plan_check
check (plan in ('free', 'pro'));

alter table public.events
add column if not exists custom_slug text,
add column if not exists brand_name text,
add column if not exists brand_color text,
add column if not exists cover_title text,
add column if not exists photo_limit integer not null default 200,
add column if not exists archive_enabled boolean not null default false;

create unique index if not exists events_custom_slug_unique_idx
on public.events(custom_slug)
where custom_slug is not null;

-- Manual upgrade while billing is not connected:
-- update public.profiles
-- set plan = 'pro', events_limit = 50, storage_limit_mb = 10000, storage_retention_days = 180
-- where email = 'you@example.com';
