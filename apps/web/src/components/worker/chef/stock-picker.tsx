"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Minus, PackageOpen, Plus, Search, Undo2, Warehouse, X } from "lucide-react";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS_UZ,
  UNIT_LABELS_UZ,
  type ProductCategory,
} from "@iqbol/shared";
import type { ChefStockItem, ChefStockUsage } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProductCategoryIcon } from "@/components/inventory/product-category-icon";
import { formatDate, formatTime, cn } from "@/lib/utils";
import { WEEKDAYS_SHORT, daysUntil, whenLabel, type ChefEvent } from "./types";

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, "");
}

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(`/api/proxy/inventory${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error((Array.isArray(data?.message) ? data.message[0] : data?.message) ?? "Xatolik yuz berdi");
  }
}

/**
 * The store as the chef sees it: what is on the shelves (never what it cost),
 * and a way to mark what was taken for today's or tomorrow's wedding.
 */
export function StockPicker({
  items,
  events,
  usages,
}: {
  items: ChefStockItem[];
  events: ChefEvent[];
  usages: ChefStockUsage[];
}) {
  const router = useRouter();
  const [eventId, setEventId] = useState(events.length === 1 ? events[0].id : "");
  const [taking, setTaking] = useState<Map<string, number>>(() => new Map());
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<ProductCategory | "ALL">("ALL");
  const [reviewing, setReviewing] = useState(false);
  const [returning, setReturning] = useState<ChefStockUsage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  const event = events.find((e) => e.id === eventId);
  const q = query.trim().toLowerCase();
  const sections = PRODUCT_CATEGORIES.filter((c) => items.some((i) => (i.productCategory ?? "OTHER") === c));
  const visible = items.filter(
    (i) => (section === "ALL" || (i.productCategory ?? "OTHER") === section) && (!q || i.name.toLowerCase().includes(q)),
  );
  const grouped = useMemo(
    () =>
      PRODUCT_CATEGORIES.map((category) => ({
        category,
        rows: visible.filter((i) => (i.productCategory ?? "OTHER") === category),
      })).filter((g) => g.rows.length > 0),
    [visible],
  );
  const lines = items.filter((i) => (taking.get(i.id) ?? 0) > 0);
  // A chef may take back only what they took today.
  const today = usages.filter((u) => daysUntil(u.createdAt) === 0);

  function setQty(item: ChefStockItem, value: number) {
    const max = Number(item.quantity);
    const next = Math.max(0, Math.min(value, max));
    setTaking((prev) => {
      const map = new Map(prev);
      if (next <= 0) map.delete(item.id);
      else map.set(item.id, +next.toFixed(3));
      return map;
    });
  }

  async function submit() {
    if (!eventId || lines.length === 0) return;
    setBusy(true);
    setError(undefined);
    try {
      await api("/usages", "POST", {
        eventId,
        items: lines.map((i) => ({ itemId: i.id, quantity: taking.get(i.id) })),
      });
      setTaking(new Map());
      setReviewing(false);
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  async function giveBack() {
    if (!returning) return;
    try {
      await api(`/usages/${returning.id}`, "DELETE");
      setReturning(null);
      router.refresh();
    } catch (err) {
      setReturning(null);
      window.alert(err instanceof Error ? err.message : "Xatolik yuz berdi");
    }
  }

  return (
    <div className="space-y-5 pb-40 animate-fade-up sm:pb-24">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Ombor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          To&apos;y uchun ombordan olgan mahsulotingizni shu yerda belgilang — qoldiq o&apos;zi kamayadi.
        </p>
      </div>

      {done && (
        <p className="flex items-start justify-between gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm text-success">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" /> Yozildi. Super adminga xabar yuborildi.
          </span>
          <button type="button" onClick={() => setDone(false)} aria-label="Yopish">
            <X className="h-4 w-4" />
          </button>
        </p>
      )}

      {/* ---------- 1. Wedding ---------- */}
      <section>
        <p className="mb-2 text-sm font-semibold">
          1. Qaysi to&apos;y uchun? <span className="text-destructive">*</span>
        </p>
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card/70 p-4 text-sm text-muted-foreground">
            Bugun va ertaga to&apos;y yo&apos;q. Ombordan faqat bugungi yoki ertangi to&apos;y uchun olinadi.
          </p>
        ) : (
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
            {events.map((e) => {
              const d = new Date(e.eventDate);
              const selected = e.id === eventId;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEventId(e.id)}
                  className={cn(
                    "flex w-56 shrink-0 snap-start items-center gap-3 rounded-2xl border p-3 text-left transition",
                    selected ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <span className={cn("flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5", selected ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    <span className="text-[10px] font-semibold uppercase opacity-80">{WEEKDAYS_SHORT[d.getDay()]}</span>
                    <span className="font-display text-xl font-semibold leading-none lining-nums">{d.getDate()}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{e.clientName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {whenLabel(d)} · {e.guestCount} mehmon
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- 2. Products ---------- */}
      <section className="space-y-3">
        <p className="text-sm font-semibold">2. Nima oldingiz?</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Qidirish: asal, un, yog'..." className="h-11 pl-9 pr-9" />
          {q && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Tozalash">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {(["ALL", ...sections] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                section === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {s !== "ALL" && <ProductCategoryIcon category={s} className="h-3.5 w-3.5" />}
              {s === "ALL" ? "Hammasi" : PRODUCT_CATEGORY_LABELS_UZ[s]}
            </button>
          ))}
        </div>

        {grouped.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card/70 p-4 text-center text-sm text-muted-foreground">
            {q ? `"${query}" omborda topilmadi.` : "Omborda mahsulot yo'q."}
          </p>
        ) : (
          grouped.map(({ category, rows }) => (
            <div key={category} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <p className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold">
                <ProductCategoryIcon category={category} className="h-4 w-4 text-accent" />
                {PRODUCT_CATEGORY_LABELS_UZ[category]}
                <span className="ml-auto text-xs font-normal text-muted-foreground">{rows.length} ta</span>
              </p>
              <ul className="divide-y divide-border">
                {rows.map((item) => {
                  const have = Number(item.quantity);
                  const take = taking.get(item.id) ?? 0;
                  const stepBy = item.unit === "DONA" ? 1 : 0.5;
                  const empty = have <= 0;
                  return (
                    <li key={item.id} className={cn("flex items-center gap-3 px-3 py-2.5 transition", take > 0 && "bg-primary/5")}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className={cn("text-xs", empty ? "text-destructive" : "text-muted-foreground")}>
                          {empty ? "Omborda tugagan" : `Omborda: ${fmt(have)} ${UNIT_LABELS_UZ[item.unit]}`}
                          {take > 0 && <span className="text-accent"> → {fmt(+(have - take).toFixed(3))} qoladi</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQty(item, take - stepBy)}
                          disabled={take <= 0}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border transition active:scale-95 disabled:opacity-30"
                          aria-label="Kamaytirish"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          value={take > 0 ? fmt(take) : ""}
                          onChange={(e) => {
                            const n = Number(e.target.value.replace(",", "."));
                            setQty(item, Number.isFinite(n) ? n : 0);
                          }}
                          disabled={empty}
                          inputMode="decimal"
                          placeholder="0"
                          className="h-10 w-16 rounded-lg border border-input bg-transparent text-center text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40"
                          aria-label={`${item.name} miqdori`}
                        />
                        <button
                          type="button"
                          onClick={() => setQty(item, take + stepBy)}
                          disabled={empty || take >= have}
                          className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition active:scale-95 disabled:opacity-30"
                          aria-label="Ko'paytirish"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>

      {/* ---------- Taken today ---------- */}
      {usages.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-semibold">Oxirgi olinganlar</p>
          {usages.slice(0, 6).map((u) => (
            <div key={u.id} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{u.event.clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(u.createdAt)}, {formatTime(u.createdAt)}
                  </p>
                </div>
                {today.includes(u) && (
                  <button
                    type="button"
                    onClick={() => setReturning(u)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Qaytarish
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {u.items.map((i) => `${i.name} ${fmt(Number(i.quantity))} ${UNIT_LABELS_UZ[i.unit]}`).join(" · ")}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* ---------- Floating bar ---------- */}
      <div className="fixed inset-x-0 bottom-[84px] z-20 px-4 sm:bottom-4">
        <div
          className={cn(
            "mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl border p-3 shadow-xl backdrop-blur-md transition",
            lines.length > 0 ? "border-primary/40 bg-card/95" : "border-border bg-card/80",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", lines.length > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              <Warehouse className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{lines.length > 0 ? `${lines.length} ta mahsulot` : "Hech narsa tanlanmagan"}</p>
              <p className="truncate text-xs text-muted-foreground">{event ? event.clientName : "To'y tanlanmagan"}</p>
            </div>
          </div>
          <Button type="button" onClick={() => setReviewing(true)} disabled={lines.length === 0} className="shrink-0">
            Olish <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ---------- Review ---------- */}
      <Modal
        open={reviewing}
        onClose={() => setReviewing(false)}
        title="Ombordan olinadi"
        description={event ? `${event.clientName} — ${formatDate(event.eventDate)}` : undefined}
        footer={
          <div className="grid w-full grid-cols-2 gap-2">
            <Button type="button" onClick={submit} disabled={busy || lines.length === 0 || !eventId}>
              <PackageOpen className="h-4 w-4" /> {busy ? "Yozilmoqda..." : "Tasdiqlash"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setReviewing(false)} disabled={busy}>
              Yana qo&apos;shish
            </Button>
          </div>
        }
      >
        {!eventId && <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">Yuqorida to&apos;yni tanlang.</p>}
        <p className="mb-1 text-xs text-muted-foreground">Tasdiqlagach ombor qoldig&apos;i kamayadi va super adminga ro&apos;yxat boradi.</p>
        <ul className="divide-y divide-border">
          {lines.map((i) => (
            <li key={i.id} className="flex items-center gap-2 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{i.name}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {fmt(taking.get(i.id) ?? 0)} <span className="text-xs font-normal text-muted-foreground">{UNIT_LABELS_UZ[i.unit]}</span>
              </span>
              <button
                type="button"
                onClick={() => setQty(i, 0)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Olib tashlash"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </Modal>

      <ConfirmDialog
        open={returning !== null}
        onClose={() => setReturning(null)}
        title="Omborga qaytarilsinmi?"
        message={
          returning
            ? `${returning.items.map((i) => `${i.name} ${fmt(Number(i.quantity))} ${UNIT_LABELS_UZ[i.unit]}`).join(", ")} — hammasi omborga qaytariladi.`
            : ""
        }
        confirmLabel="Qaytarish"
        onConfirm={giveBack}
      />
    </div>
  );
}
