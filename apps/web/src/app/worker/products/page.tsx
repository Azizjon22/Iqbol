import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { ProductCatalogItem } from "@/lib/types";
import { ChefProducts } from "@/components/worker/chef/chef-products";

/** The chef's products section: the shopping catalog, with names and photos the chef keeps up. */
export default async function WorkerProductsPage() {
  const session = await getSession();
  if (session?.user.kind !== "WORKER" || session.user.position !== "CHEF") redirect("/worker");
  const products = await apiFetch<ProductCatalogItem[]>("/inventory/catalog");
  return <ChefProducts products={products} />;
}
