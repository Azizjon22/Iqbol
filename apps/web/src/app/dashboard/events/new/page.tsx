import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Menu } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateEventForm } from "@/components/events/create-event-form";

export default async function NewEventPage({ searchParams }: PageProps<"/dashboard/events/new">) {
  const [menus, params, session] = await Promise.all([apiFetch<Menu[]>("/menus"), searchParams, getSession()]);
  const canSetDishes = session?.user.kind === "STAFF" && session.user.role === "SUPER_ADMIN";
  const defaultDate = typeof params.date === "string" ? params.date : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Yangi to&apos;y buyurtmasi</h1>
        <p className="text-sm text-muted-foreground">Mijoz va menyu ma&apos;lumotlarini kiriting</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Buyurtma tafsilotlari</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateEventForm menus={menus} defaultDate={defaultDate} canSetDishes={canSetDishes} />
        </CardContent>
      </Card>
    </div>
  );
}
