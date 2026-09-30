"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { CreateWorkerForm } from "@/components/workers/create-worker-form";
import { useT } from "@/components/i18n/locale-provider";
import { Portal } from "@/components/ui/portal";

export function CreateWorkerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-worker-title"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 id="create-worker-title" className="font-display text-xl font-semibold tracking-tight">
              {t("workers.createTitle")}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[calc(92vh-4.5rem)] overflow-y-auto p-5">
            <CreateWorkerForm onSuccess={onClose} />
          </div>
        </div>
      </div>
    </Portal>
  );
}
