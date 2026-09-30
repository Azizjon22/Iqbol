import { Archive, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { EventDetail } from "@/lib/types";
import { LinkButton } from "@/components/ui/button";
import { EventsCalendar } from "@/components/events/events-calendar";
import { UpcomingEventsGrid } from "@/components/events/upcoming-events-grid";
import { getLocale } from "@/i18n/locale";
import { getDictionary, translate } from "@/i18n/get-dictionary";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default async function EventsPage() {
  const [events, locale] = await Promise.all([apiFetch<EventDetail[]>("/events"), getLocale()]);
  const dict = getDictionary(locale);
  const t = (key: string, params?: Record<string, string | number>) => translate(dict, key, params);

  const today = startOfDay(new Date());
  const upcoming = events.filter((e) => startOfDay(new Date(e.eventDate)) >= today);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("events.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("events.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/dashboard/events/archive" variant="outline">
            <Archive className="h-4 w-4" /> {t("events.viewArchive")}
          </LinkButton>
          <LinkButton href="/dashboard/events/new">
            <Plus className="h-4 w-4" /> {t("events.new")}
          </LinkButton>
        </div>
      </div>

      <EventsCalendar
        events={events
          .filter((e) => e.status !== "CANCELLED")
          .map((e) => ({ id: e.id, clientName: e.clientName, eventDate: e.eventDate }))}
      />

      <UpcomingEventsGrid events={upcoming} locale={locale} />
    </div>
  );
}
