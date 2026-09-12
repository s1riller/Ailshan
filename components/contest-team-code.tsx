"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Код команды крупно и кнопка «Позвать к столу»: navigator.share там, где он
 * есть (телефоны), иначе — копирование ссылки с кодом. Гостю не нужно
 * диктовать код под музыку — достаточно переслать ссылку в чат стола.
 */
export function ContestTeamCode({
  teamName,
  code,
  joinUrl,
}: {
  teamName: string;
  code: string;
  /** Абсолютная ссылка на страницу конкурса без параметров */
  joinUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const link = `${joinUrl}?team=${encodeURIComponent(code)}`;
  const text = `Присоединяйтесь к команде «${teamName}»: ${link}`;

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        // Гость закрыл системное окно — это не ошибка
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("[contest] clipboard", error);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="eyebrow">Код команды</div>
        <div className="font-serif tabular mt-1 text-3xl font-medium tracking-[0.3em]">{code}</div>
      </div>
      <Button type="button" variant="outline" onClick={share} className="min-w-[10rem]">
        {copied ? <Check className="h-4 w-4 text-accent" /> : <Share2 className="h-4 w-4" />}
        {copied ? "Скопировано" : "Позвать к столу"}
      </Button>
    </div>
  );
}
