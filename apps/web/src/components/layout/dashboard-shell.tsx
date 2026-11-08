"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronLeft, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import type { StaffRole } from "@iqbol/shared";
import { NAV_GROUPS, NAV_ITEMS, isNavActive } from "./nav-config";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/auth.actions";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import { BrandMark } from "@/components/brand/brand-mark";

const COLLAPSE_KEY = "nav-collapsed";

type NavMode = "full" | "rail" | "auto";

const NAV_CLASSES: Record<NavMode, { group: string; title: string; link: string; label: string; badge: string }> = {
  full: {
    group: "mb-4",
    title: "block",
    link: "gap-3 px-3 py-2.5 text-sm",
    label: "truncate",
    badge: "ml-auto h-5 min-w-5 text-[11px]",
  },
  rail: {
    group: "mb-3",
    title: "hidden",
    link: "flex-col justify-center gap-1 px-1 py-2 text-center text-[10px] leading-tight",
    label: "line-clamp-2 break-words",
    badge: "absolute right-1 top-1 h-4 min-w-4 text-[10px]",
  },
  auto: {
    group: "mb-3 xl:mb-4",
    title: "hidden xl:block",
    link: "flex-col justify-center gap-1 px-1 py-2 text-center text-[10px] leading-tight xl:flex-row xl:justify-start xl:gap-3 xl:px-3 xl:py-2.5 xl:text-left xl:text-sm",
    label: "line-clamp-2 break-words xl:line-clamp-none xl:truncate",
    badge: "absolute right-1 top-1 h-4 min-w-4 text-[10px] xl:static xl:ml-auto xl:h-5 xl:min-w-5 xl:text-[11px]",
  },
};

export function DashboardShell({
  fullName,
  role,
  pendingShoppingListsCount = 0,
  children,
}: {
  fullName: string;
  role: StaffRole;
  pendingShoppingListsCount?: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const { t } = useLocale();

  useEffect(() => {
    // Hydration-safe: starts false on the server/first paint, then corrects
    // from localStorage once mounted, so SSR output never has to guess it.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const items = useMemo(() => NAV_ITEMS.filter((item) => item.roles.includes(role)), [role]);

  const activeItem = items.find((item) => isNavActive(pathname, item.href));
  const pageTitle = activeItem ? t(activeItem.labelKey) : t("nav.dashboard");

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // "full" = labelled list (mobile drawer, wide desktop); "rail" = icon over a
  // short label (user-collapsed); "auto" = rail on tablets and small laptops
  // (md..xl) where a 260px sidebar would squeeze the page, full from xl up.
  const navContent = (mode: NavMode) => {
    const c = NAV_CLASSES[mode];
    return (
      <>
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.group === group.id);
          if (groupItems.length === 0) return null;
          return (
            <div key={group.id} className={c.group}>
              <p className={cn("mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80", c.title)}>
                {t(group.labelKey)}
              </p>
              <div className="flex flex-col gap-0.5">
                {groupItems.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  const Icon = item.icon;
                  const showBadge = item.href === "/dashboard/shopping-lists" && pendingShoppingListsCount > 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={mode === "full" ? undefined : t(item.labelKey)}
                      className={cn(
                        "group relative flex items-center rounded-xl font-medium transition-all",
                        c.link,
                        active
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "text-foreground/70 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "opacity-100" : "opacity-80")} />
                      <span className={cn("max-w-full", c.label)}>{t(item.labelKey)}</span>
                      {showBadge && (
                        <span
                          className={cn(
                            "flex items-center justify-center rounded-full px-1 font-semibold",
                            c.badge,
                            active
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-destructive text-destructive-foreground",
                          )}
                        >
                          {pendingShoppingListsCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="flex min-h-svh bg-background">
      {/* Desktop sidebar: a rail on tablets (md..xl), full width from xl unless collapsed */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border/70 bg-card md:flex",
          collapsed ? "w-[88px]" : "w-[88px] xl:w-[260px]",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center gap-2.5 border-b border-border/60",
            collapsed ? "justify-center px-2" : "justify-center px-2 xl:justify-start xl:px-4",
          )}
        >
          <BrandMark className="h-9 w-9 shrink-0 text-lg shadow-sm shadow-primary/25" />
          {!collapsed && (
            <div className="hidden min-w-0 flex-1 xl:block">
              <p className="font-display truncate text-lg font-semibold leading-tight tracking-tight">
                {t("common.brand")}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">{t(`roles.${role}`)}</p>
            </div>
          )}
        </div>

        <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-2 xl:px-3")}>
          {navContent(collapsed ? "rail" : "auto")}
        </nav>

        {/* Collapsing only makes sense where the full sidebar is shown. */}
        <div className="hidden border-t border-border/60 p-3 xl:block">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span className="text-xs font-medium">{t("nav.collapse")}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(280px,88vw)] flex-col border-r border-border bg-card shadow-xl transition-transform md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border/60 px-4">
          <span className="flex items-center gap-2.5">
            <BrandMark className="h-9 w-9 text-lg" />
            <span className="font-display text-lg font-semibold">{t("common.brand")}</span>
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={t("common.close")}
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">{navContent("full")}</nav>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label={t("common.closeMenu")}
        />
      )}

      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/70 bg-card/85 px-3 backdrop-blur-md sm:gap-3 sm:px-6">
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-foreground hover:bg-muted md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t("common.openMenu")}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {pathname !== "/dashboard" && pathname.startsWith("/dashboard") && (
                <Link
                  href="/dashboard"
                  className="hidden items-center gap-1 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {t("nav.dashboard")}
                </Link>
              )}
            </div>
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-[17px]">{pageTitle}</h1>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {pendingShoppingListsCount > 0 && (
              <Link
                href="/dashboard/shopping-lists"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t("shoppingLists.newLists", { count: pendingShoppingListsCount })}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {pendingShoppingListsCount}
                </span>
              </Link>
            )}
            <Link
              href="/dashboard/profile"
              title={t("nav.profile")}
              className="ml-1 hidden items-center gap-2 rounded-full border border-border/80 bg-muted/40 py-1 pl-1 pr-3 transition hover:border-primary/40 hover:bg-muted md:flex"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {fullName
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="min-w-0 text-left">
                <p className="max-w-[9rem] truncate text-xs font-medium leading-none lg:max-w-[7.5rem] xl:max-w-[10rem]">{fullName}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{t(`roles.${role}`)}</p>
              </div>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t("common.logout")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        {/* Mobile bottom nav — top destinations */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border/80 bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
          {items.slice(0, 5).map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2 text-center text-[10px] font-medium leading-tight",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="line-clamp-2 w-full">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <main className="@container/main min-w-0 flex-1 bg-[radial-gradient(ellipse_at_top,var(--surface-glow),transparent_50%)] p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
