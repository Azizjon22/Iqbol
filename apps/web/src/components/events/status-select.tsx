"use client";

import { useState, useTransition } from "react";
import { EVENT_STATUSES } from "@iqbol/shared";
import { Select } from "@/components/ui/input";
import { updateEventStatusAction } from "@/lib/actions/events.actions";
import { useT } from "@/components/i18n/locale-provider";

export function StatusSelect({ eventId, status }: { eventId: string; status: string }) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(status);

  return (
    <Select
      value={value}
      disabled={isPending}
      className="w-auto"
      onChange={(e) => {
        const next = e.target.value;
        const previous = value;
        setValue(next);
        startTransition(async () => {
          const result = await updateEventStatusAction(eventId, next);
          if (result?.error) {
            // Refused by the server: put the old status back and say why.
            setValue(previous);
            window.alert(result.error);
          }
        });
      }}
    >
      {EVENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(`eventStatus.${s}`)}
        </option>
      ))}
    </Select>
  );
}
