"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { UNIT_LABELS_UZ, UNITS, type Unit } from "@iqbol/shared";
import type { ShoppingList } from "@/lib/types";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isShoppingListSent } from "@/lib/shopping-list-status";

interface Row {
  id?: string;
  name: string;
  quantity: string;
  unit: Unit;
  note: string | null;
  /** Chef's figure, for the "8 → 5" hint while editing. */
  original: string | null;
}

function rowsFrom(list: ShoppingList): Row[] {
  return list.items
    .filter((item) => !item.isPurchased)
    .map((item) => ({
      id: item.id,
      name: item.name,
      quantity: String(Number(item.quantity)),
      unit: item.unit,
      note: item.note,
      original: item.originalQuantity ?? String(Number(item.quantity)),
    }));
}

async function send(path: string, method: string, body?: unknown) {
  const res = await fetch(`/api/proxy/shopping-lists/${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(message ?? "Xatolik yuz berdi");
  }
}

/**
 * SUPER_ADMIN's controls on a chef's list: correct quantities, drop or add
 * items, then forward it to ADMIN. Purchased items are locked and not shown.
 */
export function ShoppingListEditor({ list }: { list: ShoppingList }) {
  const router = useRouter();
  const sent = isShoppingListSent(list.status);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(list));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function startEditing() {
    setRows(rowsFrom(list));
    setError(undefined);
    setEditing(true);
  }

  function validRows() {
    const cleaned = rows.map((r) => ({ ...r, name: r.name.trim() }));
    if (cleaned.some((r) => r.name.length < 2)) {
      throw new Error("Mahsulot nomini kiriting (kamida 2 harf)");
    }
    if (cleaned.some((r) => !(Number(r.quantity) > 0))) {
      throw new Error("Miqdor 0 dan katta bo'lishi kerak");
    }
    if (cleaned.length === 0) {
      throw new Error("Ro'yxatda kamida bitta mahsulot qolishi kerak");
    }
    return cleaned.map((r) => ({
      id: r.id,
      name: r.name,
      quantity: Number(r.quantity),
      unit: r.unit,
      note: r.note ?? undefined,
    }));
  }

  async function run(andApprove: boolean) {
    setError(undefined);
    setBusy(true);
    try {
      if (editing) {
        await send(`${list.id}/items`, "PUT", { items: validRows() });
      }
      if (andApprove) {
        await send(`${list.id}/approve`, "POST");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {list.items.some((i) => !i.isPurchased) && (
          <Button type="button" size="sm" variant="outline" onClick={startEditing} disabled={busy}>
            <Pencil className="h-4 w-4" /> Tahrirlash
          </Button>
        )}
        {!sent && (
          <Button type="button" size="sm" onClick={() => run(true)} disabled={busy}>
            <Send className="h-4 w-4" /> {busy ? "Yuborilmoqda..." : "Adminga yuborish"}
          </Button>
        )}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-primary/40 bg-primary/5 p-3">
      <p className="text-sm font-medium">Ro&apos;yxatni tahrirlash</p>
      <div className="space-y-2">
        {rows.map((row, index) => {
          const chefQuantity = row.id && row.original !== null ? Number(row.original) : 0;
          const changed = chefQuantity > 0 && chefQuantity !== Number(row.quantity);
          return (
            <div key={row.id ?? `new-${index}`} className="flex flex-wrap items-center gap-2">
              {row.id ? (
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
              ) : (
                <Input
                  value={row.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder="Mahsulot nomi"
                  className="h-8 min-w-0 flex-1"
                />
              )}
              {changed && (
                <span className="text-xs text-muted-foreground">
                  oshpaz: <span className="line-through">{chefQuantity}</span>
                </span>
              )}
              <Input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={row.quantity}
                onChange={(e) => update(index, { quantity: e.target.value })}
                className="h-8 w-24"
                aria-label={`${row.name || "Mahsulot"} miqdori`}
              />
              <Select
                value={row.unit}
                onChange={(e) => update(index, { unit: e.target.value as Unit })}
                className="h-8 w-24"
                aria-label="O'lchov birligi"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS_UZ[u]}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="O'chirish"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setRows((prev) => [...prev, { name: "", quantity: "", unit: "KG", note: null, original: null }])}
      >
        <Plus className="h-4 w-4" /> Mahsulot qo&apos;shish
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button type="button" size="sm" variant="outline" onClick={() => run(false)} disabled={busy}>
          {busy ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
        {!sent && (
          <Button type="button" size="sm" onClick={() => run(true)} disabled={busy}>
            <Send className="h-4 w-4" /> Saqlab, adminga yuborish
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
          <X className="h-4 w-4" /> Bekor qilish
        </Button>
      </div>
    </div>
  );
}
