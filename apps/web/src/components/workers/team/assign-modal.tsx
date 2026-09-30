"use client";
import { useLocale, useTr } from "@/components/i18n/locale-provider";


import { useState, useTransition } from "react";
import { AlertTriangle, Users } from "lucide-react";
import { toggleEventAssignmentAction } from "@/lib/actions/events.actions";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { formatDate, formatTime, cn } from "@/lib/utils";
import { dayKey, type StaffingEvent, type TeamWorker } from "./types";
import { WorkerAvatar } from "./worker-avatar";

const WEEKDAYS = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];

/** Toggle a worker onto upcoming weddings, warning about same-day double bookings. */
export function AssignModal({ worker, events, onClose }: { worker: TeamWorker; events: StaffingEvent[]; onClose: () => void }) {
  const tr = useTr();
  const locale = useLocale().locale;

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [assigned, setAssigned] = useState<Set<string>>(
    () => new Set(events.filter((e) => e.assignedWorkerIds.includes(worker.id)).map((e) => e.id)),
  );

  function toggle(eventId: string, value: boolean) {
    const prev = new Set(assigned);
    const next = new Set(assigned);
    if (value) next.add(eventId);
    else next.delete(eventId);
    setAssigned(next);
    setError(undefined);
    startTransition(async () => {
      try {
        await toggleEventAssignmentAction(eventId, worker.id, value);
      } catch {
        setAssigned(prev);
        setError(tr("Saqlab bo'lmadi, qaytadan urinib ko'ring"));
      }
    });
  }

  const bookedDays = new Map<string, number>();
  for (const e of events) if (assigned.has(e.id)) bookedDays.set(dayKey(e.eventDate), (bookedDays.get(dayKey(e.eventDate)) ?? 0) + 1);

  return (
    <Modal open onClose={onClose} title={tr("To'yga biriktirish")} size="md">
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-muted/60 p-3">
        <WorkerAvatar name={worker.fullName} photoUrl={worker.photoUrl} position={worker.position} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{worker.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {assigned.size > 0 ? tr(`${assigned.size} ta to'yga biriktirilgan`) : tr("Hali hech bir to'yga biriktirilmagan")}
          </p>
        </div>
      </div>

      {events.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{tr("Kelgusi to'ylar yo'q.")}</p>}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <ul className="space-y-2">
        {events.map((event) => {
          const checked = assigned.has(event.id);
          const date = new Date(event.eventDate);
          const staffed = event.assignedWorkerIds.filter((id) => id !== worker.id).length + (checked ? 1 : 0);
          const clash = checked && (bookedDays.get(dayKey(date)) ?? 0) > 1;
          return (
            <li
              key={event.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition",
                checked ? "border-primary/50 bg-primary/5" : "border-border",
              )}
            >
              <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-muted py-1.5">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">{WEEKDAYS[date.getDay()]}</span>
                <span className="font-display text-xl font-semibold leading-none lining-nums">{date.getDate()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{event.clientName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(date, locale)}, {formatTime(date)} · {tr(`${event.guestCount} mehmon`)}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {staffed}  {tr("ta ishchi")}
                </p>
                {clash && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-accent">
                    <AlertTriangle className="h-3 w-3" />  {tr("Shu kuni boshqa to'yga ham biriktirilgan")}
                  </p>
                )}
              </div>
              <Switch
                checked={checked}
                disabled={isPending}
                onChange={() => toggle(event.id, !checked)}
                aria-label={event.clientName}
              />
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
