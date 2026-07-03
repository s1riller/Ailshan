import Link from "next/link";
import {
  CalendarDays,
  Crown,
  Images,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Shield,
  User,
  Bell,
} from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { requireActiveProfile } from "@/lib/authz";

const nav = [
  ["/dashboard", "Обзор", LayoutDashboard],
  ["/dashboard/events", "Мероприятия", CalendarDays],
  ["/dashboard/media", "Медиа", Images],
  ["/dashboard/notifications", "Уведомления", Bell],
  ["/dashboard/account", "Профиль", User],
  ["/dashboard/settings", "Настройки", Settings],
  ["/dashboard/upgrade", "Upgrade", Crown],
  ["/dashboard/support", "Поддержка", LifeBuoy],
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireActiveProfile();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-lg font-semibold">
            Ailshan
          </Link>
          <div className="flex items-center gap-2">
            {profile.role === "super_admin" ? (
              <Button asChild variant="ghost">
                <Link href="/admin">
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              </Button>
            ) : null}
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {nav.map(([href, label, Icon]) => (
            <Button
              key={href}
              asChild
              variant="ghost"
              className="w-full justify-start"
            >
              <Link href={href}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </Button>
          ))}
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
