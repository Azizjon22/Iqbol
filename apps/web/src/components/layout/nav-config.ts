import type { StaffRole } from "@shodiyora/shared";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarHeart,
  UtensilsCrossed,
  Presentation,
  Users,
  Warehouse,
  ShoppingCart,
  Wallet,
  UserCog,
  History,
  CircleUserRound,
} from "lucide-react";

export type NavGroupId = "main" | "ops" | "finance" | "admin";

export interface NavItem {
  href: string;
  labelKey: string;
  roles: StaffRole[];
  icon: LucideIcon;
  group: NavGroupId;
}

export const NAV_GROUPS: { id: NavGroupId; labelKey: string }[] = [
  { id: "main", labelKey: "nav.groupMain" },
  { id: "ops", labelKey: "nav.groupOps" },
  { id: "finance", labelKey: "nav.groupFinance" },
  { id: "admin", labelKey: "nav.groupAdmin" },
];

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    labelKey: "nav.dashboard",
    roles: ["SUPER_ADMIN", "ZAVZAL"],
    icon: LayoutDashboard,
    group: "main",
  },
  {
    href: "/dashboard/events",
    labelKey: "nav.events",
    roles: ["SUPER_ADMIN", "ADMIN", "ZAVZAL"],
    icon: CalendarHeart,
    group: "main",
  },
  {
    href: "/showcase",
    labelKey: "nav.presentation",
    roles: ["SUPER_ADMIN", "ADMIN"],
    icon: Presentation,
    group: "main",
  },
  {
    href: "/dashboard/menus",
    labelKey: "nav.menus",
    roles: ["SUPER_ADMIN"],
    icon: UtensilsCrossed,
    group: "ops",
  },
  {
    href: "/dashboard/workers",
    labelKey: "nav.workers",
    roles: ["SUPER_ADMIN", "ADMIN", "ZAVZAL"],
    icon: Users,
    group: "ops",
  },
  {
    href: "/dashboard/inventory",
    labelKey: "nav.inventory",
    roles: ["SUPER_ADMIN", "ADMIN"],
    icon: Warehouse,
    group: "ops",
  },
  {
    href: "/dashboard/shopping-lists",
    labelKey: "nav.shoppingLists",
    roles: ["SUPER_ADMIN", "ADMIN"],
    icon: ShoppingCart,
    group: "ops",
  },
  {
    href: "/dashboard/accounting",
    labelKey: "nav.accounting",
    roles: ["SUPER_ADMIN"],
    icon: Wallet,
    group: "finance",
  },
  {
    href: "/dashboard/staff",
    labelKey: "nav.staff",
    roles: ["SUPER_ADMIN"],
    icon: UserCog,
    group: "admin",
  },
  {
    href: "/dashboard/audit-log",
    labelKey: "nav.auditLog",
    roles: ["SUPER_ADMIN"],
    icon: History,
    group: "admin",
  },
  {
    href: "/dashboard/profile",
    labelKey: "nav.profile",
    roles: ["SUPER_ADMIN", "ADMIN", "ZAVZAL"],
    icon: CircleUserRound,
    group: "admin",
  },
];

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
