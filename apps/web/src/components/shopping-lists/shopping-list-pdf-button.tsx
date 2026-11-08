"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import type { ShoppingList } from "@/lib/types";
import { deliverPdf } from "@/lib/pdf-delivery";
import { cn } from "@/lib/utils";
import { useTr } from "@/components/i18n/locale-provider";

/** The list as a PDF — saved in a browser, sent to your Telegram chat in the mini app. */
export function ShoppingListPdfButton({ list, className }: { list: Pick<ShoppingList, "id">; className?: string }) {
  const tr = useTr();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const where = await deliverPdf(`/api/reports/pdf?list=${list.id}`, `/api/proxy/shopping-lists/${list.id}/pdf/telegram`);
      if (where === "telegram") setMessage({ ok: true, text: tr("PDF Telegram chatingizga yuborildi") });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? tr(err.message) : tr("Xatolik yuz berdi") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={cn(
          "flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60",
          className,
        )}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} PDF
      </button>
      {message && <span className={cn("max-w-56 text-right text-[11px]", message.ok ? "text-success" : "text-destructive")}>{message.text}</span>}
    </span>
  );
}
