import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { ProductCatalogItem, ShoppingList } from "@/lib/types";
import { ChefShopping } from "@/components/worker/chef/chef-shopping";
import type { ChefEvent } from "@/components/worker/chef/types";

export default async function WorkerShoppingPage({ searchParams }: PageProps<"/worker/shopping">) {
  const query = await searchParams;
  const session = await getSession();
  const isChef = session?.user.kind === "WORKER" && session.user.position === "CHEF";
  const [catalog, lists, events] = await Promise.all([
    apiFetch<ProductCatalogItem[]>("/inventory/catalog").catch(() => []),
    apiFetch<ShoppingList[]>("/shopping-lists/mine"),
    isChef ? apiFetch<ChefEvent[]>("/events/chef-agenda").catch(() => []) : Promise.resolve<ChefEvent[]>([]),
  ]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const tab = one(query.tab) === "mine" ? "mine" : "new";
  const sent = one(query.sent) === "1";

  return (
    // Remount on tab/sent changes so a redirect after sending lands on the right tab.
    <ChefShopping
      key={`${tab}-${sent}-${one(query.event) ?? ""}`}
      catalog={catalog}
      events={events}
      lists={lists}
      initialTab={tab}
      initialEventId={one(query.event)}
      justSent={sent}
    />
  );
}
