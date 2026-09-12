"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  BarChart3,
  Download,
  Gamepad2,
  ImageIcon,
  MessageCircle,
  Monitor,
  Palette,
  QrCode,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { EventTab } from "@/app/dashboard/events/[id]/tabs";

/**
 * Вкладки страницы события. Иконки живут здесь, а не в пропсах: компонент
 * через границу сервер-клиент не передать, поэтому серверная страница
 * присылает только ключ активной вкладки.
 */
const EVENT_TABS: Array<{ value: EventTab; label: string; hint: string; icon: LucideIcon }> = [
  { value: "overview", label: "Обзор", hint: "Сводка", icon: BarChart3 },
  { value: "uploads", label: "Загрузки", hint: "Модерация", icon: ImageIcon },
  { value: "live", label: "Экран зала", hint: "Проектор", icon: Monitor },
  { value: "games", label: "Игры", hint: "Квиз и конкурс", icon: Gamepad2 },
  { value: "guests", label: "Гости", hint: "Кто загружал", icon: Users },
  { value: "qr", label: "QR", hint: "Для печати", icon: QrCode },
  { value: "branding", label: "Оформление", hint: "Цвет и название", icon: Palette },
  { value: "settings", label: "Настройки", hint: "Лимиты и доступ", icon: Settings },
  { value: "export", label: "Экспорт", hint: "Архив", icon: Download },
  { value: "communications", label: "Приглашение", hint: "Для рассылки", icon: MessageCircle },
];

export function EventTabs({ eventId, active }: { eventId: string; active: EventTab }) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  // На телефоне лента длиннее экрана: активная вкладка должна быть видна сразу
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active]);

  return (
    <nav aria-label="Разделы события" className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
      <div className="flex w-max gap-2 md:grid md:w-full md:grid-cols-5">
        {EVENT_TABS.map((tab) => {
          const isActive = tab.value === active;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.value}
              ref={isActive ? activeRef : undefined}
              href={`/dashboard/events/${eventId}?tab=${tab.value}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-[44px] w-40 shrink-0 items-center gap-3 rounded-lg border px-3 py-2 transition-colors md:w-auto",
                isActive ? "border-accent bg-accent-soft" : "bg-card hover:bg-secondary",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-accent" : "text-muted-foreground")} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{tab.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{tab.hint}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
