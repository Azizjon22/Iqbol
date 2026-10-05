"use client";
import { useTr } from "@/components/i18n/locale-provider";


import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarHeart, Home, LogOut, ShoppingCart } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth.actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/brand-mark";
import { useBrand } from "@/components/brand/brand-provider";

const TABS = [
  { href: "/worker", label: "Bosh sahifa", icon: Home, exact: true },
  { href: "/worker/events", label: "To'ylar", icon: CalendarHeart, chefOnly: true },
  { href: "/worker/shopping", label: "Bozorlik", icon: ShoppingCart },
];

/** App-like frame for chefs: slim header on top, thumb-reachable tab bar at the bottom. */
export function ChefShell({ name, isChef, children }: { name: string; isChef: boolean; children: React.ReactNode }) {
  const tr = useTr();

  const pathname = usePathname();
  const brand = useBrand();
  const tabs = TABS.filter((t) => !t.chefOnly || isChef);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative isolate min-h-svh bg-background pb-24 lg:pb-8">
      {/* Backdrop: a working restaurant kitchen, veiled by the theme's own
          background colour so text and cards stay readable in both themes. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/backgrounds/chef-kitchen.jpg" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/88 to-background/95" />
      </div>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-2 px-4 md:max-w-3xl lg:max-w-5xl">
          <Link href="/worker" className="flex min-w-0 items-center gap-2.5">
            <BrandMark className="h-9 w-9 shrink-0 text-lg shadow-sm shadow-primary/25" />
            <span className="font-display truncate text-lg font-semibold tracking-tight sm:text-xl">{brand.brandName}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <nav className="mr-2 hidden items-center gap-1 lg:flex">
              {tabs.map((t) => {
                const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-medium transition",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tr(t.label)}
                  </Link>
                );
              })}
            </nav>
            <LanguageSwitcher />
            <ThemeToggle />
            <span title={name} className="ml-1 hidden h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold min-[400px]:flex">
              {initials}
            </span>
            <form suppressHydrationWarning action={logoutAction}>
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={tr("Chiqish")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 sm:py-8 md:max-w-3xl lg:max-w-5xl">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex max-w-md">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition", active ? "text-primary" : "text-muted-foreground")}
              >
                <span className={cn("flex h-8 w-14 items-center justify-center rounded-full transition", active && "bg-primary/10")}>
                  <Icon className="h-5 w-5" />
                </span>
                {tr(t.label)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
