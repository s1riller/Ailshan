import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { MobileTabBar } from "@/components/mobile-tab-bar";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/authz";
import { adminNav } from "@/lib/nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();

  return (
    <div className="min-h-screen-dvh">
      <header className="sticky top-0 z-40 border-b bg-card/90">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16">
          <Link href="/admin" className="font-semibold">
            Ailshan Admin
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" className="px-3">
              <Link href="/dashboard" aria-label="Личный кабинет">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
            <SignOutButton labelClassName="hidden sm:inline" />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-28 pt-5 lg:grid-cols-[220px_1fr] lg:gap-8 lg:pb-12 lg:pt-6">
        <aside className="hidden space-y-1 lg:sticky lg:top-24 lg:block lg:self-start">
          {adminNav.map((item) => (
            <Button key={item.href} asChild variant="ghost" className="w-full justify-start">
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
      <MobileTabBar variant="admin" />
    </div>
  );
}
