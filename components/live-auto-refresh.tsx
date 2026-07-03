"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function LiveAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, 8000);

    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <div className="fixed left-4 top-4 z-40 hidden items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs opacity-70 backdrop-blur md:flex">
      <span className="h-2 w-2 rounded-full bg-primary" />
      Live
    </div>
  );
}
