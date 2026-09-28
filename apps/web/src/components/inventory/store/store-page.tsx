"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ClipboardCheck,
  History,
  Minus,
  Package,
  PackageX,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS_UZ,
  type ProductCategory,
  type StaffRole,
} from "@iqbol/shared";
import type { InventoryItem, InventoryTxn, UpcomingEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProductCategoryIcon } from "@/components/inventory/product-category-icon";
import { cn } from "@/lib/utils";
import { inventoryApi, qty, stockLevel, stockRatio } from "./helpers";
import { StockModal, type StockMode } from "./stock-modal";
import { ItemModal } from "./item-modal";
import { HistoryModal, TxnRow } from "./history-modal";

type Tab = "PRODUCT" | "DISHWARE";
type Dialog =
  | { kind: "stock"; item: InventoryItem; mode: StockMode }
  | { kind: "item"; item?: InventoryItem }
  | { kind: "history"; item: InventoryItem }
  | { kind: "delete"; item: InventoryItem }
  | null;

function ItemThumb({ item }: { item: InventoryItem }) {
  if (item.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.photoUrl}
        alt={item.name}
        className="h-11 w-11 shrink-0 rounded-xl object-cover"
      />
    );
  }
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      {item.category === "DISHWARE" ? (
        <UtensilsCrossed className="h-5 w-5" />
      ) : (
        <ProductCategoryIcon
          category={item.productCategory ?? "OTHER"}
          className="h-5 w-5"
        />
      )}
    </span>
  );
}

