import Link from "next/link";
import type { EventDetail } from "@/lib/types";
import type { Locale } from "@/i18n/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDictionary, translate } from "@/i18n/get-dictionary";
import { formatDateTime, formatSom } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "primary" | "success" | "destructive"> = {
  PENDING: "default",
  CONFIRMED: "primary",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export function EventCard({ event, locale }: { event: EventDetail; locale: Locale }) {
  const dict = getDictionary(locale);
  const t = (key: string) => translate(dict, key);

  return (
    <Link href={`/dashboard/events/${event.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{event.clientName}</p>
              <p className="text-sm text-muted-foreground">{formatDateTime(event.eventDate, locale)}</p>
            </div>
            <Badge variant={STATUS_VARIANT[event.status] ?? "default"}>{t(`eventStatus.${event.status}`)}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              {event.guestCount} {t("dashboard.guest")}
            </span>
            <span>
              {event.tableCapacity} {t("dashboard.table")}
            </span>
            <span>{event.menu.name}</span>
          </div>
          {event.totalPrice && <p className="text-sm font-medium text-primary">{formatSom(event.totalPrice, locale)}</p>}
          <div className="flex flex-wrap gap-1">
            {event.assignments.length === 0 ? (
              <span className="text-xs text-destructive">{t("dashboard.workersNotAssigned")}</span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {event.assignments.length} · {t("nav.workers")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
