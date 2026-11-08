import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { ChefStockItem, ChefStockUsage } from "@/lib/types";
import { StockPicker } from "@/components/worker/chef/stock-picker";
import { daysUntil, type ChefEvent } from "@/components/worker/chef/types";

export default async function WorkerStockPage() {
  const session = await getSession();
  if (session?.user.kind !== "WORKER" || session.user.position !== "CHEF") redirect("/worker");
  const [items, usages, agenda] = await Promise.all([
    apiFetch<ChefStockItem[]>("/inventory/stock"),
    apiFetch<ChefStockUsage[]>("/inventory/usages/mine"),
    apiFetch<ChefEvent[]>("/events/chef-agenda").catch(() => []),
  ]);
  // The store is opened only for today's and tomorrow's weddings.
  const events = agenda.filter((e) => daysUntil(e.eventDate) <= 1);
  return <StockPicker items={items} events={events} usages={usages} />;
}
