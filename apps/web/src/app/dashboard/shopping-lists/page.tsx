import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { ProductCatalogItem, ShoppingList } from "@/lib/types";
import { CenterPage } from "@/components/shopping-lists/center/center-page";

export default async function ShoppingListsPage() {
  // Chefs run their lists themselves; only the super admin watches them.
  const session = await getSession();
  if (session?.user.kind !== "STAFF" || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard/events");
  }
  const [lists, catalog] = await Promise.all([
    apiFetch<ShoppingList[]>("/shopping-lists"),
    apiFetch<ProductCatalogItem[]>("/inventory/catalog").catch(() => []),
  ]);

  // Opening this page counts as "seen" — clears the notification badge in the
  // sidebar/header on the next load without requiring further action.
  await apiFetch("/shopping-lists/mark-all-seen", { method: "PATCH" }).catch(() => undefined);

  return <CenterPage lists={lists} catalog={catalog} />;
}
