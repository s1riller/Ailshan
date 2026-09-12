"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** 04:59 — минуты и секунды всегда двумя цифрами, чтобы число не прыгало по ширине */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Обратный отсчёт до старта квиза. На нуле показываем «Начинаем» и просим
 * сервер переключить статус — один раз, а не каждые 250 мс: в зале 150
 * телефонов, и в момент старта им всем нельзя стучать в базу очередью.
 */
export function QuizCountdown({ target, className }: { target: string; className?: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState<number | null>(null);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    const update = () => {
      const next = Math.max(0, Math.ceil((new Date(target).getTime() - Date.now()) / 1000));
      setSeconds(next);
      if (next === 0 && Date.now() - lastRefreshRef.current > 2000) {
        lastRefreshRef.current = Date.now();
        router.refresh();
      }
    };
    const initialUpdate = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 250);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, [router, target]);

  if (seconds === null) {
    return <span className={cn("font-serif tabular", className)}>--:--</span>;
  }

  if (seconds === 0) {
    return <span className={cn("font-serif", className)}>Начинаем</span>;
  }

  return (
    <span className={cn("font-serif tabular", className)} aria-live="off">
      {formatCountdown(seconds)}
    </span>
  );
}
