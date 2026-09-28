"use client";

import { CalendarClock, CalendarPlus, Check, KeyRound, Pencil, Phone, RotateCcw, Trash2, UserX } from "lucide-react";
import { WORKER_GENDER_LABELS_UZ, WORKER_POSITION_LABELS_UZ } from "@iqbol/shared";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { formatDate, formatTime, cn } from "@/lib/utils";
import type { TeamWorker } from "./types";
import { WorkerAvatar } from "./worker-avatar";

export interface CardPermissions {
  canManage: boolean;
  canDelete: boolean;
  canAssign: boolean;
}

export interface CardHandlers {
  onAssign: (w: TeamWorker) => void;
  onEdit: (w: TeamWorker) => void;
  onPin: (w: TeamWorker) => void;
  onDeactivate: (w: TeamWorker) => void;
  onReactivate: (w: TeamWorker) => void;
  onDelete: (w: TeamWorker) => void;
}

export function TeamCard({ worker, perms, on }: { worker: TeamWorker; perms: CardPermissions; on: CardHandlers }) {
  const active = worker.status === "APPROVED";
  const next = worker.upcoming[0];
  const assignable = perms.canAssign && active && worker.position !== "CHEF";

  return (
    <div
      className={cn(
        "group flex h-full flex-col rounded-2xl border bg-card p-4 transition hover:border-primary/30 hover:shadow-md",
        active ? "border-border" : "border-dashed border-border opacity-75",
      )}
    >
      <div className="flex items-start gap-3">
        <WorkerAvatar name={worker.fullName} photoUrl={worker.photoUrl} position={worker.position} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{worker.fullName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {WORKER_POSITION_LABELS_UZ[worker.position]}
            {worker.gender && ` · ${WORKER_GENDER_LABELS_UZ[worker.gender]}`}
          </p>
          {!active && (
            <span className="mt-1.5 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
              Faol emas
            </span>
          )}
        </div>
        <DropdownMenu
          items={[
            { label: "Tahrirlash", icon: <Pencil className="h-4 w-4" />, onSelect: () => on.onEdit(worker), hidden: !perms.canManage },
            {
              label: "PIN kodni tiklash",
              icon: <KeyRound className="h-4 w-4" />,
              onSelect: () => on.onPin(worker),
              hidden: !perms.canManage || worker.position !== "CHEF" || !active,
            },
            {
              label: "Faolsizlantirish",
              icon: <UserX className="h-4 w-4" />,
              onSelect: () => on.onDeactivate(worker),
              hidden: !perms.canManage || !active,
            },
            {
              label: "Qayta faollashtirish",
              icon: <RotateCcw className="h-4 w-4" />,
              onSelect: () => on.onReactivate(worker),
              hidden: !perms.canManage || active,
            },
            {
              label: "O'chirish",
              icon: <Trash2 className="h-4 w-4" />,
              onSelect: () => on.onDelete(worker),
              tone: "danger",
              hidden: !perms.canDelete,
            },
          ]}
        />
      </div>

      <div className="mt-4 rounded-xl bg-muted/50 px-3 py-2.5 text-xs">
        {next ? (
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {formatDate(next.eventDate)}, {formatTime(next.eventDate)}
              </p>
              <p className="truncate text-muted-foreground">{next.clientName}</p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary tabular-nums">
              {worker.upcoming.length} ta to&apos;y
            </span>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Check className="h-4 w-4 shrink-0 text-success" /> Bo&apos;sh — rejada to&apos;y yo&apos;q
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-3">
        <a
          href={`tel:${worker.phone}`}
          className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-xs text-muted-foreground hover:text-primary"
        >
          <Phone className="h-3.5 w-3.5 shrink-0" /> {worker.phone}
        </a>
        {assignable && (
          <button
            type="button"
            onClick={() => on.onAssign(worker)}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Biriktirish
          </button>
        )}
      </div>
    </div>
  );
}
