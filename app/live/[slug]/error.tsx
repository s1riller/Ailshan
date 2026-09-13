"use client";

import { useEffect } from "react";

/**
 * Граница ошибок экрана зала. На проекторе нет никого, кто нажмёт
 * «попробовать снова», поэтому экран чинит себя сам: через несколько секунд
 * повторяет рендер, а если ошибка держится — перезагружает страницу целиком.
 * Внешне это тёмная пауза в тон стене, а не белый экран с кодом ошибки.
 */

// Счётчик на уровне модуля: сам компонент между попытками может
// перемонтироваться, а перезагрузка страницы обнуляет его естественно.
let attempts = 0;

export default function LiveError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[live]", error);
    attempts += 1;
    const hard = attempts >= 3;

    const timer = window.setTimeout(() => {
      if (hard) window.location.reload();
      else reset();
    }, hard ? 10000 : 5000);

    return () => window.clearTimeout(timer);
  }, [error, reset]);

  return (
    <main className="flex h-screen items-center justify-center bg-live text-live-foreground">
      <p className="font-serif text-3xl italic text-live-muted">Экран обновится через несколько секунд…</p>
    </main>
  );
}
