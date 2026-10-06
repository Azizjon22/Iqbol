"use client";
import { useLocale, useTr } from "@/components/i18n/locale-provider";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarHeart, Check, CheckCheck, ChefHat, ClipboardCheck, Lock } from "lucide-react";
import { PRODUCT_CATEGORY_LABELS_UZ } from "@iqbol/shared";
import type { ProductCatalogItem, ShoppingList } from "@/lib/types";
import { ShoppingListEditor } from "@/components/shopping-lists/shopping-list-editor";
import { ShoppingListPdfButton } from "@/components/shopping-lists/shopping-list-pdf-button";
import { ProductCategoryIcon } from "@/components/inventory/product-category-icon";
import { isShoppingListEditable } from "@/lib/shopping-list-status";
import { formatDate, formatDateTime, formatSom, cn } from "@/lib/utils";
import { catalogIndex, groupBySection, itemCost, listApi, listProgress } from "./helpers";
import { PurchaseRow } from "./purchase-row";
import { CloseConfirmModal } from "./close-confirm-modal";

const STEPS = [
  { key: "SUBMITTED", label: "Yozildi" },
  { key: "REVIEWED", label: "Tekshirildi" },
  { key: "APPROVED", label: "Yuborildi" },
  { key: "PURCHASED", label: "Xarid qilindi" },
  { key: "CLOSED", label: "Yopildi" },
] as const;

