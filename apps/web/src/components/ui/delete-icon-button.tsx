"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeleteIconButton({ action, className }: { action: () => Promise<void> | void; className?: string }) {
  const tr = useTr();

  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => action())}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50",
        className,
      )}
      aria-label={tr("O'chirish")}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
