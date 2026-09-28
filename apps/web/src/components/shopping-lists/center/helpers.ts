import type { ProductCategory, ShoppingListStatus } from "@shodiyora/shared";
import type { ProductCatalogItem, ShoppingList, ShoppingListItem } from "@/lib/types";

export type Stage = "review" | "buying" | "done";

export function stageOf(status: ShoppingListStatus): Stage {
  if (status === "SUBMITTED" || status === "REVIEWED") return "review";
  if (status === "APPROVED") return "buying";
  return "done";
}

export function itemCost(item: ShoppingListItem) {
  return item.isPurchased && item.unitPrice !== null ? Number(item.unitPrice) * Number(item.quantity) : 0;
}

export function listProgress(list: ShoppingList) {
  const total = list.items.length;
  const bought = list.items.filter((i) => i.isPurchased).length;
  const spent = list.items.reduce((s, i) => s + itemCost(i), 0);
  return { total, bought, spent, complete: total > 0 && bought === total };
}

/** Catalog lookup by name, case-insensitive — chefs don't always match capitals. */
export function catalogIndex(catalog: ProductCatalogItem[]) {
  const map = new Map(catalog.map((c) => [c.name.trim().toLowerCase(), c]));
  return (name: string) => map.get(name.trim().toLowerCase());
}

const SECTION_ORDER: ProductCategory[] = ["VEGETABLE", "GREENS", "FRUIT", "MEAT", "DAIRY", "GRAIN", "OIL", "SPICE", "DRINK", "OTHER"];

/** Items grouped the way you walk a bazaar: vegetables together, meat together… */
export function groupBySection(items: ShoppingListItem[], lookup: ReturnType<typeof catalogIndex>) {
  return SECTION_ORDER.map((section) => ({
    section,
    items: items.filter((i) => (lookup(i.name)?.productCategory ?? "OTHER") === section),
  })).filter((g) => g.items.length > 0);
}

export async function listApi(path: string, method: string, body?: unknown) {
  const res = await fetch(`/api/proxy/shopping-lists${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(message ?? "Xatolik yuz berdi");
  }
  return res.json().catch(() => null);
}

export function parseNumber(value: string) {
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}
