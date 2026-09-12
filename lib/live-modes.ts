/** Режимы экрана зала. Ведущий переключает их из кабинета, стена перечитывает сама. */
export const LIVE_MODES = ["auto", "welcome", "photos", "contest", "split"] as const;
export type LiveMode = (typeof LIVE_MODES)[number];

export const LIVE_MODE_LABEL: Record<LiveMode, string> = {
  auto: "Авто",
  welcome: "Заставка",
  photos: "Фотографии",
  contest: "Таблица команд",
  split: "Фото и таблица",
};

export const LIVE_MODE_HINT: Record<LiveMode, string> = {
  auto: "Заставка, пока снимков нет, затем фотографии",
  welcome: "Название события и QR-код для загрузки",
  photos: "Только снимки гостей",
  contest: "Команды, баллы и итоги опросов на весь экран",
  split: "Снимки и таблица команд рядом",
};

export function safeLiveMode(value: string | null | undefined): LiveMode {
  return (LIVE_MODES as readonly string[]).includes(value ?? "") ? (value as LiveMode) : "auto";
}