export function StorePage({
  items,
  recent,
  events,
  role,
}: {
  items: InventoryItem[];
  recent: InventoryTxn[];
  events: UpcomingEvent[];
  role: StaffRole;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [tab, setTab] = useState<Tab>("PRODUCT");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<ProductCategory | "ALL">("ALL");
  const [onlyLow, setOnlyLow] = useState(false);
  const [sort, setSort] = useState<"name" | "stock">("name");

  const products = items.filter((i) => i.category === "PRODUCT");
  const dishware = items.filter((i) => i.category === "DISHWARE");
  const attention = items.filter((i) => stockLevel(i) !== "ok");
  const outCount = items.filter((i) => stockLevel(i) === "out").length;
  const lowCount = attention.length - outCount;
  const dishwarePieces = dishware.reduce((s, i) => s + Number(i.quantity), 0);

  const q = query.trim().toLowerCase();
  const pool = tab === "PRODUCT" ? products : dishware;
  const filteredPool = pool.filter((i) => {
    if (q && !i.name.toLowerCase().includes(q)) return false;
    if (onlyLow && stockLevel(i) === "ok") return false;
    if (
      tab === "PRODUCT" &&
      section !== "ALL" &&
      (i.productCategory ?? "OTHER") !== section
    )
      return false;
    return true;
  });
  const visible =
    sort === "stock"
      ? [...filteredPool].sort((a, b) => stockRatio(a) - stockRatio(b))
      : filteredPool;

  // Products are grouped by section unless sorted by stock, where a flat list reads better.
  const groups =
    tab === "PRODUCT" && sort === "name"
      ? PRODUCT_CATEGORIES.map((c) => ({
          key: c as string,
          items: visible.filter((i) => (i.productCategory ?? "OTHER") === c),
        })).filter((g) => g.items.length > 0)
      : [{ key: "all", items: visible }];

  const sectionCounts = PRODUCT_CATEGORIES.map((c) => ({
    c,
    n: products.filter((i) => (i.productCategory ?? "OTHER") === c).length,
  })).filter((x) => x.n > 0);

  const stats = [
    {
      label: "Mahsulot turlari",
      value: products.length,
      hint: `${sectionCounts.length} bo'limda`,
      icon: <Package className="h-5 w-5" />,
    },
    {
      label: "Idish-tovoq",
      value: dishware.length,
      hint: `jami ${dishwarePieces.toLocaleString("ru-RU")} dona`,
      icon: <UtensilsCrossed className="h-5 w-5" />,
    },
    {
      label: "Kam qolgan",
      value: lowCount,
      hint: "minimaldan past",
      icon: <AlertTriangle className="h-5 w-5" />,
      tone: lowCount > 0 ? "warn" : undefined,
    },
    {
      label: "Tugagan",
      value: outCount,
      hint: "qoldiq 0",
      icon: <PackageX className="h-5 w-5" />,
      tone: outCount > 0 ? "danger" : undefined,
    },
  ];

  const chip = (on: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
      on
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Ombor
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mahsulotlar va idish-tovoqlar qoldig&apos;i, kirim-chiqim va
            inventarizatsiya.
          </p>
        </div>
        <Button type="button" onClick={() => setDialog({ kind: "item" })}>
          <Plus className="h-4 w-4" /> Yangi qo&apos;shish
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => {
              if (s.tone) {
                setOnlyLow(true);
                setSort("stock");
              }
            }}
            className={cn(
              "flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left transition",
              s.tone === "warn" &&
                "border-accent/40 bg-accent/5 hover:bg-accent/10",
              s.tone === "danger" &&
                "border-destructive/40 bg-destructive/5 hover:bg-destructive/10",
              !s.tone && "cursor-default border-border",
            )}
          >
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p
                className={cn(
                  "font-display mt-0.5 text-3xl font-semibold leading-none lining-nums tabular-nums",
                  s.tone === "warn" && "text-accent",
                  s.tone === "danger" && "text-destructive",
                )}
              >
                {s.value}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.hint}</p>
            </div>
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                s.tone === "warn"
                  ? "bg-accent/15 text-accent"
                  : s.tone === "danger"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {s.icon}
            </span>
          </button>
        ))}
      </div>

      {attention.length > 0 && (
        <section className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 via-card to-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold">To&apos;ldirish kerak</h2>
            <span className="rounded-full bg-accent px-2 text-xs font-semibold text-accent-foreground tabular-nums">
              {attention.length}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {attention.map((i) => (
              <div
                key={i.id}
                className="flex min-w-60 items-center gap-3 rounded-xl border border-border bg-card p-2.5"
              >
                <ItemThumb item={i} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.name}</p>
                  <p
                    className={cn(
                      "text-xs tabular-nums",
                      stockLevel(i) === "out"
                        ? "text-destructive"
                        : "text-accent",
                    )}
                  >
                    {qty(i.quantity, i.unit)}
                    {i.minThreshold != null && (
                      <span className="text-muted-foreground">
                        {" "}
                        / min {qty(i.minThreshold, i.unit)}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDialog({ kind: "stock", item: i, mode: "IN" })
                  }
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-success/15 px-2.5 text-xs font-semibold text-success transition hover:bg-success hover:text-success-foreground"
                >
                  <Plus className="h-3.5 w-3.5" /> Kirim
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {/* ---------- Toolbar ---------- */}
          <div className="space-y-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-muted p-1">
                {(
                  [
                    ["PRODUCT", `Mahsulotlar (${products.length})`],
                    ["DISHWARE", `Idish-tovoq (${dishware.length})`],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setTab(key);
                      setSection("ALL");
                    }}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                      tab === key
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative min-w-0 flex-1 basis-48">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Qidirish..."
                  className="pl-9 pr-9"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Tozalash"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as "name" | "stock")}
                className="w-auto"
              >
                <option value="name">Bo&apos;lim / nom bo&apos;yicha</option>
                <option value="stock">Qoldiq kamidan</option>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {tab === "PRODUCT" && (
                <>
                  <button
                    type="button"
                    onClick={() => setSection("ALL")}
                    className={chip(section === "ALL")}
                  >
                    Barchasi
                  </button>
                  {sectionCounts.map(({ c, n }) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSection(c)}
                      className={chip(section === c)}
                    >
                      <ProductCategoryIcon
                        category={c}
                        className="h-3.5 w-3.5"
                      />{" "}
                      {PRODUCT_CATEGORY_LABELS_UZ[c]} {n}
                    </button>
                  ))}
                  <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
                </>
              )}
              <button
                type="button"
                onClick={() => setOnlyLow((v) => !v)}
                className={chip(onlyLow)}
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Faqat kam qolganlar
              </button>
            </div>
          </div>

          {/* ---------- List ---------- */}
          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-14 text-center">
              <Package className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">
                {pool.length === 0
                  ? "Hali hech narsa qo'shilmagan."
                  : "Filtrga mos mahsulot topilmadi."}
              </p>
            </div>
          ) : (
            groups.map((g) => (
              <section
                key={g.key}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                {g.key !== "all" && (
                  <header className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm font-semibold">
                    <ProductCategoryIcon
                      category={g.key as ProductCategory}
                      className="h-4 w-4 text-muted-foreground"
                    />
                    {PRODUCT_CATEGORY_LABELS_UZ[g.key as ProductCategory]}
                    <span className="rounded-full bg-muted px-2 text-xs font-normal text-muted-foreground tabular-nums">
                      {g.items.length}
                    </span>
                  </header>
                )}
                <ul className="divide-y divide-border">
                  {g.items.map((item) => {
                    const level = stockLevel(item);
                    const ratio = stockRatio(item);
                    return (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 px-3 py-2.5 sm:px-4"
                      >
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: "history", item })}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          title="Tarixni ko'rish"
                        >
                          <ItemThumb item={item} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">
                                {item.name}
                              </span>
                              {level === "out" && (
                                <span className="hidden shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive sm:inline">
                                  Tugagan
                                </span>
                              )}
                              {level === "low" && (
                                <span className="hidden shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent sm:inline">
                                  Kam qoldi
                                </span>
                              )}
                            </span>
                            <span className="mt-1 flex items-center gap-2">
                              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:w-28">
                                <span
                                  className={cn(
                                    "block h-full rounded-full",
                                    level === "out"
                                      ? "bg-destructive"
                                      : level === "low"
                                        ? "bg-accent"
                                        : "bg-success",
                                  )}
                                  style={{
                                    width: `${Math.max(ratio * 100, level === "out" ? 0 : 6)}%`,
                                  }}
                                />
                              </span>
                              {item.minThreshold != null && (
                                <span className="hidden text-[11px] text-muted-foreground sm:inline">
                                  min {qty(item.minThreshold, item.unit)}
                                </span>
                              )}
                            </span>
                          </span>
                        </button>
                        <span
                          className={cn(
                            "shrink-0 text-right text-sm font-semibold tabular-nums",
                            level === "out"
                              ? "text-destructive"
                              : level === "low"
                                ? "text-accent"
                                : "",
                          )}
                        >
                          {qty(item.quantity, item.unit)}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setDialog({ kind: "stock", item, mode: "OUT" })
                            }
                            disabled={level === "out"}
                            aria-label="Chiqim"
                            title="Chiqim"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-destructive transition hover:bg-destructive/10 disabled:opacity-30"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDialog({ kind: "stock", item, mode: "IN" })
                            }
                            aria-label="Kirim"
                            title="Kirim"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-success transition hover:bg-success/10"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <DropdownMenu
                            items={[
                              {
                                label: "Sanash (inventarizatsiya)",
                                icon: <ClipboardCheck className="h-4 w-4" />,
                                onSelect: () =>
                                  setDialog({
                                    kind: "stock",
                                    item,
                                    mode: "COUNT",
                                  }),
                              },
                              {
                                label: "Tarix",
                                icon: <History className="h-4 w-4" />,
                                onSelect: () =>
                                  setDialog({ kind: "history", item }),
                              },
                              {
                                label: "Tahrirlash",
                                icon: <Pencil className="h-4 w-4" />,
                                onSelect: () =>
                                  setDialog({ kind: "item", item }),
                              },
                              {
                                label: "O'chirish",
                                icon: <Trash2 className="h-4 w-4" />,
                                tone: "danger",
                                hidden: role !== "SUPER_ADMIN",
                                onSelect: () =>
                                  setDialog({ kind: "delete", item }),
                              },
                            ]}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        {/* ---------- Recent activity ---------- */}
        <aside className="xl:sticky xl:top-20 xl:self-start">
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4 text-muted-foreground" /> So&apos;nggi
              harakatlar
            </h2>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Hali kirim-chiqim bo&apos;lmagan.
              </p>
            ) : (
              <ul className="mt-1 divide-y divide-border">
                {recent.map((t) => (
                  <TxnRow
                    key={t.id}
                    txn={t}
                    unit={t.item?.unit ?? "DONA"}
                    showItem
                  />
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {dialog?.kind === "stock" && (
        <StockModal
          key={`${dialog.item.id}-${dialog.mode}`}
          item={dialog.item}
          initialMode={dialog.mode}
          events={events}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "item" && (
        <ItemModal
          item={dialog.item}
          defaultCategory={tab}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "history" && (
        <HistoryModal item={dialog.item} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          open
          onClose={() => setDialog(null)}
          title="O'chirish"
          message={`"${dialog.item.name}" ombordan o'chiriladi. Kirim-chiqim tarixi bor mahsulotni o'chirib bo'lmaydi — tarix saqlanishi kerak.`}
          onConfirm={async () => {
            await inventoryApi(`/${dialog.item.id}`, "DELETE");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
