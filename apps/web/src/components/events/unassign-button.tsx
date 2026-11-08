"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { unassignWorkerAction } from "@/lib/actions/events.actions";
import { useT } from "@/components/i18n/locale-provider";

export function UnassignButton({ eventId, workerId }: { eventId: string; workerId: string }) {
  const t = useT();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => unassignWorkerAction(eventId, workerId))}
      className="ml-1 rounded-full p-0.5 hover:bg-black/10 disabled:opacity-50 pointer-coarse:-my-1.5 pointer-coarse:-mr-1.5 pointer-coarse:p-2"
      aria-label={t("events.unassignAria")}
    >
      <X className="h-3 w-3" />
    </button>
  );
}