export function ListDetail({
  list,
  catalog,
  isSuperAdmin,
  onBack,
}: {
  list: ShoppingList;
  catalog: ProductCatalogItem[];
  isSuperAdmin: boolean;
  onBack?: () => void;
}) {
  const tr = useTr();
  const locale = useLocale().locale;

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [confirming, setConfirming] = useState(false);
  const lookup = catalogIndex(catalog);
  const { total, bought, spent, complete } = listProgress(list);
  const current = STEPS.findIndex((s) => s.key === list.status);
  const sent = current >= 2;
  const canBuy = !isSuperAdmin && list.status === "APPROVED";
  const canFixPrice = !isSuperAdmin && (list.status === "APPROVED" || list.status === "PURCHASED");
  const groups = groupBySection(list.items, lookup);
  const stepTime: Partial<Record<(typeof STEPS)[number]["key"], string | null>> = {
    SUBMITTED: list.createdAt,
    REVIEWED: list.reviewedAt,
    APPROVED: list.approvedAt,
  };

  async function setStatus(status: "PURCHASED") {
    setBusy(true);
    setError(undefined);
    try {
      await listApi(`/${list.id}/status`, "PATCH", { status });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* ---------- Header ---------- */}
      <div className="border-b border-border p-4 sm:p-5">
        {onBack && (
          <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:hidden">
            <ArrowLeft className="h-4 w-4" />  {tr("Ro'yxatlar")}
          </button>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {list.event ? (
              <Link href={`/dashboard/events/${list.event.id}`} className="group inline-flex items-center gap-2">
                <CalendarHeart className="h-5 w-5 shrink-0 text-primary" />
                <span className="font-display truncate text-2xl font-semibold group-hover:underline">{list.event.clientName}</span>
              </Link>
            ) : (
              <p className="font-display text-2xl font-semibold">{tr("To'ysiz ro'yxat")}</p>
            )}
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {list.event && <span>{tr("To'y:")} {formatDate(list.event.eventDate, locale)}</span>}
              <span className="inline-flex items-center gap-1">
                <ChefHat className="h-3.5 w-3.5" /> {list.createdByWorker.fullName}
              </span>
            </p>
          </div>
          <ShoppingListPdfButton list={list} />
        </div>

        {/* Stepper */}
        <ol className="mt-5 grid grid-cols-5 gap-1">
          {STEPS.map((step, i) => {
            const done = i <= current;
            const time = stepTime[step.key];
            return (
              <li key={step.key} className="min-w-0">
                <div className={cn("h-1.5 rounded-full", done ? (i === current ? "bg-primary" : "bg-primary/50") : "bg-muted")} />
                <p className={cn("mt-1.5 truncate text-[11px] font-medium", done ? "text-foreground" : "text-muted-foreground")}>{tr(step.label)}</p>
                {done && time && <p className="hidden truncate text-[10px] text-muted-foreground sm:block">{formatDateTime(time, locale)}</p>}
              </li>
            );
          })}
        </ol>

        {/* Progress + money */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-muted/60 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">{tr("Olindi")}</p>
            <p className="font-semibold tabular-nums">
              {bought} / {total}
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${total ? (bought / total) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="rounded-xl bg-muted/60 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">{tr("Sarflandi")}</p>
            <p className="font-semibold tabular-nums">{formatSom(spent, locale)}</p>
          </div>
          <div className="col-span-2 rounded-xl bg-muted/60 px-3 py-2.5 sm:col-span-1">
            <p className="text-xs text-muted-foreground">{tr("Holat")}</p>
            <p className="font-semibold">
              {!sent ? tr("Tekshirilmoqda") : list.status === "APPROVED" ? (complete ? tr("Hammasi olindi") : tr(`${total - bought} ta qoldi`)) : tr(STEPS[current]?.label ?? "")}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 space-y-3">
          {isSuperAdmin && isShoppingListEditable(list.status) && <ShoppingListEditor list={list} />}
          {!sent && !isSuperAdmin && <p className="text-sm text-muted-foreground">{tr("Super admin tekshirib yuborgach xarid qilinadi.")}</p>}
          <div className="flex flex-wrap gap-2">
            {list.status === "APPROVED" && complete && !isSuperAdmin && (
              <button
                type="button"
                onClick={() => setStatus("PURCHASED")}
                disabled={busy}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success px-4 text-sm font-semibold text-success-foreground hover:brightness-95 disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" /> Xaridni yakunlash
              </button>
            )}
          </div>
          {list.status === "PURCHASED" && (
            <div className="rounded-xl border border-accent/50 bg-accent/10 p-3">
              <p className="text-sm font-semibold">{tr("Barcha narxlar kiritildi")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {tr("Adashib ketmaslik uchun har bir narxni tekshirib, tasdiqlang. Xato bo'lsa, avval qalamcha bilan tuzating.")}
              </p>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="mt-2.5 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-95"
              >
                <ClipboardCheck className="h-4 w-4" /> {tr("Tekshirib tasdiqlash")}
              </button>
            </div>
          )}
          {list.status === "CLOSED" && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" /> {tr("Narxlar tasdiqlangan va yopilgan.")}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
      {list.status === "PURCHASED" && (
        <CloseConfirmModal key={confirming ? "open" : "closed"} list={list} open={confirming} onClose={() => setConfirming(false)} />
      )}

      {/* ---------- Items by bazaar section ---------- */}
      {groups.map((g) => {
        const sectionSpent = g.items.reduce((s, i) => s + itemCost(i), 0);
        const sectionDone = g.items.every((i) => i.isPurchased);
        return (
          <section key={g.section}>
            <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="flex items-center gap-2">
                <ProductCategoryIcon category={g.section} className="h-3.5 w-3.5" />
                {tr(PRODUCT_CATEGORY_LABELS_UZ[g.section])}
                {sectionDone && <Check className="h-3.5 w-3.5 text-success" strokeWidth={3} />}
              </span>
              {sectionSpent > 0 && <span className="normal-case tracking-normal tabular-nums">{formatSom(sectionSpent, locale)}</span>}
            </header>
            <ul className="divide-y divide-border border-b border-border last:border-b-0">
              {g.items.map((item) => (
                <PurchaseRow key={item.id} listId={list.id} item={item} catalog={lookup(item.name)} canBuy={canBuy} canFixPrice={canFixPrice} />
              ))}
            </ul>
          </section>
        );
      })}

      {spent > 0 && (
        <div className="flex items-center justify-between bg-muted/40 px-4 py-3">
          <span className="text-sm font-medium">{tr("Jami bozorlik")}</span>
          <span className="font-display text-xl font-semibold lining-nums tabular-nums">{formatSom(spent, locale)}</span>
        </div>
      )}
    </div>
  );
}
