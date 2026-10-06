"use client";
import { useLocale, useTr } from "@/components/i18n/locale-provider";


import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ChevronDown, ClipboardList, Lock, Plus, UserCheck, Users, UtensilsCrossed } from "lucide-react";
import { MENU_DISH_CATEGORY_LABELS_UZ, type MenuDishCategory } from "@iqbol/shared";
import { formatDate, formatTime, cn } from "@/lib/utils";
import { OrnamentDivider } from "@/components/menus/showcase/ornament-divider";
import { WEEKDAYS_SHORT, daysUntil, whenLabel, type ChefEvent } from "./types";

// The chef reads the menu in cooking order — salads and the main courses
// first, the table extras (appetizers, bread, nuts) after.
const COURSE_ORDER: MenuDishCategory[] = [
  "SALAD",
  "FIRST_DISH",
  "SECOND_DISH",
  "FRUIT",
  "DESSERT",
  "DRINK",
  "COLD_APPETIZER",
  "HOT_APPETIZER",
  "BREAD",
  "DRIED_FRUIT",
  "OTHER",
];

/** A wedding from the chef's point of view: when, how many, what to cook, is shopping sorted. */
export function ChefEventCard({
  event,
  defaultOpen,
  variant = "default",
}: {
  event: ChefEvent;
  defaultOpen?: boolean;
  /** "hero" is the single next-up card on the chef's home page — same data,
   * a touch of the showcase pages' warmth (glow + ornament) since it's the
   * first thing a chef sees every day. Everywhere else (the /worker/events
   * list) stays "default", unchanged. */
  variant?: "default" | "hero";
}) {
  const tr = useTr();
  const locale = useLocale().locale;

  const [open, setOpen] = useState(!!defaultOpen);
  const date = new Date(event.eventDate);
  const soon = daysUntil(date) <= 1;
  const lists = event.shoppingLists;
  const hero = variant === "hero";
  const courses = COURSE_ORDER.map((c) => ({ c, dishes: event.menu.dishes.filter((d) => d.category === c) })).filter((g) => g.dishes.length > 0);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card",
        hero ? "border-primary/30 shadow-md shadow-primary/5" : soon ? "border-primary/40" : "border-border",
      )}
    >
      {hero && <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--surface-glow),transparent_55%)]" />}
      {hero && (
        <div className="relative flex justify-center pt-3">
          <OrnamentDivider className="scale-90 text-accent/70" />
        </div>
      )}
      <div className="relative flex gap-3.5 p-4">
        <div
          className={cn(
            "flex shrink-0 flex-col items-center justify-center rounded-xl py-2",
            hero ? "w-16" : "w-14",
            soon ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          <span className="text-[10px] font-semibold uppercase opacity-80">{WEEKDAYS_SHORT[date.getDay()]}</span>
          <span className={cn("font-display font-semibold leading-none lining-nums", hero ? "text-3xl" : "text-2xl")}>{date.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold">{event.clientName}</p>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", soon ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {tr(whenLabel(date))}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(date, locale)}, {formatTime(date)}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" /> <b className="tabular-nums">{event.guestCount}</b> mehmon
            </span>
            <span className="text-muted-foreground">
              <b className="text-foreground tabular-nums">{event.tableCapacity}</b> kishilik stol
            </span>
            {event.assignments.length > 0 && (
              <span className="inline-flex items-center gap-1 text-success">
                <UserCheck className="h-3.5 w-3.5" /> Siz biriktirilgansiz
              </span>
            )}
          </div>
        </div>
      </div>

      {event.firstDish || event.secondDish ? (
        <div className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3">
          {(
            [
              ["1-ovqat", event.firstDish],
              ["2-ovqat", event.secondDish],
            ] as const
          ).map(([label, dish]) => (
            <div key={label} className="rounded-xl bg-accent/10 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">{label}</p>
              <p className="font-display text-base font-semibold leading-tight [overflow-wrap:anywhere] sm:text-lg">{dish ?? "—"}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="flex items-center gap-2 border-t border-border bg-accent/5 px-4 py-2.5 text-sm text-accent">
          <AlertTriangle className="h-4 w-4 shrink-0" /> 1-ovqat va 2-ovqat hali belgilanmagan
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex w-full items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-sm hover:bg-muted/50"
      >
        <span className="flex min-w-0 items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 shrink-0 text-accent" />
          <span className="truncate font-medium">{event.menu.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">· {event.menu.dishes.length} ta taom</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-border bg-muted/30 px-4 py-3 animate-soft-scale">
          {courses.map(({ c, dishes }) => (
            <div key={c}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{tr(MENU_DISH_CATEGORY_LABELS_UZ[c])}</p>
              <ol className="mt-1 space-y-1 text-sm">
                {dishes.map((d, i) => (
                  <li key={d.id} className="flex gap-2">
                    <span className="w-5 shrink-0 text-right tabular-nums text-muted-foreground">{i + 1}.</span>
                    <span className="min-w-0">{d.name}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5">
        {lists.length > 0 ? (
          <Link href="/worker/shopping?tab=mine" className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <Check className="h-4 w-4" />  {tr("Bozorlik yozilgan")} {lists.length > 1 && `(${lists.length})`}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-accent">
            <ClipboardList className="h-4 w-4" />  {tr("Bozorlik yozilmagan")}
          </span>
        )}
        {event.shoppingClosed ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-muted px-3 text-sm font-medium text-muted-foreground">
            <Lock className="h-4 w-4" /> {tr("Bozorlik yopilgan")}
          </span>
        ) : (
          <Link
            href={`/worker/shopping?event=${event.id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:brightness-95"
          >
            <Plus className="h-4 w-4" /> {lists.length > 0 ? tr("Yana yozish") : tr("Ro'yxat yozish")}
          </Link>
        )}
      </div>
    </div>
  );
}
