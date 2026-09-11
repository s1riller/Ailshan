alter table public.events
add column if not exists theme text not null default 'default',
add column if not exists guest_intro text not null default 'Поделитесь фото и пожеланием с мероприятия.',
add column if not exists thanks_text text not null default 'Спасибо, ваше фото появится после модерации.',
add column if not exists live_layout text not null default 'masonry',
add column if not exists show_messages_on_live boolean not null default true,
add column if not exists auto_approve boolean not null default false,
add column if not exists max_file_size_mb integer not null default 10;

alter table public.uploads
add column if not exists file_size integer not null default 0;

alter table public.events
drop constraint if exists events_theme_check,
add constraint events_theme_check
check (theme in ('default', 'wedding', 'corporate', 'evening', 'minimal', 'instagram'));

alter table public.events
drop constraint if exists events_live_layout_check,
add constraint events_live_layout_check
check (live_layout in ('masonry', 'featured', 'slideshow', 'compact'));

alter table public.events
drop constraint if exists events_max_file_size_mb_check,
add constraint events_max_file_size_mb_check
check (max_file_size_mb between 1 and 25);
