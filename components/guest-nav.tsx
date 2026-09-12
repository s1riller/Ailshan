"use client";

import { Camera, Gamepad2, Images } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Нижняя навигация гостя: три страницы вечера всегда в одном тапе.
 * Раньше галереи не было, а игры прятались за кнопкой внизу формы —
 * гость, отсканировавший QR, не догадывался о второй половине сервиса.
 */
export function GuestNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/e/${encodeURIComponent(slug)}`;
  const items = [
    { href: base, label: "Снимок", icon: Camera, exact: true },
    { href: `${base}/gallery`, label: "Галерея", icon: Images, exact: false },
    { href: `${base}/play`, label: "Игры", icon: Gamepad2, exact: false },
  ];

  // pathname приходит уже раскодированным, а base мы кодируем — сравниваем оба варианта
  const decodedBase = `/e/${slug}`;
  const isActive = (href: string, exact: boolean) => {
    const decoded = href.replace(base, decodedBase);
    if (exact) return pathname === href || pathname === decoded || pathname === `${decoded}/thanks`;
    return pathname.startsWith(href) || pathname.startsWith(decoded);
  };

  return (
    <nav
      aria-label="Страницы события"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-lg"
    >
      <div className="mx-auto grid max-w-lg grid-cols-3">
        {items.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-16 touch-manipulation flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:bg-secondary/60",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
