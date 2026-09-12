"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type QuizStatus = "draft" | "countdown" | "active" | "finished";

/**
 * Держит страницу гостя в курсе: раз в три секунды тихо перезапрашивает
 * серверные данные, а при смене статуса квиза коротко вибрирует телефоном.
 *
 * Уведомлений намеренно не обещаем: на iPhone в Safari их нет, а на Android
 * без service worker они не приходят, когда вкладка свёрнута. Честнее сказать,
 * что страница обновляется сама.
 */
export function QuizGuestSync({
  status,
  className,
}: {
  status: QuizStatus;
  className?: string;
}) {
  const router = useRouter();
  const previousStatus = useRef(status);

  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(interval);
  }, [router]);

  useEffect(() => {
    if (previousStatus.current === status) return;
    previousStatus.current = status;

    if ((status === "countdown" || status === "active") && typeof navigator.vibrate === "function") {
      navigator.vibrate(status === "active" ? [80, 60, 80] : 80);
    }
  }, [status]);

  return (
    <span className={cn("inline-flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
      Страница обновляется сама
    </span>
  );
}
