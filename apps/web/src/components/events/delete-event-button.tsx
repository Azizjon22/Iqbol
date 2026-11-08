"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteEventAction } from "@/lib/actions/events.actions";
import { useT } from "@/components/i18n/locale-provider";

export function DeleteEventButton({ eventId, clientName }: { eventId: string; clientName: string }) {
  const t = useT();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(t("events.deleteConfirm", { name: clientName }));
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteEventAction(eventId);
      if (result?.error) window.alert(result.error);
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      <Trash2 className="h-4 w-4" /> {t("common.delete")}
    </Button>
  );
}
