"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, PlusCircle } from "lucide-react";
import type { ProductCatalogItem, ShoppingList } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ListBuilder } from "./list-builder";
import { ChefListCard } from "./chef-list-card";
import type { ChefEvent } from "./types";

export function ChefShopping({
  catalog,
  events,
  lists,
  initialTab,
  initialEventId,
  justSent,
}: {
  catalog: ProductCatalogItem[];
  events: ChefEvent[];
  lists: ShoppingList[];
  initialTab: "new" | "mine";
  initialEventId?: string;
  justSent?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [showSent, setShowSent] = useState(!!justSent);

  function switchTo(next: "new" | "mine") {
    setTab(next);
    setShowSent(false);
    router.replace(next === "mine" ? "/worker/shopping?tab=mine" : "/worker/shopping", { scroll: false });
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Bozorlik</h1>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
        {(
          [
            ["new", "Yangi ro'yxat", <PlusCircle key="n" className="h-4 w-4" />],
            ["mine", `Ro'yxatlarim (${lists.length})`, <ClipboardList key="m" className="h-4 w-4" />],
          ] as const
        ).map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTo(key)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition",
              tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === "new" ? (
        <ListBuilder catalog={catalog} events={events} previous={lists} initialEventId={initialEventId} />
      ) : (
        <div className="space-y-3">
          {showSent && (
            <div className="flex items-center gap-3 rounded-2xl border border-success/40 bg-success/10 p-4 animate-soft-scale">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
              <div>
                <p className="font-semibold">Ro&apos;yxat yuborildi</p>
                <p className="text-sm text-muted-foreground">Super admin tekshirib, xaridga yuboradi. Holatini shu yerda kuzatasiz.</p>
              </div>
            </div>
          )}
          {lists.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-12 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">Hali ro&apos;yxat yozmagansiz.</p>
            </div>
          ) : (
            lists.map((l) => <ChefListCard key={l.id} list={l} />)
          )}
        </div>
      )}
    </div>
  );
}
