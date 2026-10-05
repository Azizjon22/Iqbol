"use client";
import { useLocale, useTr } from "@/components/i18n/locale-provider";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Copy, Minus, Plus, Search, Send, ShoppingBasket, Trash2, Users, X } from "lucide-react";
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

/**
 * The chef writes the list dish by dish so nothing is forgotten. That split
 * lives only on this screen: the list that is sent carries one total per
 * product. GENERAL holds amounts that belong to no dish (copied lists).
 */
type Stage = "SALAD" | "FIRST_DISH" | "SECOND_DISH" | "OTHER";
type PartKey = Stage | "GENERAL";

const STAGES: { id: Stage; label: string; purpose: string }[] = [
  { id: "SALAD", label: "Salatlar", purpose: "Salatlar uchun" },
  { id: "FIRST_DISH", label: "1-ovqat", purpose: "1-ovqat uchun" },
  { id: "SECOND_DISH", label: "2-ovqat", purpose: "2-ovqat uchun" },
  { id: "OTHER", label: "Boshqa taomlar", purpose: "Boshqa taomlar uchun" },
];
const PART_LABELS: Record<PartKey, string> = {
  SALAD: "Salat",
  FIRST_DISH: "1-ovqat",
  SECOND_DISH: "2-ovqat",
  OTHER: "Boshqa",
  GENERAL: "Umumiy",
};
const PART_ORDER: PartKey[] = ["SALAD", "FIRST_DISH", "SECOND_DISH", "OTHER", "GENERAL"];

interface CartLine {
  name: string;
  /** Sum of `parts` — the one number the super admin sees. */
  quantity: number;
  parts: Partial<Record<PartKey, number>>;
  unit: Unit;
  photoUrl?: string | null;
  category?: ProductCategory | null;
}

/** Cover photo for a product category — files live in public/categories. */
const categoryCover = (c: ProductCategory) => `/categories/${c.toLowerCase()}.jpg`;

const key = (name: string) => name.trim().toLowerCase();

