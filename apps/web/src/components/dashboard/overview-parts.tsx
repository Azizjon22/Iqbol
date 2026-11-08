import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, Check, ChefHat, ClipboardList, Users, Wallet } from "lucide-react";
import type { Locale } from "@/i18n/types";
import { formatSom, formatTime, cn } from "@/lib/utils";

export interface PrepWorker {
  id: string;
  fullName: string;
  position: string;
  photoUrl: string | null;
}

export interface PrepEvent {
  id: string;
  clientName: string;
  clientPhone: string;
  eventDate: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  guestCount: number;
  tableCapacity: number;
  menuName: string;
  firstDish: string | null;
  secondDish: string | null;
  assignedWorkers: PrepWorker[];
  shoppingListCount: number;
  /** Only present for SUPER_ADMIN. */
  balance?: string;
}

export interface WeekDay {
  date: string;
  events: { id: string; clientName: string; eventDate: string; guestCount: number; status: PrepEvent["status"] }[];
}

type T = (key: string, params?: Record<string, string | number>) => string;

/** "2026-09-28" → local Date at midnight (no UTC shift). */
export function parseDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function weekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7; // Monday = 0
}

/** Everything that still needs doing before a wedding, as short labels. */
export function prepIssues(e: PrepEvent, t: T) {
  const issues: string[] = [];
  if (!e.firstDish || !e.secondDish) issues.push("1/2-ovqat tanlanmagan");
  if (e.assignedWorkers.length === 0) issues.push(t("dashboard.prepNoWorkers"));
  else if (!e.assignedWorkers.some((w) => w.position === "CHEF")) issues.push(t("dashboard.prepNoChef"));
  if (e.shoppingListCount === 0) issues.push(t("dashboard.prepNoList"));
  return issues;
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  href,
  featured,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: ReactNode;
  href: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-5",
        featured
          ? "border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card"
          : "border-border bg-card hover:border-primary/30",
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,var(--surface-glow),transparent_70%)]" />
      <div className="relative flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground sm:text-sm">{label}</p>
        <span
          className={cn(
            "hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex",
            featured ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : "bg-muted text-foreground",
          )}
        >
          {icon}
        </span>
      </div>
      <p className="font-display relative mt-2 text-[clamp(1.75rem,5vw,3rem)] font-semibold leading-none tracking-tight lining-nums tabular-nums">{value}</p>
      <div className="relative mt-3 flex items-end justify-between gap-2">
        {hint && <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-xs">{hint}</p>}
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
    </Link>
  );
}

