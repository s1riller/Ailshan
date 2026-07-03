export const FREE_PHOTO_LIMIT = 200;
export const FREE_STORAGE_DAYS = 14;
export const PRO_PHOTO_LIMIT = 5000;
export const PRO_STORAGE_DAYS = 180;

export function isPro(plan?: string | null) {
  return plan === "pro";
}

export function proLabel(plan?: string | null) {
  return isPro(plan) ? "Pro" : "Free";
}
