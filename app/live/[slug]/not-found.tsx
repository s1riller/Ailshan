"use client";

import { useEffect } from "react";

/**
 * Экран зала для несуществующего или выключенного события. На проекторе
 * никто не перезагрузит страницу руками, поэтому она пробует снова сама:
 * ведущий мог случайно выключить событие и тут же включить обратно.
 */
export default function LiveNotFound() {
  useEffect(() => {
    const timer = window.setInterval(() => window.location.reload(), 30000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 bg-live px-8 text-center text-live-foreground">
      <h1 className="font-serif text-5xl font-medium">Событие не найдено</h1>
      <p className="max-w-xl font-serif text-2xl italic text-live-muted">
        Проверьте ссылку и что приём фото включён в кабинете. Экран проверит снова через полминуты.
      </p>
    </main>
  );
}
