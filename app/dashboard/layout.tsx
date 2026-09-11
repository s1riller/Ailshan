import Link from "next/link";
import { Bell, Shield } from "lucide-react";

import { MobileTabBar } from "@/components/mobile-tab-bar";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { requireActiveProfile } from "@/lib/authz";
import { dashboardNav } from "@/lib/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireActiveProfile();
  const isSuperAdmin = profile.role === "super_admin";

  return (
    <div className="min-h-screen-dvh">
      <header className="sticky top-0 z-40 border-b bg-card/90">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16">
          <Link href="/dashboard" className="text-lg font-semibold">
            Ailshan
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="icon" className="lg:hidden">
              <Link href="/dashboard/notifications" aria-label="Уведомления">
                <Bell className="h-5 w-5" />
              </Link>
            </Button>
            {isSuperAdmin ? (
              <Button asChild variant="ghost" className="px-3">
                <Link href="/admin">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
            ) : null}
            <SignOutButton labelClassName="hidden sm:inline" />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-28 pt-5 lg:grid-cols-[220px_1fr] lg:gap-8 lg:pb-12 lg:pt-6">
        <aside className="hidden space-y-1 lg:sticky lg:top-24 lg:block lg:self-start">
          {dashboardNav.map((item) => (
            <Button key={item.href} asChild variant="ghost" className="w-full justify-start">
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </aside>
        {/* min-w-0 не даёт широким таблицам растянуть грид и сломать вёрстку */}
        <main className="min-w-0">{children}</main>
      </div>
      <MobileTabBar variant="dashboard" isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
