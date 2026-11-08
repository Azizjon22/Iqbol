"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useState } from "react";
import { CalendarDays, CalendarHeart, List } from "lucide-react";
import { EventsCalendar } from "@/components/events/events-calendar";
import { cn } from "@/lib/utils";
import { ChefEventCard } from "./chef-event-card";
import { daysUntil, type ChefEvent } from "./types";

const BUCKETS = [
  { key: "week", label: "Shu hafta", test: (d: number) => d < 7 },
  { key: "month", label: "Keyingi 30 kun", test: (d: number) => d >= 7 && d < 30 },
  { key: "later", label: "Keyinroq", test: (d: number) => d >= 30 },
];

export function ChefAgenda({ events }: { events: ChefEvent[] }) {
  const tr = useTr();

  const [view, setView] = useState<"list" | "calendar">("list");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const shown = onlyMissing ? events.filter((e) => e.shoppingLists.length === 0) : events;
  const missing = events.filter((e) => e.shoppingLists.length === 0).length;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{tr("To'ylar")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {events.length}  {tr("ta to'y rejada")}{missing > 0 && tr(` · ${missing} tasiga bozorlik yozilmagan`)}
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-muted p-1">
          {(
            [
              ["list", <List key="l" className="h-4 w-4" />, tr("Ro'yxat")],
              ["calendar", <CalendarDays key="c" className="h-4 w-4" />, tr("Kalendar")],
            ] as const
          ).map(([key, icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                view === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {view === "calendar" ? (
        <EventsCalendar events={events} readOnly />
      ) : (
        <>
          {missing > 0 && (
            <button
              type="button"
              onClick={() => setOnlyMissing((v) => !v)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                onlyMissing ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              
              {tr("Faqat bozorlik yozilmaganlar (")}{missing})
            </button>
          )}
          {shown.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
              <CalendarHeart className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{tr("Rejada to'y yo'q.")}</p>
            </div>
          )}
          {BUCKETS.map((b) => {
            const items = shown.filter((e) => b.test(daysUntil(e.eventDate)));
            if (items.length === 0) return null;
            return (
              <section key={b.key} className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {tr(b.label)} · {items.length}
                </h2>
                {items.map((e) => (
                  <ChefEventCard key={e.id} event={e} />
                ))}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
