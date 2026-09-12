import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { MobileTabBar, SidebarNav } from "@/components/mobile-tab-bar";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/authz";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();

  return (
    <div className="min-h-screen-dvh">
      <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="font-serif text-xl font-medium tracking-[0.01em]">Ailshan</span>
            <span className="eyebrow hidden sm:inline">Управление платформой</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" className="w-11 px-0 sm:w-auto sm:px-3">
              <Link href="/dashboard" aria-label="Личный кабинет">
                <LayoutDashboard className="h-5 w-5" />
                <span className="hidden sm:inline">Личный кабинет</span>
              </Link>
            </Button>
            <SignOutButton className="w-11 px-0 sm:w-auto sm:px-3" labelClassName="hidden sm:inline" />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-28 pt-5 lg:grid-cols-[220px_1fr] lg:gap-10 lg:pb-12 lg:pt-8">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <SidebarNav variant="admin" />
        </aside>
        {/* min-w-0 не даёт широким таблицам растянуть грид и сломать вёрстку */}
        <main className="min-w-0">{children}</main>
      </div>
      <MobileTabBar variant="admin" />
    </div>
  );
}
