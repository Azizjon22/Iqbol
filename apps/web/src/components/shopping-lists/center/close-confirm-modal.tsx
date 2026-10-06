"use client";
import { useLocale, useTr } from "@/components/i18n/locale-provider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Lock } from "lucide-react";
import { UNIT_LABELS_UZ } from "@iqbol/shared";
import type { ShoppingList } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { formatSom, cn } from "@/lib/utils";
import { itemCost, listApi } from "./helpers";

const fmtQty = (q: string) => Number(q).toLocaleString("uz-UZ", { maximumFractionDigits: 3 });

/**
 * The last look before the prices are locked. Every line has to be ticked by
 * hand — no "select all" — because a typo here becomes the wedding's cost.
 */
export function CloseConfirmModal({ list, open, onClose }: { list: ShoppingList; open: boolean; onClose: () => void }) {
  const tr = useTr();
  const locale = useLocale().locale;
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const total = list.items.reduce((s, i) => s + itemCost(i), 0);
  const allChecked = list.items.length > 0 && list.items.every((i) => checked.has(i.id));

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirm() {
    if (!allChecked) return;
    setBusy(true);
    setError(undefined);
    try {
      await listApi(`/${list.id}/status`, "PATCH", { status: "CLOSED", confirmedItemIds: [...checked] });
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Xatolik yuz berdi"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={tr("Narxlarni tekshirib tasdiqlang")}
      description={tr("Har bir mahsulotning miqdori va narxini tekshirib, belgilab chiqing.")}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {tr("Orqaga — narxni tuzataman")}
          </Button>
          <Button type="button" onClick={confirm} disabled={!allChecked || busy}>
            <Lock className="h-4 w-4" /> {tr("Tasdiqlash va yopish")}
          </Button>
        </div>
      }
    >
      <p className="mb-3 flex items-start gap-2 rounded-xl bg-accent/10 px-3 py-2 text-xs text-accent">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {tr("Tasdiqlangandan keyin narxlarni o'zgartirib bo'lmaydi.")}
        </span>
      </p>

      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{tr("Tekshirildi:")} <b className={cn("tabular-nums", allChecked ? "text-success" : "text-foreground")}>{checked.size} / {list.items.length}</b></span>
        {!allChecked && <span>{tr("Har bir qatorni bosib belgilang")}</span>}
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {list.items.map((item) => {
          const on = checked.has(item.id);
          const cost = itemCost(item);
          const unit = tr(UNIT_LABELS_UZ[item.unit]);
          return (
            <li key={item.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(item.id)}
                className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left transition", on ? "bg-success/10" : "hover:bg-muted/60")}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition",
                    on ? "border-success bg-success text-success-foreground" : "border-border bg-card",
                  )}
                >
                  {on && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium [overflow-wrap:anywhere]">{item.name}</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    {fmtQty(item.quantity)} {unit}
                    {item.unitPrice !== null && ` × ${formatSom(Number(item.unitPrice), locale)}`}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatSom(cost, locale)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
        <span className="text-sm font-medium">{tr("Jami bozorlik")}</span>
        <span className="font-display text-xl font-semibold tabular-nums">{formatSom(total, locale)}</span>
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </Modal>
  );
}
