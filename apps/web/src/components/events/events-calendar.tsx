"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatTime, toDateParam } from "@/lib/utils";
import { UZ_MONTHS } from "@/lib/utils";

const WEEKDAYS_UZ = ["Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"];

interface CalendarEvent {
  id: string;
  clientName: string;
  eventDate: string;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  // Monday = 0 ... Sunday = 6
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ date: new Date(year, month, i - firstWeekday + 1), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }
  return cells;
}

type Filter = "all" | "free" | "booked";

export function EventsCalendar({ events, readOnly = false }: { events: CalendarEvent[]; readOnly?: boolean }) {
  const tr = useTr();

  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [filter, setFilter] = useState<Filter>("all");

  const cells = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = toDateParam(new Date(event.eventDate));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    }
    return map;
  }, [events]);

  return (
    <Card>
      <CardHeader className="flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={tr("Oldingi oy")}
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-36 text-center font-semibold">
            {UZ_MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={tr("Keyingi oy")}
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted p-1 text-xs font-medium">
          {(
            [
              ["all", tr("Barchasi")],
              ["free", tr("Bo'sh kunlar")],
              ["booked", tr("Band kunlar")],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1.5 transition-colors",
                filter === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS_UZ.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map(({ date, inMonth }) => {
            const key = toDateParam(date);
            const dayEvents = eventsByDay.get(key) ?? [];
            const isBooked = dayEvents.length > 0;
            const isToday = sameDay(date, today);
            const dimmed = (filter === "free" && isBooked) || (filter === "booked" && !isBooked);

            return (
              <div
                key={key}
                className={cn(
                  "flex min-h-20 flex-col gap-1 rounded-md border p-1.5 text-left transition",
                  !inMonth && "border-transparent opacity-30",
                  inMonth && isBooked && "border-primary/40 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 hover:shadow-sm",
                  inMonth && !isBooked && "border-border bg-card hover:border-primary/30 hover:bg-muted/60 hover:shadow-sm",
                  inMonth && dimmed && "opacity-30",
                  isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                )}
              >
                <span className={cn("text-xs font-medium", isBooked ? "text-primary" : "text-muted-foreground")}>
                  {date.getDate()}
                </span>
                {inMonth &&
                  dayEvents.slice(0, 2).map((event) => {
                    const tagContent = (
                      <>
                        <span className="shrink-0 font-semibold">{formatTime(event.eventDate)}</span>
                        <span className="truncate">{event.clientName}</span>
                      </>
                    );
                    const tagClassName =
                      "flex items-baseline gap-1 truncate rounded bg-primary/15 px-1 py-0.5 text-[10px] font-medium text-primary";
                    return readOnly ? (
                      <span key={event.id} className={tagClassName}>
                        {tagContent}
                      </span>
                    ) : (
                      <Link key={event.id} href={`/dashboard/events/${event.id}`} className={cn(tagClassName, "hover:bg-primary/25")}>
                        {tagContent}
                      </Link>
                    );
                  })}
                {inMonth && dayEvents.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} ta</span>
                )}
                {inMonth && !readOnly && (
                  <Link
                    href={`/dashboard/events/new?date=${key}`}
                    className="mt-auto flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary"
                  >
                    <Plus className="h-3 w-3" />  {tr("to'y")}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
