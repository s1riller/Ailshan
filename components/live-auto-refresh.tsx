"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

/**
 * Автообновление страницы: раз в `intervalMs` перечитывает данные с сервера
 * (router.refresh). Ничего не рисует.
 *
 * Для экрана зала (`keepAwake`) работает как сторож — вечер длится часы, и
 * проектор никто не трогает:
 * - Wake Lock не даёт ноутбуку погасить экран или включить заставку;
 * - если обновление зависло (сервер не ответил, сеть моргнула) дольше
 *   `stuckMs`, страница перезагружается целиком — это лечит любое состояние;
 * - раз в `reloadAfterMs` страница перезагружается планово: за часы
 *   тысячи router.refresh копят память во вкладке;
 * - при возврате сети или вкладки на экран данные перечитываются сразу.
 */
export function LiveAutoRefresh({
  intervalMs = 8000,
  keepAwake = false,
  stuckMs = 45000,
  reloadAfterMs = 45 * 60 * 1000,
}: {
  intervalMs?: number;
  /** Экран зала: держать дисплей включённым и перезагружаться при зависании */
  keepAwake?: boolean;
  /** Сколько ждать завершения обновления, прежде чем перезагрузить страницу */
  stuckMs?: number;
  /** Плановая полная перезагрузка (0 — выключить) */
  reloadAfterMs?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Отметки времени ставятся в эффектах: Date.now() в рендере — побочный эффект
  const lastDoneRef = useRef(0);
  const startedAtRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    startedAtRef.current = now;
    lastDoneRef.current = now;
  }, []);

  // Обновление завершилось — переход перестал быть «в ожидании»
  useEffect(() => {
    if (!pending) lastDoneRef.current = Date.now();
  }, [pending]);

  useEffect(() => {
    const refresh = () => startTransition(() => router.refresh());

    const tick = () => {
      if (!keepAwake) {
        refresh();
        return;
      }

      const now = Date.now();
      if (reloadAfterMs > 0 && now - startedAtRef.current > reloadAfterMs) {
        window.location.reload();
        return;
      }
      if (now - lastDoneRef.current > stuckMs) {
        window.location.reload();
        return;
      }
      refresh();
    };

    const interval = window.setInterval(tick, intervalMs);
    const onOnline = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs, keepAwake, stuckMs, reloadAfterMs]);

  // Wake Lock отпускается системой, когда вкладка уходит с экрана, — берём снова
  useEffect(() => {
    if (!keepAwake || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // Режим энергосбережения или запрет браузера — экран зала работает и без замка
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [keepAwake]);

  return null;
}
