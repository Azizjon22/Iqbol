import { getTr } from "@/i18n/server-tr";
import { getLocale } from "@/i18n/locale";
import { pickLang } from "@/i18n/pick";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { EventDetail, Menu } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditEventForm } from "@/components/events/edit-event-form";

export default async function EditEventPage({ params }: PageProps<"/dashboard/events/[id]/edit">) {
  const tr = await getTr();
  const locale = await getLocale();

  const { id } = await params;
  const [event, menus, session] = await Promise.all([
    apiFetch<EventDetail>(`/events/${id}`),
    apiFetch<Menu[]>("/menus"),
    getSession(),
  ]);
  const canSetDishes = session?.user.kind === "STAFF" && session.user.role === "SUPER_ADMIN";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{tr("To'yni tahrirlash")}</h1>
        <p className="text-sm text-muted-foreground">{pickLang(locale, event.clientName, event.clientNameRu)}  {tr("— mehmonlar soni, sana yoki menyuni yangilang")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{tr("Buyurtma tafsilotlari")}</CardTitle>
        </CardHeader>
        <CardContent>
          <EditEventForm event={event} menus={menus} canSetDishes={canSetDishes} />
        </CardContent>
      </Card>
    </div>
  );
}
