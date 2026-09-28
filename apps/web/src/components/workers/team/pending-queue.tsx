"use client";

import { useState, useTransition } from "react";
import { Check, Clock, Phone, X } from "lucide-react";
import { WORKER_GENDER_LABELS_UZ, WORKER_POSITION_LABELS_UZ } from "@shodiyora/shared";
import { approveWorkerAction, rejectWorkerAction } from "@/lib/actions/workers.actions";
import { formatDate } from "@/lib/utils";
import type { TeamWorker } from "./types";
import { WorkerAvatar } from "./worker-avatar";

/** New self-registrations waiting for a decision, kept apart from the team. */
export function PendingQueue({ workers, canDecide }: { workers: TeamWorker[]; canDecide: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  function decide(id: string, approve: boolean) {
    setBusyId(id);
    setError(undefined);
    startTransition(async () => {
      const res = approve ? await approveWorkerAction(id) : await rejectWorkerAction(id);
      if (res?.error) setError(res.error);
      setBusyId(null);
    });
  }

  if (workers.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 via-card to-card">
      <header className="flex items-center gap-2 border-b border-accent/20 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-accent">
          <Clock className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold">Tasdiqlash kutilmoqda</h2>
        <span className="rounded-full bg-accent px-2 text-xs font-semibold text-accent-foreground tabular-nums">{workers.length}</span>
        <p className="ml-auto hidden text-xs text-muted-foreground sm:block">Ro&apos;yxatdan o&apos;tgan yangi ishchilar</p>
      </header>
      {error && <p className="px-4 pt-3 text-sm text-destructive">{error}</p>}
      <ul className="divide-y divide-border/60">
        {workers.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <WorkerAvatar name={w.fullName} photoUrl={w.photoUrl} position={w.position} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{w.fullName}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>
                  {WORKER_POSITION_LABELS_UZ[w.position]}
                  {w.gender && ` · ${WORKER_GENDER_LABELS_UZ[w.gender]}`}
                </span>
                <a href={`tel:${w.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                  <Phone className="h-3 w-3" /> {w.phone}
                </a>
                <span>{formatDate(w.createdAt)}</span>
              </p>
            </div>
            {canDecide && (
              <div className="flex w-full gap-2 sm:w-auto">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => decide(w.id, false)}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 sm:flex-none"
                >
                  <X className="h-4 w-4" /> Rad etish
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => decide(w.id, true)}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-success px-4 text-sm font-semibold text-success-foreground transition hover:brightness-95 disabled:opacity-50 sm:flex-none"
                >
                  <Check className="h-4 w-4" /> {busyId === w.id ? "..." : "Tasdiqlash"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
