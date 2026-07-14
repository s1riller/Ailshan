"use client";

import { Bell, BellOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type PermissionState = NotificationPermission | "unsupported";

export function QuizGuestSync({
  quizId,
  quizTitle,
  status,
  startsAt,
}: {
  quizId: string;
  quizTitle: string;
  status: "draft" | "countdown" | "active" | "finished";
  startsAt: string | null;
}) {
  const router = useRouter();
  const [permission, setPermission] = useState<PermissionState>("default");

  useEffect(() => {
    const permissionTimer = window.setTimeout(() => {
      setPermission("Notification" in window ? Notification.permission : "unsupported");
    }, 0);
    const interval = window.setInterval(() => router.refresh(), 3000);
    return () => {
      window.clearTimeout(permissionTimer);
      window.clearInterval(interval);
    };
  }, [router]);

  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const notificationKey = `ailshan-quiz-${quizId}-${status}-${startsAt ?? "now"}`;
    const shouldNotify = (status === "countdown" || status === "active") && !sessionStorage.getItem(notificationKey);
    if (shouldNotify) {
      const body = status === "countdown"
        ? "Ведущий объявил квиз. Приготовьтесь, скоро начало!"
        : "Квиз начался. Откройте страницу и отвечайте всей командой.";
      new Notification(quizTitle, { body, tag: `ailshan-${quizId}` });
      sessionStorage.setItem(notificationKey, "1");
    }
  }, [quizId, quizTitle, startsAt, status]);

  async function requestNotifications() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
        <Bell className="h-4 w-4" />
        Уведомления включены
      </div>
    );
  }

  if (permission === "unsupported" || permission === "denied") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellOff className="h-4 w-4" />
        Следите за началом на этой странице
      </div>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={requestNotifications}>
      <Bell className="h-4 w-4" />
      Сообщить о старте
    </Button>
  );
}
