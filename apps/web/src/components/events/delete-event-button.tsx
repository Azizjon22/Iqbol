"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteEventAction } from "@/lib/actions/events.actions";

export function DeleteEventButton({ eventId, clientName }: { eventId: string; clientName: string }) {
  const tr = useTr();

  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      tr(`${clientName} uchun to'y buyurtmasini butunlay o'chirmoqchimisiz? Barcha to'lovlar va bozorlik ro'yxatlari ham o'chadi. Bu amalni qaytarib bo'lmaydi.`),
    );
    if (!confirmed) return;
    startTransition(() => deleteEventAction(eventId));
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      <Trash2 className="h-4 w-4" />  {tr("O'chirish")}
    </Button>
  );
}
