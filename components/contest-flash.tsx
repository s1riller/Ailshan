"use client";

import { useEffect, useState } from "react";

import { FlashMessage } from "@/components/flash-message";

/**
 * Держит одноразовое сообщение на экране после того, как FlashMessage убрал
 * query-параметры из адреса: страница перерисовывается уже без них, и без
 * этой прослойки сообщение исчезло бы через долю секунды. Гаснет само через
 * несколько секунд, чтобы не висеть вечно при фоновом обновлении страницы.
 */
export function ContestFlash({
  message,
  tone,
  params,
}: {
  message: string | null;
  tone: "success" | "error";
  params: string[];
}) {
  const [shown, setShown] = useState<{ message: string; tone: "success" | "error" } | null>(
    message ? { message, tone } : null,
  );
  // Новое сообщение (например, после следующего ответа) подхватываем прямо при рендере
  const [lastMessage, setLastMessage] = useState(message);
  if (message !== lastMessage) {
    setLastMessage(message);
    if (message) setShown({ message, tone });
  }

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setShown(null), shown.tone === "error" ? 12000 : 7000);
    return () => window.clearTimeout(timer);
  }, [shown]);

  if (!shown) return null;

  return <FlashMessage message={shown.message} tone={shown.tone} params={params} />;
}
