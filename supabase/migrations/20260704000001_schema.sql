create extension if not exists "pgcrypto";

create type public.upload_status as enum ('pending', 'approved', 'rejected');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slug text not null unique,
  date date,
  location text,
  is_active boolean not null default true,
  theme text not null default 'default',
  guest_intro text not null default 'Поделитесь фото и пожеланием с мероприятия.',
  thanks_text text not null default 'Спасибо, ваше фото появится после модерации.',
  live_layout text not null default 'masonry',
  show_messages_on_live boolean not null default true,
  auto_approve boolean not null default false,
  max_file_size_mb integer not null default 10,
  created_at timestamptz not null default now()
);

create table public.event_zones (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  qr_token text not null unique,
  created_at timestamptz not null default now()
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  zone_id uuid references public.event_zones(id) on delete set null,
  guest_name text not null,
  message text,
  file_path text not null,
  file_type text not null,
  file_size integer not null default 0,
  status public.upload_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.uploads(id) on delete cascade,
  accepted_privacy boolean not null default false,
  created_at timestamptz not null default now()
);

create index events_owner_id_idx on public.events(owner_id);
create index events_slug_idx on public.events(slug);
create index uploads_event_id_idx on public.uploads(event_id);
create index uploads_status_idx on public.uploads(status);

alter table public.events
add constraint events_theme_check
check (theme in ('default', 'wedding', 'corporate', 'evening', 'minimal', 'instagram'));

alter table public.events
add constraint events_live_layout_check
check (live_layout in ('masonry', 'featured', 'slideshow', 'compact'));

alter table public.events
add constraint events_max_file_size_mb_check
check (max_file_size_mb between 1 and 25);

alter table public.events enable row level security;
alter table public.event_zones enable row level security;
alter table public.uploads enable row level security;
alter table public.consents enable row level security;

create policy "Owners can read their events"
on public.events for select
to authenticated
using (owner_id = auth.uid());

create policy "Owners can create events"
on public.events for insert
to authenticated
with check (owner_id = auth.uid());

create policy "Owners can update their events"
on public.events for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Public can read active events by slug"
on public.events for select
to anon, authenticated
using (is_active = true);

create policy "Owners can manage zones"
on public.event_zones for all
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = event_zones.event_id
    and events.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.events
    where events.id = event_zones.event_id
    and events.owner_id = auth.uid()
  )
);

create policy "Owners can read uploads"
on public.uploads for select
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = uploads.event_id
    and events.owner_id = auth.uid()
  )
);

create policy "Owners can update upload moderation"
on public.uploads for update
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = uploads.event_id
    and events.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.events
    where events.id = uploads.event_id
    and events.owner_id = auth.uid()
  )
);

create policy "Guests can create pending uploads for active events"
on public.uploads for insert
to anon, authenticated
with check (
  status = 'pending'
  and exists (
    select 1 from public.events
    where events.id = uploads.event_id
    and events.is_active = true
  )
);

create policy "Public can read approved uploads"
on public.uploads for select
to anon, authenticated
using (
  status = 'approved'
  and exists (
    select 1 from public.events
    where events.id = uploads.event_id
    and events.is_active = true
  )
);

create policy "Guests can create consents"
on public.consents for insert
to anon, authenticated
with check (
  accepted_privacy = true
  and exists (
    select 1 from public.uploads
    join public.events on events.id = uploads.event_id
    where uploads.id = consents.upload_id
    and events.is_active = true
  )
);

create policy "Owners can read consents"
on public.consents for select
to authenticated
using (
  exists (
    select 1 from public.uploads
    join public.events on events.id = uploads.event_id
    where uploads.id = consents.upload_id
    and events.owner_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Guests can upload photos directly"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'event-photos'
  and lower((storage.foldername(name))[1]) = 'events'
);

create policy "Owners can read event photo objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'event-photos'
  and exists (
    select 1 from public.uploads
    join public.events on events.id = uploads.event_id
    where uploads.file_path = storage.objects.name
    and events.owner_id = auth.uid()
  )
);
