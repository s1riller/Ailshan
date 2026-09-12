-- Пульт экрана зала: ведущий из кабинета решает, что сейчас на проекторе,
-- и может вывести любой снимок крупно. Стена перечитывает эти поля сама.

alter table public.events
add column if not exists live_mode text not null default 'auto';

alter table public.events
add column if not exists live_pinned_upload_id uuid references public.uploads(id) on delete set null;

alter table public.events
drop constraint if exists events_live_mode_check,
add constraint events_live_mode_check
check (live_mode in ('auto', 'welcome', 'photos', 'contest', 'split'));

-- Новый макет фотографий: карусель Halo Reel
alter table public.events
drop constraint if exists events_live_layout_check,
add constraint events_live_layout_check
check (live_layout in ('masonry', 'featured', 'slideshow', 'compact', 'halo'));

create index if not exists events_live_pinned_upload_id_idx on public.events(live_pinned_upload_id);
