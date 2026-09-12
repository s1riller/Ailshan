/**
 * Единый словарь терминов и статусов. Ни одно значение enum из базы не должно
 * попадать в интерфейс напрямую — только через эти функции.
 *
 * Термины продукта: «событие» (не «мероприятие»), «экран зала» (не Live),
 * «снимок» / «фото», «Базовый» / «Премиум» (не Free / Pro).
 */

export type UploadStatus = "pending" | "approved" | "rejected";
export type StatusTone = "success" | "warning" | "destructive" | "secondary";

export const UPLOAD_STATUS_LABEL: Record<UploadStatus, string> = {
  pending: "На модерации",
  approved: "Одобрено",
  rejected: "Отклонено",
};

export const UPLOAD_STATUS_TONE: Record<UploadStatus, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

/** Подписи фильтра модерации: значение → подпись */
export const UPLOAD_FILTERS: Array<[value: "" | UploadStatus, label: string]> = [
  ["", "Все"],
  ["pending", "На модерации"],
  ["approved", "Одобренные"],
  ["rejected", "Отклонённые"],
];

export function uploadStatusLabel(status: string): string {
  return UPLOAD_STATUS_LABEL[status as UploadStatus] ?? status;
}

export function uploadStatusTone(status: string): StatusTone {
  return UPLOAD_STATUS_TONE[status as UploadStatus] ?? "secondary";
}

export function eventStatusLabel(isActive: boolean | null | undefined): string {
  return isActive ? "Идёт приём фото" : "Приостановлено";
}

export function eventStatusTone(isActive: boolean | null | undefined): StatusTone {
  return isActive ? "success" : "secondary";
}

export const PLAN_LABEL: Record<string, string> = {
  free: "Базовый",
  pro: "Премиум",
};

export function planLabel(plan?: string | null): string {
  return PLAN_LABEL[plan ?? "free"] ?? "Базовый";
}

export const USER_ROLE_LABEL: Record<string, string> = {
  user: "Организатор",
  super_admin: "Администратор",
};

export const TICKET_STATUS_LABEL: Record<string, string> = {
  open: "Открыт",
  in_progress: "В работе",
  closed: "Закрыт",
};

export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  closed: "Закрыта",
};

export const QUIZ_STATUS_LABEL: Record<string, string> = {
  draft: "Подготовка",
  countdown: "Обратный отсчёт",
  active: "Идёт",
  finished: "Завершён",
};

export function labelOf(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "";
  return map[value] ?? value;
}

/** Собирает подзаголовок из непустых частей: «12 июня 2026 · Ресторан „Вилла“» */
export function joinMeta(...parts: Array<string | null | undefined | false>): string {
  return parts.filter(Boolean).join(" · ");
}
