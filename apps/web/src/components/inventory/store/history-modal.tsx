"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import type { InventoryItem, InventoryTxn } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { formatDateTime, cn } from "@/lib/utils";
import { inventoryApi, qty } from "./helpers";

export function TxnRow({ txn, unit, showItem }: { txn: InventoryTxn; unit: InventoryItem["unit"]; showItem?: boolean }) {
  const inbound = txn.type === "IN";
  const fromList = txn.sourceShoppingListItem?.shoppingList;
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          inbound ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
        )}
      >
        {inbound ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          {showItem && txn.item && <span className="font-medium">{txn.item.name} </span>}
          <span className={cn("font-semibold tabular-nums", inbound ? "text-success" : "text-destructive")}>
            {inbound ? "+" : "−"}
            {qty(txn.quantity, unit)}
          </span>
        </p>
        {(txn.note || fromList) && (
          <p className="truncate text-xs text-muted-foreground">
            {txn.note ?? (fromList?.event ? `Bozorlik — ${fromList.event.clientName}` : "Bozorlik ro'yxatidan")}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground/80">
          {formatDateTime(txn.createdAt)} · {txn.createdBy.fullName}
        </p>
      </div>
    </li>
  );
}

export function HistoryModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const [txns, setTxns] = useState<InventoryTxn[] | null>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    inventoryApi<InventoryTxn[]>(`/${item.id}/transactions`)
      .then(setTxns)
      .catch((err) => setError(err instanceof Error ? err.message : "Xatolik"));
  }, [item.id]);

  const totalIn = (txns ?? []).filter((t) => t.type === "IN").reduce((s, t) => s + Number(t.quantity), 0);
  const totalOut = (txns ?? []).filter((t) => t.type === "OUT").reduce((s, t) => s + Number(t.quantity), 0);

  return (
    <Modal open onClose={onClose} title={`${item.name} — tarix`} description={`Hozirgi qoldiq: ${qty(item.quantity, item.unit)}`} size="md">
      {txns === null && !error && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {txns && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-success/10 px-3 py-2">
              <p className="text-xs text-muted-foreground">Jami kirim</p>
              <p className="font-semibold text-success tabular-nums">+{qty(totalIn, item.unit)}</p>
            </div>
            <div className="rounded-xl bg-destructive/10 px-3 py-2">
              <p className="text-xs text-muted-foreground">Jami chiqim</p>
              <p className="font-semibold text-destructive tabular-nums">−{qty(totalOut, item.unit)}</p>
            </div>
          </div>
          {txns.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Hali kirim-chiqim bo&apos;lmagan.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {txns.map((t) => (
                <TxnRow key={t.id} txn={t} unit={item.unit} />
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}
