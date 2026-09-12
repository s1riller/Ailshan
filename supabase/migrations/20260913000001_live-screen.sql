-- Физическое разрешение экрана зала. Пусто — стена подстраивается под окно
-- браузера. Если сигнал с компьютера растягивается процессором экрана на
-- другую пропорцию (LED-полоса 2080×640 с выхода 1920×1080), ведущий задаёт
-- размер экрана вручную: стена рисуется под него и сжимается под окно.
alter table public.events
  add column if not exists live_screen_width integer,
  add column if not exists live_screen_height integer;

alter table public.events drop constraint if exists events_live_screen_check;
alter table public.events add constraint events_live_screen_check check (
  (live_screen_width is null and live_screen_height is null)
  or (
    live_screen_width between 320 and 8192
    and live_screen_height between 240 and 8192
  )
);

comment on column public.events.live_screen_width is 'Ширина экрана зала в пикселях; null — по окну браузера';
comment on column public.events.live_screen_height is 'Высота экрана зала в пикселях; null — по окну браузера';
