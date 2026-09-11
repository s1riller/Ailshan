"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Menu, Shield } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminNav, dashboardNav, isNavItemActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Нижняя панель навигации для телефона. На десктопе скрыта — там остаётся
 * боковое меню. Пункты, не поместившиеся в панель, открываются в шторке «Ещё».
 */
export function MobileTabBar({
  variant,
  isSuperAdmin = false,
}: {
  variant: "dashboard" | "admin";
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeSheet = () => setOpen(false);

  const items = variant === "admin" ? adminNav : dashboardNav;
  const rootHref = variant === "admin" ? "/admin" : "/dashboard";
  const primaryItems = items.filter((item) => item.primary).slice(0, 4);
  const activeItem = items.find((item) => isNavItemActive(pathname, item.href, rootHref));
  const moreIsActive = !activeItem?.primary;

  return (
    <>
      <nav
        aria-label="Основная навигация"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-lg lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {primaryItems.map((item) => {
            const active = isNavItemActive(pathname, item.href, rootHref);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 touch-manipulation flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:bg-secondary/60",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                {item.short}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ещё разделы"
            className={cn(
              "flex h-16 touch-manipulation flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:bg-secondary/60",
              moreIsActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Menu className="h-5 w-5" />
            Ещё
          </button>
        </div>
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent position="bottom" className="lg:hidden">
          <DialogHeader>
            <DialogTitle>{variant === "admin" ? "Админка" : "Меню"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => {
              const active = isNavItemActive(pathname, item.href, rootHref);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSheet}
                  className={cn(
                    "flex min-h-14 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-colors active:bg-secondary",
                    active ? "border-primary text-primary" : "bg-card",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 border-t pt-3">
            {variant === "admin" ? (
              <Link
                href="/dashboard"
                onClick={closeSheet}
                className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium active:bg-secondary"
              >
                <LayoutDashboard className="h-4 w-4" />
                Личный кабинет
              </Link>
            ) : isSuperAdmin ? (
              <Link
                href="/admin"
                onClick={closeSheet}
                className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium active:bg-secondary"
              >
                <Shield className="h-4 w-4" />
                Админка
              </Link>
            ) : null}
            <SignOutButton className="w-full justify-start" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
