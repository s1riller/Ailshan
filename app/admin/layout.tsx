import Link from "next/link";
import { BarChart3, CalendarDays, Images, Inbox, LifeBuoy, Users } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/authz";

const nav = [
  ["/admin", "Статистика", BarChart3],
  ["/admin/users", "Пользователи", Users],
  ["/admin/events", "Мероприятия", CalendarDays],
  ["/admin/uploads", "Загрузки", Images],
  ["/admin/applications", "Заявки", Inbox],
  ["/admin/support", "Поддержка", LifeBuoy],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/admin" className="font-semibold">
            Ailshan Admin
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {nav.map(([href, label, Icon]) => (
            <Button key={href} asChild variant="ghost" className="w-full justify-start">
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
