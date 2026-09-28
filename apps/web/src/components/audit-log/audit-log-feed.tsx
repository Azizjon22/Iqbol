"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarPlus,
  CalendarX,
  Check,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import type { AuditLogEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ACTION_META: Record<string, { icon: LucideIcon; tone: string; label: string }> = {
  CREATE: { icon: Plus, tone: "bg-success/15 text-success", label: "Yaratdi" },
  UPDATE: { icon: Pencil, tone: "bg-primary/10 text-primary", label: "Tahrirladi" },
  DELETE: { icon: Trash2, tone: "bg-destructive/15 text-destructive", label: "O'chirdi" },
  STATUS_CHANGE: { icon: RefreshCw, tone: "bg-accent/15 text-accent", label: "Holat o'zgartirdi" },
  APPROVE: { icon: Check, tone: "bg-success/15 text-success", label: "Tasdiqladi" },
  REJECT: { icon: X, tone: "bg-destructive/15 text-destructive", label: "Rad etdi" },
  ASSIGN: { icon: CalendarPlus, tone: "bg-primary/10 text-primary", label: "Belgiladi" },
  UNASSIGN: { icon: CalendarX, tone: "bg-muted text-foreground", label: "Olib tashladi" },
};

const ENTITY_LABEL_UZ: Record<string, string> = {
  EVENT: "To'y",
  PAYMENT: "To'lov",
  EXPENSE: "Xarajat",
  MENU: "Menyu",
  MENU_DISH: "Taom",
  MENU_MEDIA: "Media",
  INVENTORY_ITEM: "Ombor",
  WORKER: "Ishchi",
  STAFF_USER: "Xodim",
  SHOPPING_LIST: "Bozorlik",
  SETTINGS: "Sozlamalar",
};

export function AuditLogFeed({ initialEntries }: { initialEntries: AuditLogEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [live, setLive] = useState(true);
  const [flashId, setFlashId] = useState<string | null>(null);
  const knownIds = useRef(new Set(initialEntries.map((e) => e.id)));

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/proxy/audit-logs?limit=300", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as AuditLogEntry[];
        const newest = data.find((e) => !knownIds.current.has(e.id));
        if (newest) {
          setFlashId(newest.id);
          setTimeout(() => setFlashId(null), 2000);
        }
        knownIds.current = new Set(data.map((e) => e.id));
        setEntries(data);
      } catch {
        // Transient network hiccup — the next tick will retry, nothing to show the user.
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [live]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Jami {entries.length} ta yozuv</p>
        <button
          type="button"
          onClick={() => setLive((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-success animate-pulse" : "bg-muted-foreground")} />
          {live ? "Jonli yangilanmoqda" : "To'xtatilgan"}
        </button>
      </div>

      <div className="space-y-2">
        {entries.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Hali hech qanday amal qayd etilmagan.
          </p>
        )}
        {entries.map((entry) => {
          const meta = ACTION_META[entry.action] ?? {
            icon: Pencil,
            tone: "bg-muted text-foreground",
            label: entry.action,
          };
          const Icon = meta.icon;
          return (
            <div
              key={entry.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border p-3 transition-colors",
                flashId === entry.id && "border-primary/40 bg-primary/[0.06]",
              )}
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", meta.tone)}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{entry.description}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{entry.actorName}</span>
                  <span>·</span>
                  <span>{formatDateTime(entry.createdAt)}</span>
                  <span>·</span>
                  <span>{ENTITY_LABEL_UZ[entry.entityType] ?? entry.entityType}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
