"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useMemo, useState } from "react";
import { CalendarDays, ChefHat, Clock, LayoutGrid, List, Plus, Search, UserCheck, UserRound, Users, X } from "lucide-react";
import { WORKER_GENDERS, WORKER_GENDER_LABELS_UZ, WORKER_POSITIONS, WORKER_POSITION_LABELS_UZ, type StaffRole, type WorkerGender, type WorkerPosition } from "@iqbol/shared";
import { approveWorkerAction, deleteWorkerAction, rejectWorkerAction } from "@/lib/actions/workers.actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CreateWorkerModal } from "@/components/workers/create-worker-modal";
import { cn } from "@/lib/utils";
import { dayKey, type StaffingEvent, type TeamWorker } from "./types";
import { TeamCard, type CardHandlers } from "./team-card";
import { TeamTable } from "./team-table";
import { PendingQueue } from "./pending-queue";
import { AssignModal } from "./assign-modal";
import { WorkerEditModal } from "./worker-edit-modal";
import { PinModal } from "./pin-modal";

type Dialog =
  | { kind: "create" }
  | { kind: "assign"; worker: TeamWorker }
  | { kind: "edit"; worker: TeamWorker }
  | { kind: "pin"; worker: TeamWorker }
  | { kind: "confirm"; title: string; message: string; label: string; safe?: boolean; run: () => Promise<void> }
  | null;

const POSITION_ICON: Record<WorkerPosition, React.ReactNode> = {
  WAITER_MALE: <UserRound className="h-3.5 w-3.5" />,
  WAITER_FEMALE: <UserRound className="h-3.5 w-3.5" />,
  CHEF: <ChefHat className="h-3.5 w-3.5" />,
  OTHER: <Users className="h-3.5 w-3.5" />,
};

async function unwrap(p: Promise<{ error?: string }>) {
  const res = await p;
  if (res?.error) throw new Error(res.error);
}

