"use client";
import { useLocale, useTr } from "@/components/i18n/locale-provider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import { UNIT_LABELS_UZ } from "@iqbol/shared";
import type { ProductCatalogItem, ShoppingListItem } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { ItemQuantity } from "@/components/shopping-lists/item-quantity";
import { ProductCategoryIcon } from "@/components/inventory/product-category-icon";
import { formatSom, cn } from "@/lib/utils";
import { itemCost, listApi, parseNumber } from "./helpers";

type PriceMode = "total" | "unit";

/**
 * One line of the list in "bazaar mode": tap "Olindi", type what you paid
 * (total or per kg) and what you actually got, done.
 */
export function PurchaseRow({
  listId,
  item,
  catalog,
  canBuy,
  canFixPrice,
}: {
  listId: string;
  item: ShoppingListItem;
  catalog?: ProductCatalogItem;
  canBuy: boolean;
  canFixPrice: boolean;
}) {
  const tr = useTr();
  const locale = useLocale().locale;

  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [mode, setMode] = useState<PriceMode>("total");
  const [price, setPrice] = useState("");
  const [bought, setBought] = useState(String(Number(item.quantity)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const unit = tr(UNIT_LABELS_UZ[item.unit]);
  const qtyNum = parseNumber(bought);
  const priceNum = parseNumber(price);
  const validQty = qtyNum > 0;
  const validPrice = price.trim() !== "" && priceNum >= 0;
  const qtyForMath = fixing ? Number(item.quantity) : qtyNum;
  const derived = validPrice && qtyForMath > 0 ? (mode === "total" ? priceNum / qtyForMath : priceNum * qtyForMath) : null;

  async function save() {
    if (!validPrice || (!fixing && !validQty)) return;
    setBusy(true);
    setError(undefined);
    const priceBody = mode === "total" ? { totalPrice: priceNum } : { unitPrice: priceNum };
    try {
      if (fixing) {
        await listApi(`/${listId}/items/${item.id}/price`, "PATCH", priceBody);
      } else {
        await listApi(`/${listId}/items/${item.id}/purchase`, "PATCH", {
          ...priceBody,
          ...(qtyNum !== Number(item.quantity) ? { quantity: qtyNum } : {}),
        });
      }
      setOpen(false);
      setFixing(false);
      setPrice("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  const editing = open || fixing;

  return (
    <li className={cn("px-3 py-2.5 transition sm:px-4", item.isPurchased && !fixing && "bg-success/[0.04]")}>
      <div className="flex items-center gap-3">
        <span className="relative h-11 w-11 shrink-0">
          {catalog?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={catalog.photoUrl} alt={item.name} className="h-11 w-11 rounded-xl object-cover" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              {catalog?.productCategory ? (
                <ProductCategoryIcon category={catalog.productCategory} className="h-5 w-5" />
              ) : (
                <UtensilsCrossed className="h-5 w-5" />
              )}
            </span>
          )}
          {item.isPurchased && (
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground ring-2 ring-card">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-medium", item.isPurchased && "text-muted-foreground")}>{item.name}</p>
          <p className="text-xs text-muted-foreground">
            <ItemQuantity item={item} />
            {item.note && ` · ${item.note}`}
          </p>
        </div>
        {item.isPurchased ? (
          <div className="flex shrink-0 items-center gap-1">
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">{formatSom(itemCost(item), locale)}</p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                1 {unit} · {formatSom(item.unitPrice ?? 0, locale)}
              </p>
            </div>
            {canFixPrice && !fixing && (
              <button
                type="button"
                onClick={() => {
                  setFixing(true);
                  setMode("total");
                  setPrice("");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                title={tr("Narxni tuzatish")}
                aria-label={tr("Narxni tuzatish")}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          canBuy &&
          !open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              <ShoppingBag className="h-4 w-4" />  {tr("Olindi")}
            </button>
          )
        )}
      </div>

      {editing && (
        <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3 animate-soft-scale">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-card p-0.5 text-xs font-medium">
              {(
                [
                  ["total", tr("Jami summa")],
                  ["unit", `1 ${unit} narxi`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={cn("rounded-md px-2.5 py-1.5 transition", mode === key ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{tr("Faqat shu to'y uchun — omborga tushmaydi")}</span>
          </div>
          <div className="mt-2.5 grid gap-2 min-[420px]:grid-cols-[1fr_auto]">
            <div className="relative">
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="numeric"
                placeholder={mode === "total" ? "masalan: 120000" : "masalan: 15000"}
                autoFocus
                className="h-11 pr-14 text-base font-semibold tabular-nums"
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{tr("so'm")}</span>
            </div>
            {!fixing && (
              <label className="relative block">
                <Input
                  value={bought}
                  onChange={(e) => setBought(e.target.value)}
                  inputMode="decimal"
                  className="h-11 w-full pr-12 tabular-nums min-[420px]:w-32"
                  aria-label={tr("Olingan miqdor")}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
              </label>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {derived !== null
                ? mode === "total"
                  ? `1 ${unit} = ${formatSom(Math.round(derived), locale)}`
                  : tr(`Jami = ${formatSom(Math.round(derived), locale)}`)
                : !fixing && validQty && qtyNum !== Number(item.quantity)
                  ? `Rejada ${Number(item.quantity)} ${unit}, olindi ${qtyNum} ${unit}`
                  : tr("Narxni kiriting")}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setFixing(false);
                  setError(undefined);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label={tr("Bekor qilish")}
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy || !validPrice || (!fixing && !validQty)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success px-4 text-sm font-semibold text-success-foreground transition hover:brightness-95 disabled:opacity-40"
              >
                <Check className="h-4 w-4" /> {busy ? "..." : fixing ? tr("Saqlash") : tr("Sotib olindi")}
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      )}
    </li>
  );
}
