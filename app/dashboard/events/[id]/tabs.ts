/** Ключи вкладок страницы события — общие для серверной страницы и клиентской ленты */
export const EVENT_TAB_VALUES = [
  "overview",
  "uploads",
  "live",
  "games",
  "guests",
  "qr",
  "branding",
  "settings",
  "export",
  "communications",
] as const;

export type EventTab = (typeof EVENT_TAB_VALUES)[number];

export function getActiveTab(value?: string): EventTab {
  return EVENT_TAB_VALUES.includes(value as EventTab) ? (value as EventTab) : "overview";
}
