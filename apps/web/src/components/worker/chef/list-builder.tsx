"use client";
import { useLocale, useTr } from "@/components/i18n/locale-provider";


import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Copy, Minus, Plus, Search, ShoppingBasket, Trash2, Users, X } from "lucide-react";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS_UZ,
  UNITS,
  UNIT_LABELS_UZ,
  type ProductCategory,
  type Unit,
} from "@iqbol/shared";
import type { ProductCatalogItem, ShoppingList } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ProductCategoryIcon } from "@/components/inventory/product-category-icon";
import { formatDate, cn } from "@/lib/utils";
import { WEEKDAYS_SHORT, whenLabel, type ChefEvent } from "./types";

interface CartLine {
  name: string;
  quantity: number;
  unit: Unit;
  photoUrl?: string | null;
  category?: ProductCategory | null;
}

const key = (name: string) => name.trim().toLowerCase();

/** Kg/litr round to half-units, pieces round up to whole ones. */
function roundFor(unit: Unit, n: number) {
  if (unit === "DONA") return Math.max(1, Math.ceil(n));
  return Math.max(0.5, Math.round(n * 2) / 2);
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function ListBuilder({
  catalog,
  events,
  previous,
  initialEventId,
}: {
  catalog: ProductCatalogItem[];
  events: ChefEvent[];
  previous: ShoppingList[];
  initialEventId?: string;
}) {
  const tr = useTr();
  const locale = useLocale().locale;

  const router = useRouter();
  const [eventId, setEventId] = useState(() => (events.some((e) => e.id === initialEventId) ? initialEventId! : ""));
  const [cart, setCart] = useState<Map<string, CartLine>>(() => new Map());
  const [section, setSection] = useState<ProductCategory | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState({ name: "", quantity: "", unit: "KG" as Unit });
  const [reviewing, setReviewing] = useState(false);
  const [copying, setCopying] = useState(false);
  const [scaledNote, setScaledNote] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const event = events.find((e) => e.id === eventId);
  const byName = useMemo(() => new Map(catalog.map((c) => [key(c.name), c])), [catalog]);
  const q = query.trim().toLowerCase();
  const products = catalog.filter(
    (c) => (section === "ALL" || (c.productCategory ?? "OTHER") === section) && (!q || c.name.toLowerCase().includes(q)),
  );
  const sections = PRODUCT_CATEGORIES.filter((c) => catalog.some((p) => (p.productCategory ?? "OTHER") === c));
  const lines = [...cart.values()];

  function setQty(line: Omit<CartLine, "quantity">, quantity: number) {
    setCart((prev) => {
      const next = new Map(prev);
      if (quantity <= 0) next.delete(key(line.name));
      else next.set(key(line.name), { ...line, quantity });
      return next;
    });
  }

  function step(p: ProductCatalogItem, dir: 1 | -1) {
    const current = cart.get(key(p.name))?.quantity ?? 0;
    const inc = p.unit === "DONA" ? 1 : current < 1 && dir === -1 ? 0.5 : 1;
    setQty({ name: p.name, unit: p.unit, photoUrl: p.photoUrl, category: p.productCategory }, Math.max(0, +(current + dir * inc).toFixed(3)));
  }

  function addCustom() {
    const qty = Number(custom.quantity.replace(",", "."));
    if (custom.name.trim().length < 2 || !(qty > 0)) return;
    const known = byName.get(key(custom.name));
    setQty(
      { name: known?.name ?? custom.name.trim(), unit: known?.unit ?? custom.unit, photoUrl: known?.photoUrl, category: known?.productCategory },
      qty,
    );
    setCustom({ name: "", quantity: "", unit: custom.unit });
  }

  /** Start from an earlier list, scaled by guest count when both weddings have one. */
  function copyFrom(list: ShoppingList) {
    const from = list.event?.guestCount;
    const to = event?.guestCount;
    const ratio = from && to ? to / from : 1;
    const next = new Map<string, CartLine>();
    for (const item of list.items) {
      const known = byName.get(key(item.name));
      next.set(key(item.name), {
        name: known?.name ?? item.name,
        unit: item.unit,
        quantity: roundFor(item.unit, Number(item.quantity) * ratio),
        photoUrl: known?.photoUrl,
        category: known?.productCategory,
      });
    }
    setCart(next);
    setScaledNote(
      ratio !== 1
        ? tr(`${list.event?.clientName} ro'yxatidan: ${from} → ${to} mehmon, miqdorlar ×${ratio.toFixed(2)}`)
        : tr(`${list.event?.clientName ?? "Oldingi"} ro'yxatidan nusxa olindi`),
    );
    setCopying(false);
  }

  async function submit() {
    if (lines.length === 0) return;
    if (events.length > 0 && !eventId) {
      setError(tr("Qaysi to'y uchun ekanini tanlang"));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/proxy/shopping-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventId || undefined,
          items: lines.map((l) => ({ name: l.name, quantity: l.quantity, unit: l.unit })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((Array.isArray(data?.message) ? data.message[0] : data?.message) ?? tr("Yuborib bo'lmadi"));
      }
      setCart(new Map());
      setReviewing(false);
      router.push("/worker/shopping?tab=mine&sent=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  const copySources = previous.filter((l) => l.items.length > 0).slice(0, 8);

  return (
    <div className="space-y-5">
      {/* ---------- 1. Wedding ---------- */}
      {events.length > 0 && (
        <section>
          <p className="mb-2 text-sm font-semibold">
            
            {tr("1. Qaysi to'y uchun?")} <span className="text-destructive">*</span>
          </p>
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
                      {tr(whenLabel(d))} · {tr(`${e.guestCount} mehmon`)}
                    </span>
                    {(e.firstDish || e.secondDish) && (
                      <span className="block truncate text-[11px] text-accent">
                        {[e.firstDish, e.secondDish].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {e.shoppingLists.length > 0 && <span className="block text-[11px] text-success">{tr("Ro'yxat bor")}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------- 2. Products ---------- */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">{events.length > 0 ? "2. " : ""}{tr("Mahsulotlarni tanlang")}</p>
          {copySources.length > 0 && (
            <button
              type="button"
              onClick={() => setCopying(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />  {tr("Oldingi ro'yxatdan nusxa")}
            </button>
          )}
        </div>
        {scaledNote && (
          <p className="flex items-start justify-between gap-2 rounded-xl bg-accent/10 px-3 py-2 text-xs text-accent">
            <span>{scaledNote}{tr(". Kerak bo'lsa miqdorlarni to'g'rilang.")}</span>
            <button type="button" onClick={() => setScaledNote(undefined)} aria-label={tr("Yopish")}>
              <X className="h-3.5 w-3.5" />
            </button>
          </p>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Qidirish: kartoshka, sabzi...")} className="h-11 pl-9 pr-9" />
          {q && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={tr("Tozalash")}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {(["ALL", ...sections] as const).map((s) => {
            const picked = s === "ALL" ? lines.length : lines.filter((l) => (l.category ?? "OTHER") === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  section === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                )}
              >
                {s !== "ALL" && <ProductCategoryIcon category={s} className="h-3.5 w-3.5" />}
                {s === "ALL" ? tr("Hammasi") : tr(PRODUCT_CATEGORY_LABELS_UZ[s])}
                {picked > 0 && <span className={cn("rounded-full px-1.5 text-[10px]", section === s ? "bg-primary-foreground/20" : "bg-primary/15 text-primary")}>{picked}</span>}
              </button>
            );
          })}
        </div>

        {products.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            {tr(`"${query}" topilmadi — pastdan qo'lda qo'shing.`)}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 min-[480px]:grid-cols-3">
            {products.map((p) => {
              const qty = cart.get(key(p.name))?.quantity ?? 0;
              const on = qty > 0;
              return (
                <div
                  key={p.id}
                  className={cn("overflow-hidden rounded-2xl border bg-card transition", on ? "border-primary ring-1 ring-primary" : "border-border")}
                >
                  {/* Photo header only when there is a photo — icon-only tiles stay compact. */}
                  {p.photoUrl && (
                    <button type="button" onClick={() => !on && step(p, 1)} className="relative block aspect-[4/3] w-full bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" />
                    </button>
                  )}
                  <div className="p-2">
                    <button type="button" onClick={() => !on && step(p, 1)} className="flex w-full items-center gap-2 text-left">
                      {!p.photoUrl && (
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", on ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                          <ProductCategoryIcon category={p.productCategory ?? "OTHER"} className="h-4 w-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{tr(UNIT_LABELS_UZ[p.unit])}</span>
                    </button>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => step(p, -1)}
                        disabled={!on}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border disabled:opacity-30"
                        aria-label={tr("Kamaytirish")}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        value={on ? fmt(qty) : ""}
                        onChange={(e) => {
                          const n = Number(e.target.value.replace(",", "."));
                          setQty({ name: p.name, unit: p.unit, photoUrl: p.photoUrl, category: p.productCategory }, Number.isFinite(n) ? n : 0);
                        }}
                        inputMode="decimal"
                        placeholder="0"
                        className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent text-center text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-primary/30"
                        aria-label={`${p.name} miqdori`}
                      />
                      <button
                        type="button"
                        onClick={() => step(p, 1)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                        aria-label={tr("Ko'paytirish")}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl border border-dashed border-border p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{tr("Katalogda yo'q mahsulot")}</p>
          <div className="grid grid-cols-[1fr_70px_80px_auto] gap-1.5">
            <Input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder={tr("nomi")} className="h-10" />
            <Input
              value={custom.quantity}
              onChange={(e) => setCustom({ ...custom, quantity: e.target.value })}
              inputMode="decimal"
              placeholder="0"
              className="h-10 text-center"
            />
            <Select value={custom.unit} onChange={(e) => setCustom({ ...custom, unit: e.target.value as Unit })} className="h-10 px-2">
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {tr(UNIT_LABELS_UZ[u])}
                </option>
              ))}
            </Select>
            <button type="button" onClick={addCustom} className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted hover:bg-border" aria-label={tr("Qo'shish")}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {lines.filter((l) => !byName.has(key(l.name))).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {lines
                .filter((l) => !byName.has(key(l.name)))
                .map((l) => (
                  <span key={l.name} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                    {l.name} · {fmt(l.quantity)} {tr(UNIT_LABELS_UZ[l.unit])}
                    <button type="button" onClick={() => setQty(l, 0)} aria-label={tr("O'chirish")}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Sticky cart ---------- */}
      <div className="sticky bottom-[84px] z-20 sm:bottom-4">
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-2xl border p-3 shadow-xl backdrop-blur-md transition",
            lines.length > 0 ? "border-primary/40 bg-card/95" : "border-border bg-card/80",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", lines.length > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              <ShoppingBasket className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{lines.length > 0 ? tr(`${lines.length} ta mahsulot`) : tr("Savat bo'sh")}</p>
              <p className="truncate text-xs text-muted-foreground">
                {event ? tr(`${event.clientName} · ${event.guestCount} mehmon`) : events.length > 0 ? tr("To'y tanlanmagan") : tr("Mahsulot tanlang")}
              </p>
            </div>
          </div>
          <Button type="button" onClick={() => setReviewing(true)} disabled={lines.length === 0} className="shrink-0">
            
            {tr("Ko'rib chiqish")} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ---------- Review ---------- */}
      <Modal
        open={reviewing}
        onClose={() => setReviewing(false)}
        title={tr("Ro'yxatni tekshiring")}
        description={event ? `${event.clientName} — ${formatDate(event.eventDate, locale)}` : undefined}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setReviewing(false)} disabled={busy}>
              Davom etish
            </Button>
            <Button type="button" onClick={submit} disabled={busy || lines.length === 0}>
              {busy ? tr("Yuborilmoqda...") : "Super adminga yuborish"}
            </Button>
          </>
        }
      >
        {event && (
          <p className="mb-3 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" /> {event.guestCount}  {tr("mehmon ·")} {event.menu.name}
          </p>
        )}
        {event && (
          <p className="mb-3 rounded-xl bg-accent/10 px-3 py-2 text-sm">
            <span className="text-accent">1-ovqat:</span> <b>{event.firstDish ?? "belgilanmagan"}</b>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-accent">2-ovqat:</span> <b>{event.secondDish ?? "belgilanmagan"}</b>
          </p>
        )}
        {events.length > 0 && !eventId && <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{tr("Yuqorida to'yni tanlang.")}</p>}
        <ul className="divide-y divide-border">
          {lines.map((l) => (
            <li key={l.name} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">{l.name}</span>
              <input
                value={fmt(l.quantity)}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(",", "."));
                  if (Number.isFinite(n)) setQty(l, n);
                }}
                inputMode="decimal"
                className="h-9 w-20 rounded-lg border border-input bg-transparent text-center text-sm font-semibold tabular-nums"
                aria-label={`${l.name} miqdori`}
              />
              <span className="w-9 text-xs text-muted-foreground">{tr(UNIT_LABELS_UZ[l.unit])}</span>
              <button
                type="button"
                onClick={() => setQty(l, 0)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={tr("O'chirish")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </Modal>

      {/* ---------- Copy from previous ---------- */}
      <Modal
        open={copying}
        onClose={() => setCopying(false)}
        title={tr("Oldingi ro'yxatdan nusxa")}
        description={event ? tr(`Miqdorlar ${event.guestCount} mehmonga moslanadi`) : tr("Avval to'yni tanlasangiz, miqdorlar mehmon soniga moslanadi")}
        size="sm"
      >
        <ul className="space-y-2">
          {copySources.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => copyFrom(l)}
                className="w-full rounded-xl border border-border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <p className="truncate text-sm font-semibold">{l.event?.clientName ?? tr("To'ysiz ro'yxat")}</p>
                <p className="text-xs text-muted-foreground">
                  {tr(`${l.items.length} ta mahsulot`)}
                  {l.event?.guestCount ? tr(` · ${l.event.guestCount} mehmon`) : ""}
                  {event && l.event?.guestCount ? ` → ×${(event.guestCount / l.event.guestCount).toFixed(2)}` : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
