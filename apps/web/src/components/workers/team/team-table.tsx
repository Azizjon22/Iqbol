"use client";

import { CalendarPlus, Phone } from "lucide-react";
import { WORKER_GENDER_LABELS_UZ, WORKER_POSITION_LABELS_UZ } from "@shodiyora/shared";
import { formatDate, formatTime, cn } from "@/lib/utils";
import type { TeamWorker } from "./types";
import { WorkerAvatar } from "./worker-avatar";

export function TeamTable({
  workers,
  canAssign,
  onAssign,
  onOpen,
  busyOn,
}: {
  workers: TeamWorker[];
  canAssign: boolean;
  onAssign: (w: TeamWorker) => void;
  onOpen?: (w: TeamWorker) => void;
  /** When a date is picked: which workers are booked that day. */
  busyOn?: Set<string>;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Ishchi</th>
            <th className="px-4 py-3">Lavozim</th>
            <th className="px-4 py-3">Telefon</th>
            <th className="px-4 py-3">Keyingi to&apos;y</th>
            <th className="px-4 py-3 text-center">Rejada</th>
            <th className="px-4 py-3 text-right" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {workers.map((w) => {
            const next = w.upcoming[0];
            const assignable = canAssign && w.status === "APPROVED" && w.position !== "CHEF";
            return (
              <tr key={w.id} className={cn("transition hover:bg-muted/40", w.status !== "APPROVED" && "opacity-60")}>
                <td className="px-4 py-2.5">
                  <button type="button" onClick={() => onOpen?.(w)} className="flex items-center gap-3 text-left">
                    <WorkerAvatar name={w.fullName} photoUrl={w.photoUrl} position={w.position} size="sm" />
                    <span>
                      <span className="block font-medium">{w.fullName}</span>
                      {busyOn && (
                        <span className={cn("text-xs", busyOn.has(w.id) ? "text-accent" : "text-success")}>
                          {busyOn.has(w.id) ? "Shu kuni band" : "Shu kuni bo'sh"}
                        </span>
                      )}
                    </span>
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                  {WORKER_POSITION_LABELS_UZ[w.position]}
                  {w.gender && <span className="text-xs"> · {WORKER_GENDER_LABELS_UZ[w.gender]}</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <a href={`tel:${w.phone}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                    <Phone className="h-3.5 w-3.5" /> {w.phone}
                  </a>
                </td>
                <td className="px-4 py-2.5">
                  {next ? (
                    <span className="block">
                      <span className="block whitespace-nowrap">
                        {formatDate(next.eventDate)}, {formatTime(next.eventDate)}
                      </span>
                      <span className="block max-w-56 truncate text-xs text-muted-foreground">{next.clientName}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center font-semibold tabular-nums">{w.upcoming.length}</td>
                <td className="px-4 py-2.5 text-right">
                  {assignable && (
                    <button
                      type="button"
                      onClick={() => onAssign(w)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" /> Biriktirish
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
