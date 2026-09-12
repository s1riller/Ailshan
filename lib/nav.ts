import {
  BarChart3,
  Bell,
  CalendarDays,
  Crown,
  Images,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Короткая подпись для нижней панели на телефоне */
  short: string;
  icon: LucideIcon;
  /** Попадает в нижнюю панель на телефоне */
  primary?: boolean;
};

export const dashboardNav: NavItem[] = [
  { href: "/dashboard", label: "Обзор", short: "Обзор", icon: LayoutDashboard, primary: true },
  { href: "/dashboard/events", label: "События", short: "События", icon: CalendarDays, primary: true },
  { href: "/dashboard/media", label: "Медиа", short: "Медиа", icon: Images, primary: true },
  { href: "/dashboard/notifications", label: "Уведомления", short: "Уведомления", icon: Bell },
  { href: "/dashboard/account", label: "Профиль", short: "Профиль", icon: User, primary: true },
  { href: "/dashboard/settings", label: "Настройки", short: "Настройки", icon: Settings },
  { href: "/dashboard/upgrade", label: "Тариф", short: "Тариф", icon: Crown },
  { href: "/dashboard/support", label: "Поддержка", short: "Поддержка", icon: LifeBuoy },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Обзор", short: "Обзор", icon: BarChart3, primary: true },
  { href: "/admin/users", label: "Организаторы", short: "Аккаунты", icon: Users, primary: true },
  { href: "/admin/events", label: "События", short: "События", icon: CalendarDays, primary: true },
  { href: "/admin/uploads", label: "Фото", short: "Фото", icon: Images, primary: true },
  { href: "/admin/applications", label: "Заявки", short: "Заявки", icon: Inbox },
  { href: "/admin/support", label: "Поддержка", short: "Поддержка", icon: LifeBuoy },
];

export function isNavItemActive(pathname: string, href: string, rootHref: string): boolean {
  if (href === rootHref) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
