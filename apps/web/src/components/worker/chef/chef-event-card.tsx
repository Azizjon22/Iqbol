"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ChevronDown, ClipboardList, Plus, UserCheck, Users, UtensilsCrossed } from "lucide-react";
import { MENU_DISH_CATEGORIES, MENU_DISH_CATEGORY_LABELS_UZ } from "@shodiyora/shared";
import { formatDate, formatTime, cn } from "@/lib/utils";
import { WEEKDAYS_SHORT, daysUntil, whenLabel, type ChefEvent } from "./types";

/** A wedding from the chef's point of view: when, how many, what to cook, is shopping sorted. */
export function ChefEventCard({ event, defaultOpen }: { event: ChefEvent; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const date = new Date(event.eventDate);
  const soon = daysUntil(date) <= 1;
  const lists = event.shoppingLists;
  const courses = MENU_DISH_CATEGORIES.map((c) => ({ c, dishes: event.menu.dishes.filter((d) => d.category === c) })).filter((g) => g.dishes.length > 0);

  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card", soon ? "border-primary/40" : "border-border")}>
      <div className="flex gap-3.5 p-4">
        <div className={cn("flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2", soon ? "bg-primary text-primary-foreground" : "bg-muted")}>
          <span className="text-[10px] font-semibold uppercase opacity-80">{WEEKDAYS_SHORT[date.getDay()]}</span>
          <span className="font-display text-2xl font-semibold leading-none lining-nums">{date.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold">{event.clientName}</p>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", soon ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {whenLabel(date)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(date)}, {formatTime(date)}
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
              <p className="font-display truncate text-lg font-semibold leading-tight">{dish ?? "—"}</p>
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
        className="flex w-full items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-sm hover:bg-muted/50"
      >
        <span className="inline-flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-accent" />
          <span className="font-medium">{event.menu.name}</span>
          <span className="text-xs text-muted-foreground">· {event.menu.dishes.length} ta taom</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-border bg-muted/30 px-4 py-3 animate-soft-scale">
          {courses.map(({ c, dishes }) => (
            <div key={c}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{MENU_DISH_CATEGORY_LABELS_UZ[c]}</p>
              <p className="mt-0.5 text-sm">{dishes.map((d) => d.name).join(" · ")}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
        {lists.length > 0 ? (
          <Link href="/worker/shopping?tab=mine" className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <Check className="h-4 w-4" /> Bozorlik yozilgan {lists.length > 1 && `(${lists.length})`}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-accent">
            <ClipboardList className="h-4 w-4" /> Bozorlik yozilmagan
          </span>
        )}
        <Link
          href={`/worker/shopping?event=${event.id}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:brightness-95"
        >
          <Plus className="h-4 w-4" /> {lists.length > 0 ? "Yana yozish" : "Ro'yxat yozish"}
        </Link>
      </div>
    </div>
  );
}
