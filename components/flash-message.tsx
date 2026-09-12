"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

/**
 * Одноразовое сообщение после server action. Экшены передают результат через
 * query-параметр, но оставлять его в адресе нельзя — при обновлении страницы
 * гость снова увидел бы «Ответ принят». Показываем и сразу чистим адрес.
 */
export function FlashMessage({
  message,
  tone = "success",
  params,
}: {
  message: string | null;
  tone?: "success" | "error";
  /** Какие query-параметры убрать из адреса после показа */
  params: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!message) return;
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of params) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const next = url.searchParams.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [message, params, pathname, router]);

  if (!message) return null;

  const Icon = tone === "error" ? AlertCircle : CheckCircle2;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive-soft text-destructive"
          : "border-success/30 bg-success-soft text-success",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="text-foreground">{message}</span>
    </div>
  );
}
