"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function QuizCountdown({ target, className }: { target: string; className?: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const next = Math.max(0, Math.ceil((new Date(target).getTime() - Date.now()) / 1000));
      setSeconds(next);
      if (next === 0) router.refresh();
    };
    const initialUpdate = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 250);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, [router, target]);

  return <span className={cn("tabular-nums", className)}>{seconds ?? "--"}</span>;
}
