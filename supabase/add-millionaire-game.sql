alter table public.game_entries
drop constraint if exists game_entries_game_type_check;

alter table public.game_entries
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
