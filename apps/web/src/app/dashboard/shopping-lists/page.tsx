import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { ProductCatalogItem, ShoppingList } from "@/lib/types";
import { CenterPage } from "@/components/shopping-lists/center/center-page";

export default async function ShoppingListsPage() {
  const [lists, catalog, session] = await Promise.all([
    apiFetch<ShoppingList[]>("/shopping-lists"),
    apiFetch<ProductCatalogItem[]>("/inventory/catalog").catch(() => []),
    getSession(),
  ]);
  const isSuperAdmin = session?.user.kind === "STAFF" && session.user.role === "SUPER_ADMIN";

  // Opening this page counts as "seen" — clears the notification badge in the
  // sidebar/header on the next load without requiring further action.
  await apiFetch("/shopping-lists/mark-all-seen", { method: "PATCH" }).catch(() => undefined);

  return <CenterPage lists={lists} catalog={catalog} isSuperAdmin={isSuperAdmin} />;
}
