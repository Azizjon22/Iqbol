import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { EventDetail, Menu } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditEventForm } from "@/components/events/edit-event-form";
import { getLocale } from "@/i18n/locale";
import { getDictionary, translate } from "@/i18n/get-dictionary";

export default async function EditEventPage({ params }: PageProps<"/dashboard/events/[id]/edit">) {
  const { id } = await params;
  const [event, menus, session, locale] = await Promise.all([
    apiFetch<EventDetail>(`/events/${id}`),
    apiFetch<Menu[]>("/menus"),
    getSession(),
    getLocale(),
  ]);
  const dict = getDictionary(locale);
  const t = (key: string, p?: Record<string, string | number>) => translate(dict, key, p);
  const canSetDishes = session?.user.kind === "STAFF" && session.user.role === "SUPER_ADMIN";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("events.edit")}</h1>
        <p className="text-sm text-muted-foreground">{t("events.editEventSubtitle", { name: event.clientName })}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("events.orderDetailsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <EditEventForm event={event} menus={menus} canSetDishes={canSetDishes} />
        </CardContent>
      </Card>
    </div>
  );
}
