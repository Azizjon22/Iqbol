"use client";

import { useState } from "react";
import { CalendarSearch, X } from "lucide-react";
import type { EventDetail } from "@/lib/types";
import type { Locale } from "@/i18n/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/events/event-card";
import { toDateParam } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

export function ArchivedEventsGrid({ events, locale }: { events: EventDetail[]; locale: Locale }) {
  const t = useT();
  const [dateFilter, setDateFilter] = useState("");

  const visible = dateFilter ? events.filter((e) => toDateParam(e.eventDate) === dateFilter) : events;

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">{t("events.noArchived")}</CardContent>
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
            <EventCard key={event.id} event={event} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
