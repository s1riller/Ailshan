"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Экран зала обновляет данные сам, раз в 8 секунд. Ничего не рисует:
 * название события живёт в нижней полосе страницы.
 */
export function LiveAutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [router, intervalMs]);

  return null;
}