/** Kg/litr round to half-units, pieces round up to whole ones. */
function roundFor(unit: Unit, n: number) {
  if (unit === "DONA") return Math.max(1, Math.ceil(n));
  return Math.max(0.5, Math.round(n * 2) / 2);
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** The dishes of one stage: the couple's pick when there is one, else the menu's options. */
function stageDishes(event: ChefEvent | undefined, stage: Stage): string[] {
  if (!event) return [];
  if (stage === "FIRST_DISH" && event.firstDish) return [event.firstDish];
  if (stage === "SECOND_DISH" && event.secondDish) return [event.secondDish];
  return event.menu.dishes
    .filter((d) => (stage === "OTHER" ? !["SALAD", "FIRST_DISH", "SECOND_DISH"].includes(d.category) : d.category === stage))
    .map((d) => d.name);
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
  const [stage, setStage] = useState<Stage>("SALAD");
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
  // No filter and no search: show the category covers instead of products.
  const browsing = section === "ALL" && q === "";
  const sections = PRODUCT_CATEGORIES.filter((c) => catalog.some((p) => (p.productCategory ?? "OTHER") === c));
  const lines = [...cart.values()];

  const stageIndex = STAGES.findIndex((s) => s.id === stage);
  const nextStage = STAGES[stageIndex + 1];
  const dishes = stageDishes(event, stage);
  const partOf = (name: string, part: PartKey = stage) => cart.get(key(name))?.parts[part] ?? 0;

  function goToStage(next: Stage) {
    setStage(next);
    setSection("ALL");
    setQuery("");
  }

  /** Sets one dish stage's share of a product; the line's total follows. */
  function setQty(line: Omit<CartLine, "quantity" | "parts">, quantity: number, part: PartKey = stage) {
    setCart((prev) => {
      const next = new Map(prev);
      const parts = { ...prev.get(key(line.name))?.parts };
      if (quantity > 0) parts[part] = quantity;
      else delete parts[part];
      const total = +Object.values(parts).reduce((sum, n) => sum + n, 0).toFixed(3);
      if (total <= 0) next.delete(key(line.name));
      else next.set(key(line.name), { ...line, quantity: total, parts });
      return next;
    });
  }

  function removeLine(name: string) {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(key(name));
      return next;
    });
  }

  function step(p: ProductCatalogItem, dir: 1 | -1) {
    const current = partOf(p.name);
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
        parts: { GENERAL: roundFor(item.unit, Number(item.quantity) * ratio) },
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
      setError(err instanceof Error ? err.message : tr("Xatolik yuz berdi"));
    } finally {
      setBusy(false);
    }
  }

  const copySources = previous.filter((l) => l.items.length > 0).slice(0, 8);

  return (
    <div className="space-y-5 pb-40 sm:pb-24">
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
              <Copy className="h-3.5 w-3.5" /> {tr("Oldingi ro'yxatdan nusxa")}
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

        {/* Dish stages: what the chef is shopping for right now. */}
        <div className="rounded-2xl border border-border bg-card/60 p-3 shadow-sm">
          <div className="grid grid-cols-4 gap-1.5">
            {STAGES.map((s, i) => {
              const count = lines.filter((l) => (l.parts[s.id] ?? 0) > 0).length;
              const active = s.id === stage;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToStage(s.id)}
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition duration-300",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "border-border hover:-translate-y-0.5 hover:border-accent/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                      active ? "bg-primary-foreground/20" : count > 0 ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {!active && count > 0 ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="w-full truncate text-[11px] font-medium sm:text-xs">{tr(s.label)}</span>
                  <span className={cn("text-[10px] tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {count} {tr("ta")}
                  </span>
                </button>
              );
            })}
          </div>
          <div key={stage} className="mt-3 flex flex-wrap items-center justify-between gap-3 animate-fade-up">
            {/* Full row on phones, so the dish names wrap normally and the
                "next" button drops underneath instead of squeezing them. */}
            <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
              <p className="text-sm font-semibold">
                {tr("Hozir:")} <span className="text-accent">{tr(STAGES[stageIndex].purpose)}</span> {tr("yozyapsiz")}
              </p>
              {dishes.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {dishes.map((d) => (
                    <span key={d} className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent">
                      {d}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {event ? tr("Menyuda bu bo'limga taom kiritilmagan.") : tr("To'yni tanlasangiz, taomlar shu yerda ko'rinadi.")}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => (nextStage ? goToStage(nextStage.id) : setReviewing(true))}
              disabled={!nextStage && lines.length === 0}
            >
              {nextStage ? tr(`Keyingisi: ${tr(nextStage.label)}`) : tr("Savatni ko'rish")} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

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

        {browsing ? (
          // Category covers first: the chef steps into one to pick from it.
          <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3">
            {sections.map((category, index) => {
              const count = catalog.filter((p) => (p.productCategory ?? "OTHER") === category).length;
              const picked = lines.filter((l) => (l.category ?? "OTHER") === category).length;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSection(category)}
                  style={{ animationDelay: `${index * 40}ms`, animationFillMode: "backwards" }}
                  className={cn(
                    "group relative aspect-[4/3] overflow-hidden rounded-2xl border text-left shadow-sm outline-none transition duration-300 animate-fade-up",
                    "hover:-translate-y-1 hover:border-accent/60 hover:shadow-xl hover:shadow-primary/20 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]",
                    picked > 0 ? "border-accent ring-1 ring-accent" : "border-border",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={categoryCover(category)}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 transition duration-300 group-hover:from-black/90 group-hover:via-black/45" />
                  {/* Light sweep across the photo on hover. */}
                  <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-100" />
                  <span className="absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition duration-300 group-hover:scale-110 group-hover:bg-gold group-hover:text-ink">
                    <ProductCategoryIcon category={category} className="h-4 w-4" />
                  </span>
                  {picked > 0 && (
                    <span className="bg-gold-foil absolute right-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center gap-0.5 rounded-full px-1.5 text-[11px] font-semibold tabular-nums text-ink shadow-sm">
                      <Check className="h-3 w-3" /> {picked}
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm font-semibold leading-tight text-white drop-shadow sm:text-base">
                        {tr(PRODUCT_CATEGORY_LABELS_UZ[category])}
                      </span>
                      <span className="block text-[11px] text-white/75">{tr(`${count} ta mahsulot`)}</span>
                    </span>
                    <span className="flex h-7 w-7 shrink-0 translate-x-2 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 pointer-coarse:translate-x-0 pointer-coarse:opacity-100">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : products.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            {tr(`"${query}" topilmadi — pastdan qo'lda qo'shing.`)}
          </p>
        ) : (
          <div className="space-y-3">
            {section !== "ALL" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSection("ALL")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium transition hover:border-accent/60 hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" /> {tr("Bo'limlar")}
                </button>
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                  <ProductCategoryIcon category={section} className="h-4 w-4 shrink-0 text-accent" />
                  <span className="truncate">{tr(PRODUCT_CATEGORY_LABELS_UZ[section])}</span>
                </span>
              </div>
            )}
            <div key={section} className="grid grid-cols-2 gap-2.5 min-[480px]:grid-cols-3">
              {products.map((p, index) => {
                const qty = partOf(p.name);
                const on = qty > 0;
                const total = cart.get(key(p.name))?.quantity ?? 0;
                return (
                  <div
                    key={p.id}
                    style={{ animationDelay: `${Math.min(index, 12) * 30}ms`, animationFillMode: "backwards" }}
                    className={cn(
                      "group overflow-hidden rounded-2xl border bg-card transition duration-300 animate-fade-up hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/15",
                      on ? "border-accent ring-1 ring-accent" : "border-border hover:border-accent/60",
                    )}
                  >
                    {/* Name and unit sit on the photo. Products without their
                        own photo borrow their category's cover, so every tile
                        looks the same. */}
                    <button
                      type="button"
                      onClick={() => !on && step(p, 1)}
                      className="relative block aspect-[4/3] w-full overflow-hidden bg-muted text-left"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.photoUrl ?? categoryCover(p.productCategory ?? "OTHER")}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                      {on && (
                        <span className="bg-gold-foil absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-ink shadow-sm">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {/* Already in the basket for another dish. */}
                      {total > qty && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                          {tr("jami")} {fmt(total)} {tr(UNIT_LABELS_UZ[p.unit])}
                        </span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1.5 p-2">
                        <span className="min-w-0 truncate text-sm font-semibold text-white drop-shadow">{p.name}</span>
                        <span className="shrink-0 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
                          {tr(UNIT_LABELS_UZ[p.unit])}
                        </span>
                      </span>
                    </button>
                    <div className="flex items-center gap-1 p-2">
                      <button
                        type="button"
                        onClick={() => step(p, -1)}
                        disabled={!on}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border transition active:scale-95 disabled:opacity-30"
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
                        className="h-10 w-full min-w-0 rounded-lg border border-input bg-transparent text-center text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-primary/30"
                        aria-label={`${p.name} miqdori`}
                      />
                      <button
                        type="button"
                        onClick={() => step(p, 1)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition active:scale-95"
                        aria-label={tr("Ko'paytirish")}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-dashed border-border p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{tr("Katalogda yo'q mahsulot")}</p>
          <div className="grid grid-cols-2 gap-1.5 min-[480px]:grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_2.5rem]">
            <Input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder={tr("nomi")} className="col-span-2 h-10 min-w-0 min-[480px]:col-span-1" />
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
                    <button type="button" onClick={() => removeLine(l.name)} aria-label={tr("O'chirish")}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Floating cart bar ---------- */}
      {/* Fixed to the viewport (not `sticky`, which only re-engages once its own
          in-flow position nears the bottom of a very long product grid) so it
          stays reachable at a constant spot no matter how far the list scrolls,
          on every screen size. `pb-40 sm:pb-24` above keeps the last grid row
          and the custom-item box from ever sitting underneath it. */}
      <div className="fixed inset-x-0 bottom-[84px] z-20 px-4 sm:bottom-4">
        <div
          className={cn(
            "mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl border p-3 shadow-xl backdrop-blur-md transition",
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
            {tr("Savat")} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ---------- Review ---------- */}
      <Modal
        open={reviewing}
        onClose={() => setReviewing(false)}
        title={tr("Ro'yxat tayyormi?")}
        description={
          event
            ? `${event.clientName} — ${formatDate(event.eventDate, locale)} · ${tr(`savatda ${lines.length} ta mahsulot`)}`
            : tr(`Savatda ${lines.length} ta mahsulot`)
        }
        footer={
          // The whole basket goes out as one list: send it, or go back to the
          // categories and keep adding to the same basket.
          <div className="grid w-full grid-cols-2 gap-2">
            <Button type="button" onClick={submit} disabled={busy || lines.length === 0}>
              <Send className="h-4 w-4" /> {busy ? tr("Yuborilmoqda...") : tr("Super adminga yuborish")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReviewing(false);
                setSection("ALL");
                setQuery("");
              }}
              disabled={busy}
            >
              <ShoppingBasket className="h-4 w-4" /> {tr("Yana bozorlik")}
            </Button>
          </div>
        }
      >
        {event && (
          <p className="mb-3 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" /> {event.guestCount} {tr("mehmon ·")} {event.menu.name}
          </p>
        )}
        {event && (
          <p className="mb-3 rounded-xl bg-accent/10 px-3 py-2 text-sm">
            <span className="text-accent">{tr("1-ovqat:")}</span> <b>{event.firstDish ?? tr("belgilanmagan")}</b>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-accent">{tr("2-ovqat:")}</span> <b>{event.secondDish ?? tr("belgilanmagan")}</b>
          </p>
        )}
        {events.length > 0 && !eventId && <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{tr("Yuqorida to'yni tanlang.")}</p>}
        <p className="mb-1 text-xs text-muted-foreground">
          {tr("Super adminga har bir mahsulotning faqat jami miqdori boradi.")}
        </p>
        <ul className="divide-y divide-border">
          {lines.map((l) => (
            <li key={l.name} className="py-2.5">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.name}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {fmt(l.quantity)} <span className="text-xs font-normal text-muted-foreground">{tr(UNIT_LABELS_UZ[l.unit])}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(l.name)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={tr("O'chirish")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {/* What the total is made of — the chef's own working, not sent. */}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {PART_ORDER.filter((part) => (l.parts[part] ?? 0) > 0).map((part) => (
                  <label key={part} className="flex items-center gap-1.5 rounded-lg bg-muted/60 py-1 pl-2 pr-1 text-xs text-muted-foreground">
                    {tr(PART_LABELS[part])}
                    <input
                      defaultValue={fmt(l.parts[part] ?? 0)}
                      key={l.parts[part]}
                      onBlur={(e) => {
                        const n = Number(e.target.value.replace(",", "."));
                        if (Number.isFinite(n)) setQty(l, n, part);
                      }}
                      inputMode="decimal"
                      className="h-7 w-14 rounded-md border border-input bg-background text-center text-xs font-semibold tabular-nums text-foreground"
                      aria-label={`${l.name}: ${PART_LABELS[part]} miqdori`}
                    />
                  </label>
                ))}
              </div>
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
