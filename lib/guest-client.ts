"use client";

import { GUEST_COOKIE_MAX_AGE, GUEST_NAME_COOKIE, guestUploadsCookie, parseUploadIds } from "@/lib/guest";

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function writeCookie(name: string, value: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${GUEST_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

export function readGuestName(): string {
  const raw = readCookie(GUEST_NAME_COOKIE);
  return raw ? decodeURIComponent(raw) : "";
}

export function rememberGuestName(name: string) {
  const trimmed = name.trim();
  if (trimmed) writeCookie(GUEST_NAME_COOKIE, trimmed);
}

export function rememberUpload(eventId: string, uploadId: string) {
  const current = parseUploadIds(decodeURIComponent(readCookie(guestUploadsCookie(eventId)) ?? ""));
  writeCookie(guestUploadsCookie(eventId), [...current, uploadId].join(","));
}
