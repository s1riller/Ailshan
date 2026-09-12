"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Menu, Shield } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminNav, dashboardNav, isNavItemActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

type NavVariant = "dashboard" | "admin";

function navFor(variant: NavVariant) {
  return {
    items: variant === "admin" ? adminNav : dashboardNav,
    rootHref: variant === "admin" ? "/admin" : "/dashboard",
  };
}

/** Точка-индикатор активного раздела: шалфей означает «вы здесь» */
function ActiveDot() {
  return <span aria-hidden className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />;
}

/**
 * Боковое меню для десктопа. Клиентский компонент: только здесь известен
 * текущий адрес, а без него активный пункт не подсветить.
 */
export function SidebarNav({ variant }: { variant: NavVariant }) {
  const pathname = usePathname();
  const { items, rootHref } = navFor(variant);

  return (
    <nav aria-label="Разделы" className="space-y-0.5">
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.href, rootHref);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
              active
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {active ? <ActiveDot /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Нижняя панель навигации для телефона. На десктопе скрыта — там остаётся
 * боковое меню. Пункты, не поместившиеся в панель, открываются в шторке «Ещё».
 */
export function MobileTabBar({
  variant,
  isSuperAdmin = false,
}: {
  variant: NavVariant;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeSheet = () => setOpen(false);

  const { items, rootHref } = navFor(variant);
  const primaryItems = items.filter((item) => item.primary).slice(0, 4);
  const activeItem = items.find((item) => isNavItemActive(pathname, item.href, rootHref));
  const moreIsActive = !activeItem?.primary;

  const tabClass =
    "flex h-16 touch-manipulation flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:bg-secondary/60";

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
                className={cn(tabClass, active ? "text-foreground" : "text-muted-foreground")}
              >
                <item.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                <span className="max-w-full truncate px-1">{item.short}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ещё разделы"
            aria-expanded={open}
            className={cn(tabClass, moreIsActive ? "text-foreground" : "text-muted-foreground")}
          >
            <Menu className="h-5 w-5" strokeWidth={moreIsActive ? 2.4 : 2} />
            Ещё
          </button>
        </div>
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent position="bottom" className="gap-3 lg:hidden">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-medium">
              {variant === "admin" ? "Управление платформой" : "Разделы"}
            </DialogTitle>
          </DialogHeader>
          <nav aria-label="Все разделы" className="divide-y">
            {items.map((item) => {
              const active = isNavItemActive(pathname, item.href, rootHref);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSheet}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center gap-3 px-1 text-sm transition-colors active:bg-secondary",
                    active ? "font-medium text-foreground" : "text-foreground",
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", active ? "text-foreground" : "text-muted-foreground")} />
                  <span className="truncate">{item.label}</span>
                  {active ? <ActiveDot /> : null}
                </Link>
              );
            })}
          </nav>
          <div className="divide-y border-t">
            {variant === "admin" ? (
              <Link
                href="/dashboard"
                onClick={closeSheet}
                className="flex min-h-12 items-center gap-3 px-1 text-sm text-foreground active:bg-secondary"
              >
                <LayoutDashboard className="h-5 w-5 shrink-0 text-muted-foreground" />
                Личный кабинет
              </Link>
            ) : isSuperAdmin ? (
              <Link
                href="/admin"
                onClick={closeSheet}
                className="flex min-h-12 items-center gap-3 px-1 text-sm text-foreground active:bg-secondary"
              >
                <Shield className="h-5 w-5 shrink-0 text-muted-foreground" />
                Управление платформой
              </Link>
            ) : null}
            <div className="pt-1">
              <SignOutButton className="h-12 w-full justify-start px-1 font-normal [&>svg]:text-muted-foreground" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