export function WeekPlan({ week, t, weekdays }: { week: WeekDay[]; t: T; weekdays: string[] }) {
  return (
    // Laid out by the card's own width, not the viewport: beside the sidebar a
    // tablet has far less room than its screen width suggests.
    <div className="@container">
    <div className="-mx-4 flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 sm:-mx-5 sm:scroll-px-5 sm:px-5 @[640px]:mx-0 @[640px]:grid @[640px]:grid-cols-7 @[640px]:overflow-visible @[640px]:px-0 @[640px]:pb-0">
      {week.map((day, i) => {
        const date = parseDayKey(day.date);
        const tag = i === 0 ? t("dashboard.today") : i === 1 ? t("dashboard.tomorrow") : null;
        return (
          <div
            key={day.date}
            className={cn(
              "flex min-h-40 w-[132px] min-w-0 shrink-0 snap-start flex-col rounded-xl border p-2.5 @[640px]:w-auto",
              i === 0 ? "border-primary/50 bg-primary/5" : "border-border bg-background/40",
            )}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <span className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{weekdays[weekdayIndex(date)]}</span>
              {tag && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-accent/15 text-accent",
                  )}
                >
                  {tag}
                </span>
              )}
            </div>
            <p className="font-display text-[clamp(1.5rem,4vw,1.875rem)] font-semibold leading-tight lining-nums">{date.getDate()}</p>
            <div className="mt-2 flex flex-1 flex-col gap-1.5">
              {day.events.length === 0 && <p className="mt-auto text-xs text-muted-foreground/70">{t("dashboard.noEvents")}</p>}
              {day.events.map((e) => (
                <Link
                  key={e.id}
                  href={`/dashboard/events/${e.id}`}
                  className={cn(
                    "rounded-lg px-2 py-1.5 text-xs transition hover:brightness-110",
                    e.status === "CONFIRMED" ? "bg-primary/15 text-foreground" : "bg-accent/15 text-foreground",
                  )}
                  title={e.clientName}
                >
                  <span className="block whitespace-nowrap font-semibold tabular-nums">{formatTime(e.eventDate)}</span>
                  <span className="line-clamp-2 break-words leading-snug text-muted-foreground">{e.clientName}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}

function Avatar({ worker }: { worker: PrepWorker }) {
  const initials = worker.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return worker.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={worker.photoUrl} alt={worker.fullName} title={worker.fullName} className="h-8 w-8 rounded-full object-cover ring-2 ring-card" />
  ) : (
    <span title={worker.fullName} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold ring-2 ring-card">
      {initials}
    </span>
  );
}

function PrepItem({ ok, icon, children }: { ok: boolean; icon: ReactNode; children: ReactNode }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
        ok ? "bg-success/10 text-success" : "bg-accent/15 text-accent",
      )}
    >
      {ok ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} /> : icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** One upcoming wedding with everything staff must check before the day. */
export function EventPrepCard({ event, t, locale, weekdays }: { event: PrepEvent; t: T; locale: Locale; weekdays: string[] }) {
  const workers = event.assignedWorkers;
  const hasChef = workers.some((w) => w.position === "CHEF");
  const date = new Date(event.eventDate);
  const balance = event.balance === undefined ? undefined : Number(event.balance);

  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      className="group block rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-md sm:p-5"
    >
      <div className="flex gap-4">
        <div className="flex w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 px-1 py-2 text-primary">
          <span className="font-display text-xl font-semibold leading-none lining-nums tabular-nums sm:text-2xl">{formatTime(date)}</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{weekdays[weekdayIndex(date)]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{event.clientName}</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                event.status === "CONFIRMED" ? "bg-success/15 text-success" : "bg-accent/15 text-accent",
              )}
            >
              {event.status === "CONFIRMED" ? t("dashboard.statusConfirmed") : t("dashboard.statusPending")}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {event.clientPhone} · {event.menuName}
          </p>
          <p className="mt-0.5 truncate text-sm">
            {event.firstDish || event.secondDish ? (
              <>
                <span className="text-accent">1:</span> {event.firstDish ?? "—"} <span className="mx-1 text-muted-foreground">·</span>
                <span className="text-accent">2:</span> {event.secondDish ?? "—"}
              </>
            ) : (
              <span className="text-accent">1/2-ovqat tanlanmagan</span>
            )}
          </p>
          <p className="mt-1 text-sm">
            <span className="font-semibold tabular-nums">{event.guestCount}</span>{" "}
            <span className="text-muted-foreground">{t("dashboard.guest")}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="font-semibold tabular-nums">{event.tableCapacity}</span>{" "}
            <span className="text-muted-foreground">{t("dashboard.table")}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 xl:grid-cols-4">
        <PrepItem ok={workers.length > 0} icon={<Users className="h-3.5 w-3.5 shrink-0" />}>
          {workers.length > 0 ? t("dashboard.prepWorkers", { count: workers.length }) : t("dashboard.prepNoWorkers")}
        </PrepItem>
        <PrepItem ok={hasChef} icon={<ChefHat className="h-3.5 w-3.5 shrink-0" />}>
          {hasChef ? t("dashboard.prepChef") : t("dashboard.prepNoChef")}
        </PrepItem>
        <PrepItem ok={event.shoppingListCount > 0} icon={<ClipboardList className="h-3.5 w-3.5 shrink-0" />}>
          {event.shoppingListCount > 0 ? t("dashboard.prepList") : t("dashboard.prepNoList")}
        </PrepItem>
        {balance !== undefined && (
          <PrepItem ok={balance <= 0} icon={<Wallet className="h-3.5 w-3.5 shrink-0" />}>
            {balance <= 0 ? t("dashboard.prepPaid") : t("dashboard.prepBalance", { amount: formatSom(balance, locale) })}
          </PrepItem>
        )}
      </div>

      {workers.length > 0 && (
        <div className="mt-3 flex items-center">
          <div className="flex -space-x-2">
            {workers.slice(0, 7).map((w) => (
              <Avatar key={w.id} worker={w} />
            ))}
          </div>
          {workers.length > 7 && <span className="ml-2 text-xs text-muted-foreground">+{workers.length - 7}</span>}
        </div>
      )}
    </Link>
  );
}

export function AttentionItem({ href, icon, children, tone = "warn" }: { href: string; icon: ReactNode; children: ReactNode; tone?: "warn" | "danger" }) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-muted"
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-accent/15 text-accent",
        )}
      >
        {icon ?? <AlertTriangle className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </Link>
  );
}
