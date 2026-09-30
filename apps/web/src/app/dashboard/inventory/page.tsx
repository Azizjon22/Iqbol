import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { InventoryItem, InventoryTxn, UpcomingEvent } from "@/lib/types";
import { StorePage } from "@/components/inventory/store/store-page";

export default async function InventoryPage() {
  const [items, recent, events, session] = await Promise.all([
    apiFetch<InventoryItem[]>("/inventory"),
    apiFetch<InventoryTxn[]>("/inventory/transactions/recent?limit=15").catch(() => []),
    apiFetch<UpcomingEvent[]>("/events/upcoming").catch(() => []),
    getSession(),
  ]);
  const role = session?.user.kind === "STAFF" ? session.user.role : "ADMIN";
  return <StorePage items={items} recent={recent} events={events} role={role} />;
}