export function TeamPage({
  workers,
  events,
  role,
  busyThisWeek,
}: {
  workers: TeamWorker[];
  events: StaffingEvent[];
  role: StaffRole;
  busyThisWeek: number;
}) {
  const tr = useTr();

  const canManage = role === "SUPER_ADMIN" || role === "ADMIN";
  const perms = { canManage, canDelete: role === "SUPER_ADMIN", canAssign: true };

  const [dialog, setDialog] = useState<Dialog>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const [position, setPosition] = useState<WorkerPosition | "ALL">("ALL");
  const [gender, setGender] = useState<WorkerGender | "ALL">("ALL");
  const [view, setView] = useState<"card" | "table">("card");
  const [date, setDate] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);

  const pending = workers.filter((w) => w.status === "PENDING");
  const active = workers.filter((w) => w.status === "APPROVED");
  const inactive = workers.filter((w) => w.status === "REJECTED");
  const pool = tab === "active" ? active : inactive;

  const busyOn = useMemo(() => {
    if (!date) return undefined;
    const [y, m, d] = date.split("-").map(Number);
    const key = dayKey(new Date(y, m - 1, d));
    return new Set(workers.filter((w) => w.upcoming.some((u) => dayKey(u.eventDate) === key)).map((w) => w.id));
  }, [date, workers]);

  const q = query.trim().toLowerCase();
  const filtered = pool.filter((w) => {
    if (position !== "ALL" && w.position !== position) return false;
    if (gender !== "ALL" && w.gender !== gender) return false;
    if (freeOnly && busyOn?.has(w.id)) return false;
    if (q && !(w.fullName.toLowerCase().includes(q) || w.phone.includes(q))) return false;
    return true;
  });
  const hasFilters = q || position !== "ALL" || gender !== "ALL" || date;

  const on: CardHandlers = {
    onAssign: (worker) => setDialog({ kind: "assign", worker }),
    onEdit: (worker) => setDialog({ kind: "edit", worker }),
    onPin: (worker) => setDialog({ kind: "pin", worker }),
    onDeactivate: (worker) =>
      setDialog({
        kind: "confirm",
        title: tr("Faolsizlantirish"),
        message: tr(`${worker.fullName} ishdan ketgan deb belgilanadi va to'ylarga biriktirish ro'yxatidan chiqadi. Tarixi saqlanib qoladi, istalgan payt qayta faollashtirish mumkin.`),
        label: tr("Faolsizlantirish"),
        run: () => unwrap(rejectWorkerAction(worker.id)),
      }),
    onReactivate: (worker) =>
      setDialog({
        kind: "confirm",
        title: "Qayta faollashtirish",
        message: tr(`${worker.fullName} yana faol ishchilar qatoriga qaytadi.`),
        label: tr("Faollashtirish"),
        safe: true,
        run: () => unwrap(approveWorkerAction(worker.id)),
      }),
    onDelete: (worker) =>
      setDialog({
        kind: "confirm",
        title: tr("Ishchini o'chirish"),
        message: tr(`${worker.fullName} butunlay o'chiriladi. Agar u ishdan ketgan bo'lsa, o'chirish o'rniga "Faolsizlantirish"dan foydalaning — tarixi saqlanadi.`),
        label: tr("O'chirish"),
        run: () => unwrap(deleteWorkerAction(worker.id)),
      }),
  };

  const stats = [
    { label: tr("Jami ishchilar"), value: workers.length, icon: <Users className="h-5 w-5" /> },
    { label: tr("Faol"), value: active.length, icon: <UserCheck className="h-5 w-5" /> },
    { label: "Kutilmoqda", value: pending.length, icon: <Clock className="h-5 w-5" />, warn: pending.length > 0 },
    { label: "Bu hafta band", value: busyThisWeek, icon: <CalendarDays className="h-5 w-5" /> },
  ];

  const chip = (activeChip: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
      activeChip ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{tr("Ishchilar")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tr("Afitsantlar va oshpazlar jamoasi, ularning bandligi va to'ylarga biriktirish.")}</p>
        </div>
        <Button type="button" onClick={() => setDialog({ kind: "create" })}>
          <Plus className="h-4 w-4" />  {tr("Ishchi qo'shish")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={cn(
              "flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3.5",
              s.warn ? "border-accent/40 bg-accent/5" : "border-border",
            )}
          >
            <div>
              <p className="text-xs text-muted-foreground">{tr(s.label)}</p>
              <p className={cn("font-display mt-0.5 text-3xl font-semibold leading-none lining-nums tabular-nums", s.warn && "text-accent")}>
                {s.value}
              </p>
            </div>
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.warn ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground")}>
              {s.icon}
            </span>
          </div>
        ))}
      </div>

      <PendingQueue workers={pending} canDecide={canManage} />

      {/* ---------- Toolbar ---------- */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-muted p-1">
            {(
              [
                ["active", tr(`Faol (${active.length})`)],
                ["inactive", tr(`Faol emas (${inactive.length})`)],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Ism yoki telefon...")} className="pl-9 pr-9" />
            {q && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={tr("Tozalash")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="inline-flex rounded-xl bg-muted p-1">
            {(
              [
                ["card", <LayoutGrid key="c" className="h-4 w-4" />, "Kartochka"],
                ["table", <List key="t" className="h-4 w-4" />, tr("Jadval")],
              ] as const
            ).map(([key, icon, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-label={label}
                title={label}
                className={cn(
                  "flex h-8 w-9 items-center justify-center rounded-lg transition",
                  view === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setPosition("ALL")} className={chip(position === "ALL")}>
            
            {tr("Barchasi")} {pool.length}
          </button>
          {WORKER_POSITIONS.map((p) => {
            const count = pool.filter((w) => w.position === p).length;
            if (count === 0) return null;
            return (
              <button key={p} type="button" onClick={() => setPosition(p)} className={chip(position === p)}>
                {POSITION_ICON[p]} {tr(WORKER_POSITION_LABELS_UZ[p])} {count}
              </button>
            );
          })}
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <Select value={gender} onChange={(e) => setGender(e.target.value as WorkerGender | "ALL")} className="h-8 w-auto rounded-full py-0 text-xs">
            <option value="ALL">{tr("Jinsi: barchasi")}</option>
            {WORKER_GENDERS.map((g) => (
              <option key={g} value={g}>
                {tr(WORKER_GENDER_LABELS_UZ[g])}
              </option>
            ))}
          </Select>
          <label className="flex h-8 items-center gap-2 rounded-full border border-border px-3 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="hidden min-[420px]:inline">{tr("Bandlik:")}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (!e.target.value) setFreeOnly(false);
              }}
              className="bg-transparent text-foreground outline-none"
            />
          </label>
          {date && (
            <button type="button" onClick={() => setFreeOnly((f) => !f)} className={chip(freeOnly)}>
              
              {tr("Faqat bo'shlar")}
            </button>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPosition("ALL");
                setGender("ALL");
                setDate("");
                setFreeOnly(false);
              }}
              className="text-xs text-primary hover:underline"
            >
              Filtrlarni tozalash
            </button>
          )}
        </div>
      </div>

      {/* ---------- Results ---------- */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">
            {hasFilters ? tr("Filtrga mos ishchi topilmadi.") : tab === "active" ? tr("Hozircha faol ishchi yo'q.") : tr("Faol bo'lmagan ishchi yo'q.")}
          </p>
        </div>
      ) : view === "card" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((w) => (
            <div key={w.id} className="relative h-full">
              {busyOn && (
                <span
                  className={cn(
                    "absolute -top-2 left-4 z-10 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm",
                    busyOn.has(w.id) ? "bg-accent text-accent-foreground" : "bg-success text-success-foreground",
                  )}
                >
                  {busyOn.has(w.id) ? tr("Shu kuni band") : tr("Shu kuni bo'sh")}
                </span>
              )}
              <TeamCard worker={w} perms={perms} on={on} />
            </div>
          ))}
        </div>
      ) : (
        <TeamTable workers={filtered} canAssign={perms.canAssign} onAssign={on.onAssign} onOpen={canManage ? on.onEdit : undefined} busyOn={busyOn} />
      )}

      <CreateWorkerModal open={dialog?.kind === "create"} onClose={() => setDialog(null)} />
      {dialog?.kind === "assign" && <AssignModal worker={dialog.worker} events={events} onClose={() => setDialog(null)} />}
      {dialog?.kind === "edit" && <WorkerEditModal worker={dialog.worker} onClose={() => setDialog(null)} />}
      {dialog?.kind === "pin" && <PinModal worker={dialog.worker} onClose={() => setDialog(null)} />}
      {dialog?.kind === "confirm" && (
        <ConfirmDialog
          open
          onClose={() => setDialog(null)}
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.label}
          destructive={!dialog.safe}
          onConfirm={dialog.run}
        />
      )}
    </div>
  );
}
