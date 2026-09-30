"use client";
import { useLocale, useTr } from "@/components/i18n/locale-provider";


import { useState } from "react";
import { CheckCheck, ClipboardList, SearchCheck, ShoppingCart, Wallet } from "lucide-react";
import type { ProductCatalogItem, ShoppingList } from "@/lib/types";
import { SHOPPING_LIST_STATUS_UZ } from "@/lib/shopping-list-status";
import { formatDate, formatDateTime, formatSom, cn } from "@/lib/utils";
import { listProgress, stageOf, type Stage } from "./helpers";
import { ListDetail } from "./list-detail";

const STAGES: { key: Stage; label: string; hint: string; icon: React.ReactNode }[] = [
  { key: "review", label: "Tekshirish kerak", hint: "oshpazdan kelgan", icon: <SearchCheck className="h-5 w-5" /> },
  { key: "buying", label: "Xarid qilinmoqda", hint: "bozorga yuborilgan", icon: <ShoppingCart className="h-5 w-5" /> },
  { key: "done", label: "Yakunlangan", hint: "hammasi olingan", icon: <CheckCheck className="h-5 w-5" /> },
];

function ListCard({ list, selected, onSelect }: { list: ShoppingList; selected: boolean; onSelect: () => void }) {
  const tr = useTr();
  const locale = useLocale().locale;

  const { total, bought, spent } = listProgress(list);
  const status = SHOPPING_LIST_STATUS_UZ[list.status];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border p-3.5 text-left transition",
        selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{list.event?.clientName ?? tr("To'ysiz ro'yxat")}</p>
          <p className="truncate text-xs text-muted-foreground">
            {list.event ? tr(`To'y: ${formatDate(list.event.eventDate, locale)} · `) : ""}
            {list.createdByWorker.fullName}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
            list.status === "SUBMITTED" ? "bg-primary text-primary-foreground" : status?.variant === "success" ? "bg-success/15 text-success" : status?.variant === "accent" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground",
          )}
        >
          {tr(status?.label ?? list.status)}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-success" style={{ width: `${total ? (bought / total) * 100 : 0}%` }} />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {bought}/{total}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDateTime(list.createdAt, locale)}</span>
        {spent > 0 && <span className="font-semibold text-foreground tabular-nums">{formatSom(spent, locale)}</span>}
      </div>
    </button>
  );
}

export function CenterPage({ lists, catalog, isSuperAdmin }: { lists: ShoppingList[]; catalog: ProductCatalogItem[]; isSuperAdmin: boolean }) {
  const tr = useTr();
  const locale = useLocale().locale;

  const stages = isSuperAdmin ? STAGES : STAGES.filter((s) => s.key !== "review");
  const byStage = (s: Stage) => lists.filter((l) => stageOf(l.status) === s);
  const firstBusy = stages.find((s) => byStage(s.key).length > 0 && s.key !== "done")?.key ?? stages[0].key;

  const [stage, setStage] = useState<Stage>(firstBusy);
  const [selectedId, setSelectedId] = useState<string | null>(() => byStage(firstBusy)[0]?.id ?? null);
  const [mobileDetail, setMobileDetail] = useState(false);

  const visible = byStage(stage);
  const selected = lists.find((l) => l.id === selectedId && stageOf(l.status) === stage) ?? visible[0];

  const now = new Date();
  const monthSpent = lists
    .filter((l) => {
      const d = new Date(l.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((s, l) => s + listProgress(l).spent, 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{tr("Bozorlik ro'yxatlari")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSuperAdmin
            ? tr("Oshpaz yozgan ro'yxatni tekshiring, adminga yuboring va xaridni kuzating.")
            : tr("Super admin yuborgan ro'yxatlar bo'yicha bozorlik qiling — har bir mahsulot uchun to'langan summani kiriting.")}
        </p>
      </div>

      {/* ---------- Pipeline ---------- */}
      <div className={cn("grid gap-3", isSuperAdmin ? "grid-cols-3 lg:grid-cols-4" : "grid-cols-2")}>
        {stages.map((s) => {
          const count = byStage(s.key).length;
          const active = stage === s.key;
          const urgent = s.key !== "done" && count > 0;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setStage(s.key);
                setSelectedId(byStage(s.key)[0]?.id ?? null);
                setMobileDetail(false);
              }}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition",
                active ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-card hover:border-primary/30",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{tr(s.label)}</p>
                <p className={cn("font-display mt-0.5 text-3xl font-semibold leading-none lining-nums tabular-nums", urgent && !active && "text-primary")}>
                  {count}
                </p>
                <p className="mt-1 hidden truncate text-[11px] text-muted-foreground sm:block">{tr(s.hint)}</p>
              </div>
              <span className={cn("hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {s.icon}
              </span>
            </button>
          );
        })}
        {isSuperAdmin && (
          <div className="col-span-3 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 lg:col-span-1">
            <div>
              <p className="text-xs text-muted-foreground">{tr("Shu oy bozorlik")}</p>
              <p className="font-display mt-0.5 text-2xl font-semibold leading-none lining-nums tabular-nums">{formatSom(monthSpent, locale)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{tr("sotib olingan mahsulotlar")}</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Wallet className="h-5 w-5" />
            </span>
          </div>
        )}
      </div>

      {/* ---------- Master / detail ---------- */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">
            {stage === "review" ? tr("Tekshirishni kutayotgan ro'yxat yo'q.") : stage === "buying" ? tr("Hozir xarid qilinadigan ro'yxat yo'q.") : tr("Yakunlangan ro'yxatlar hali yo'q.")}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className={cn("min-w-0 space-y-2.5 lg:sticky lg:top-20 lg:self-start", mobileDetail && "hidden lg:block")}>
            {visible.map((l) => (
              <ListCard
                key={l.id}
                list={l}
                selected={selected?.id === l.id}
                onSelect={() => {
                  setSelectedId(l.id);
                  setMobileDetail(true);
                }}
              />
            ))}
          </div>
          {selected && (
            <div className={cn("min-w-0", !mobileDetail && "hidden lg:block")}>
              <ListDetail key={selected.id} list={selected} catalog={catalog} isSuperAdmin={isSuperAdmin} onBack={() => setMobileDetail(false)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
