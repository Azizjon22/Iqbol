"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarSearch, X } from "lucide-react";
import type { EventDetail } from "@/lib/types";
import type { Locale } from "@/i18n/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/events/event-card";
import { DissolvingCard } from "@/components/events/dissolving-card";
import { toDateParam } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * The events grid on the main To'ylar page. Whatever is showing here is
 * "current" — the moment local midnight ticks past an event's date, it
 * dissolves off this list on its own (no reload needed) and lands in the
 * archive page, since the archive is just "eventDate before today".
 */
export function UpcomingEventsGrid({ events, locale }: { events: EventDetail[]; locale: Locale }) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewDissolve = searchParams.get("preview") === "dissolve";
  const [items, setItems] = useState(events);
  const [dissolvingIds, setDissolvingIds] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState("");

  const eventsKey = events.map((e) => e.id).join(",");
  const [syncedKey, setSyncedKey] = useState(eventsKey);
  if (eventsKey !== syncedKey) {
    setSyncedKey(eventsKey);
    setItems(events);
    setDissolvingIds(new Set());
  }

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function checkAndArm() {
      const today = startOfDay(new Date());
      const stale = itemsRef.current.filter((e) => startOfDay(new Date(e.eventDate)) < today);
      if (stale.length > 0) {
        setDissolvingIds((current) => new Set([...current, ...stale.map((e) => e.id)]));
      }

      const now = new Date();
      const nextMidnight = startOfDay(now);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      const ms = nextMidnight.getTime() - now.getTime() + 500;
      timer = setTimeout(checkAndArm, ms);
    }

    checkAndArm();
    return () => clearTimeout(timer);
  }, []);

  // ?preview=dissolve lets anyone see the archive transition on demand,
  // instead of waiting for real midnight, by snapping the first card.
  useEffect(() => {
    if (!previewDissolve) return;
    const first = itemsRef.current[0];
    if (!first) return;
    const timer = setTimeout(() => setDissolvingIds((current) => new Set(current).add(first.id)), 400);
    return () => clearTimeout(timer);
  }, [previewDissolve]);

  function handleDone(id: string) {
    setItems((current) => current.filter((e) => e.id !== id));
    setDissolvingIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    if (!previewDissolve) router.refresh();
  }

  const visible = dateFilter ? items.filter((e) => toDateParam(e.eventDate) === dateFilter) : items;

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">{t("common.noData")}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <CalendarSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="pl-9 pr-9"
          aria-label={t("events.filterByDate")}
        />
        {dateFilter && (
          <button
            type="button"
            onClick={() => setDateFilter("")}
            aria-label={t("common.close")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t("events.noResultsForDate")}</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((event) => (
            <DissolvingCard key={event.id} dissolving={dissolvingIds.has(event.id)} onDone={() => handleDone(event.id)}>
              <EventCard event={event} locale={locale} />
            </DissolvingCard>
          ))}
        </div>
      )}
    </div>
  );
}
