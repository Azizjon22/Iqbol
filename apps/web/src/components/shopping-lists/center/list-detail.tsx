"use client";
import { useLocale, useTr } from "@/components/i18n/locale-provider";
import { usePick } from "@/components/i18n/use-pick";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarHeart, Check, ChefHat, Lock, ShoppingCart } from "lucide-react";
import { PRODUCT_CATEGORY_LABELS_UZ } from "@iqbol/shared";
import type { ProductCatalogItem, ShoppingList } from "@/lib/types";
import { ShoppingListPdfButton } from "@/components/shopping-lists/shopping-list-pdf-button";
import { ProductCategoryIcon } from "@/components/inventory/product-category-icon";
import { formatDate, formatDateTime, formatSom, cn } from "@/lib/utils";
import { catalogIndex, groupBySection, itemCost, listApi, listProgress } from "./helpers";
import { PurchaseRow } from "./purchase-row";

const STEPS = [
  { key: "SUBMITTED", label: "Yozildi" },
  { key: "APPROVED", label: "Tasdiqlandi, xaridda" },
  { key: "PURCHASED", label: "Xarid qilindi" },
] as const;

function stepIndex(status: ShoppingList["status"]) {
  if (status === "SUBMITTED" || status === "REVIEWED") return 0;
  if (status === "APPROVED") return 1;
  return 2;
}

/**
 * One list. The chef who wrote it confirms it, then marks each item bought
 * with what it cost; the super admin only watches and can fix a price.
 */
export function ListDetail({
  list,
  catalog,
  viewer,
  onBack,
}: {
  list: ShoppingList;
  catalog: ProductCatalogItem[];
  viewer: "SUPER_ADMIN" | "CHEF";
  onBack?: () => void;
}) {
  const tr = useTr();
  const pick = usePick();
  const locale = useLocale().locale;

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const lookup = catalogIndex(catalog);
  const { total, bought, spent, complete } = listProgress(list);
  const current = stepIndex(list.status);
  const draft = current === 0;
  const chef = viewer === "CHEF";
  const canBuy = chef && list.status === "APPROVED";
  const canFixPrice = !chef && (list.status === "APPROVED" || list.status === "PURCHASED");
  const groups = groupBySection(list.items, lookup);
  const stepTime: Partial<Record<(typeof STEPS)[number]["key"], string | null>> = {
    SUBMITTED: list.createdAt,
    APPROVED: list.approvedAt,
  };

  async function cancel() {
    if (!window.confirm(tr("Bu ro'yxat o'chiriladi. Kerak bo'lsa yangisini yozishingiz mumkin."))) return;
    setBusy(true);
    setError(undefined);
    try {
      await listApi(`/${list.id}`, "DELETE");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(undefined);
    try {
      await listApi(`/${list.id}/confirm`, "POST");
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
                <span className="font-display truncate text-2xl font-semibold group-hover:underline">{pick(list.event.clientName, list.event.clientNameRu)}</span>
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
        <ol className="mt-5 grid grid-cols-3 gap-1">
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
              {draft ? tr("Tasdiqlanmagan") : list.status === "APPROVED" ? (complete ? tr("Hammasi olindi") : tr(`${total - bought} ta qoldi`)) : tr("Xarid qilindi")}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 space-y-3">
          {draft && chef && (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
              <p className="text-sm font-semibold">{tr("Ro'yxatni tekshiring")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {tr("Hammasi to'g'ri bo'lsa, tasdiqlang va bozorga chiqing. Tasdiqlangach ro'yxat o'zgarmaydi.")}
              </p>
              <button
                type="button"
                onClick={confirm}
                disabled={busy || total === 0}
                className="mt-2.5 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-95 disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" /> {tr("Tasdiqlash va xaridga chiqish")}
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                className="ml-2 mt-2.5 inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {tr("Bekor qilish")}
              </button>
            </div>
          )}
          {draft && !chef && <p className="text-sm text-muted-foreground">{tr("Oshpaz hali tasdiqlamagan.")}</p>}
          {canBuy && !complete && (
            <p className="text-sm text-muted-foreground">{tr("Har bir mahsulotni olganingizda «Olindi» ni bosib, to'lagan summangizni yozing.")}</p>
          )}
          {(list.status === "PURCHASED" || list.status === "CLOSED") && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />{" "}
              {list.event ? tr("Xarid yakunlandi — summa to'yning xarajatlariga o'zi yozildi.") : tr("Xarid yakunlandi.")}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>

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
