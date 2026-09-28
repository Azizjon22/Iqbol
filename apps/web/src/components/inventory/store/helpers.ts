import { UNIT_LABELS_UZ } from "@shodiyora/shared";
import type { InventoryItem } from "@/lib/types";

export type StockLevel = "out" | "low" | "ok";

export function stockLevel(item: InventoryItem): StockLevel {
  const qty = Number(item.quantity);
  if (qty <= 0) return "out";
  if (item.minThreshold != null && qty <= Number(item.minThreshold)) return "low";
  return "ok";
}

/** 0..1 fill for the stock bar; "healthy" is twice the minimum. */
export function stockRatio(item: InventoryItem) {
  const qty = Number(item.quantity);
  const min = item.minThreshold == null ? 0 : Number(item.minThreshold);
  if (min <= 0) return qty > 0 ? 1 : 0;
  return Math.max(0, Math.min(qty / (min * 2), 1));
}

/** "12.5 kg" — trims trailing zeros from the API's 3-decimal strings. */
export function qty(value: string | number, unit: InventoryItem["unit"]) {
  const n = Number(value);
  const text = Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, "");
  return `${text.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${UNIT_LABELS_UZ[unit]}`;
}

export async function inventoryApi<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`/api/proxy/inventory${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(message ?? "Xatolik yuz berdi");
  }
  return data as T;
}
