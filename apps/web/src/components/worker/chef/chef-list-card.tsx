"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, PencilLine, X } from "lucide-react";
import type { ShoppingList } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ItemQuantity } from "@/components/shopping-lists/item-quantity";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import { LIST_STEPS, listStepIndex } from "./types";

const PREVIEW = 6;

/** One of the chef's own lists: where it is in the pipeline, what changed, what's bought. No prices. */
export function ChefListCard({ list, compact }: { list: ShoppingList; compact?: boolean }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const step = listStepIndex(list.status);
  const bought = list.items.filter((i) => i.isPurchased).length;
  const changed = list.items.filter((i) => i.originalQuantity !== null).length;
  const cancellable = (list.status === "SUBMITTED" || list.status === "REVIEWED") && bought === 0;
  const shown = expanded || compact ? list.items : list.items.slice(0, PREVIEW);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{list.event?.clientName ?? "To'ysiz ro'yxat"}</p>
            <p className="text-xs text-muted-foreground">
              {list.event ? `To'y: ${formatDate(list.event.eventDate)} · ` : ""}
              {formatDateTime(list.createdAt)}
            </p>
          </div>
        </div>

        <ol className="mt-4 grid grid-cols-4 gap-1">
          {LIST_STEPS.map((s, i) => (
            <li key={s.key}>
              <div className={cn("h-1.5 rounded-full", i <= step ? (i === step ? "bg-primary" : "bg-primary/45") : "bg-muted")} />
              <p className={cn("mt-1 text-[10px] font-medium leading-tight sm:text-[11px]", i <= step ? "text-foreground" : "text-muted-foreground")}>{s.label}</p>
            </li>
          ))}
        </ol>

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {step >= 2 && (
            <span className="rounded-full bg-success/10 px-2.5 py-1 font-medium text-success tabular-nums">
              {bought}/{list.items.length} olindi
            </span>
          )}
          {changed > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 font-medium text-accent">
              <PencilLine className="h-3 w-3" /> Super admin {changed} ta o&apos;zgartirdi
            </span>
          )}
          {step < 2 && <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">Super admin tekshirmoqda</span>}
        </div>
      </div>

      {!compact && (
        <>
          <ul className="divide-y divide-border border-t border-border">
            {shown.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span className={cn("flex min-w-0 items-center gap-2", item.isPurchased && "text-muted-foreground")}>
                  {item.isPurchased ? (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
                  )}
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  <ItemQuantity item={item} />
                </span>
              </li>
            ))}
          </ul>
          {list.items.length > PREVIEW && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-center gap-1 border-t border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              {expanded ? "Yig'ish" : `Yana ${list.items.length - PREVIEW} ta`}
              <ChevronDown className={cn("h-3.5 w-3.5 transition", expanded && "rotate-180")} />
            </button>
          )}
          {cancellable && (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" /> Ro&apos;yxatni bekor qilish
            </button>
          )}
        </>
      )}

      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(false)}
          title="Ro'yxatni bekor qilish"
          message="Bu ro'yxat o'chiriladi. Kerak bo'lsa yangisini yozishingiz mumkin."
          confirmLabel="Bekor qilish"
          onConfirm={async () => {
            const res = await fetch(`/api/proxy/shopping-lists/${list.id}`, { method: "DELETE" });
            if (!res.ok) {
              const data = await res.json().catch(() => null);
              throw new Error(data?.message ?? "Bekor qilib bo'lmadi");
            }
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
