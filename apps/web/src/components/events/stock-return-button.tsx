"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/** Super admin puts back what a chef took from the store for this wedding. */
export function StockReturnButton({ usageId }: { usageId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function giveBack() {
    const res = await fetch(`/api/proxy/inventory/usages/${usageId}`, { method: "DELETE" });
    setOpen(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      window.alert((Array.isArray(data?.message) ? data.message[0] : data?.message) ?? "Qaytarib bo'lmadi");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
      >
        <Undo2 className="h-3.5 w-3.5" /> Omborga qaytarish
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Omborga qaytarilsinmi?"
        message="Bu yozuvdagi hamma mahsulot omborga o'z narxida qaytariladi va to'ydan olib tashlanadi."
        confirmLabel="Qaytarish"
        onConfirm={giveBack}
      />
    </>
  );
}
