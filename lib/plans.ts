import { planLabel } from "@/lib/labels";

export const FREE_PHOTO_LIMIT = 200;
export const FREE_STORAGE_DAYS = 14;
export const PRO_PHOTO_LIMIT = 5000;
export const PRO_STORAGE_DAYS = 180;

export function isPro(plan?: string | null) {
  return plan === "pro";
}

/** «Базовый» / «Премиум» — единственные названия тарифов в интерфейсе */
export function proLabel(plan?: string | null) {
  return planLabel(plan);
}
