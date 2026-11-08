import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Menu } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateEventForm } from "@/components/events/create-event-form";
import { getLocale } from "@/i18n/locale";
import { getDictionary, translate } from "@/i18n/get-dictionary";

export default async function NewEventPage({ searchParams }: PageProps<"/dashboard/events/new">) {
  const [menus, params, session, locale] = await Promise.all([
    apiFetch<Menu[]>("/menus"),
    searchParams,
    getSession(),
    getLocale(),
  ]);
  const dict = getDictionary(locale);
  const t = (key: string, p?: Record<string, string | number>) => translate(dict, key, p);
  const canSetDishes = session?.user.kind === "STAFF" && session.user.role === "SUPER_ADMIN";
  const defaultDate = typeof params.date === "string" ? params.date : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("events.newEventTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("events.newEventSubtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("events.orderDetailsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateEventForm menus={menus} defaultDate={defaultDate} canSetDishes={canSetDishes} />
        </CardContent>
      </Card>
    </div>
  );
}
