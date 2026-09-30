"use client";

import { FileDown } from "lucide-react";
import type { ShoppingList } from "@/lib/types";
import { downloadShoppingListPdf } from "@/lib/shopping-list-pdf";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

export function ShoppingListPdfButton({ list, className }: { list: ShoppingList; className?: string }) {
  const { locale } = useLocale();
  return (
    <button
      type="button"
      onClick={() => downloadShoppingListPdf(list, locale)}
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <FileDown className="h-3.5 w-3.5" /> PDF
    </button>
  );
}
