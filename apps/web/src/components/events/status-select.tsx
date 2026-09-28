"use client";

import { useTransition } from "react";
import { EVENT_STATUSES } from "@iqbol/shared";
import { Select } from "@/components/ui/input";
import { updateEventStatusAction } from "@/lib/actions/events.actions";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Kutilmoqda",
  CONFIRMED: "Tasdiqlangan",
  COMPLETED: "Yakunlangan",
  CANCELLED: "Bekor qilingan",
};

export function StatusSelect({ eventId, status }: { eventId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={status}
      disabled={isPending}
      className="w-auto"
      onChange={(e) => {
        const value = e.target.value;
        startTransition(() => {
          updateEventStatusAction(eventId, value);
        });
      }}
    >
      {EVENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </Select>
  );
}
