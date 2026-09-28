import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, CalendarDays, CalendarHeart, ChefHat, PackageX, PartyPopper, Plus, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import { formatDate, formatSom, formatTime, cn } from "@/lib/utils";
import { OrnamentalPattern } from "@/components/menus/ornamental-pattern";
import {
  AttentionItem,
  EventPrepCard,
  StatTile,
  WeekPlan,
  parseDayKey,
  prepIssues,
  weekdayIndex,
  type PrepEvent,
  type WeekDay,
} from "@/components/dashboard/overview-parts";
import { getLocale } from "@/i18n/locale";
import { getDictionary, translate } from "@/i18n/get-dictionary";

interface DashboardOverview {
  todayDate: string;
  counts: { active: number; thisMonth: number; week: number; weekGuests: number; today: number; tomorrow: number };
  todayEvents: PrepEvent[];
  tomorrowEvents: PrepEvent[];
  week: WeekDay[];
  lowStockItems?: { id: string; name: string; quantity: string; unit: string }[];
  pendingShoppingLists?: number;
  monthlyFinancials?: {
    eventCount: number;
    totalExpected: string;
    totalCollected: string;
    totalOutstanding: string;
    totalExpenses: string;
    netProfit: string;
  };
}

function tashkentHour() {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tashkent", hour: "numeric", hourCycle: "h23" }).format(new Date()));
}

export default async function DashboardOverviewPage() {
  const session = await getSession();
  // No longer in the ADMIN sidebar — block direct navigation too, since it
  // used to surface month-level revenue/profit figures.
  if (session?.user.kind === "STAFF" && session.user.role === "ADMIN") {
    redirect("/dashboard/events");
  }

  const [overview, locale] = await Promise.all([apiFetch<DashboardOverview>("/dashboard/overview"), getLocale()]);
  const dict = getDictionary(locale);
  const t = (key: string, params?: Record<string, string | number>) => translate(dict, key, params);

  const role = session?.user.kind === "STAFF" ? session.user.role : undefined;
  const canCreate = role === "SUPER_ADMIN";
  const fullName = session?.user.fullName ?? "";
  const hour = tashkentHour();
  const greeting =
    hour < 12 ? t("dashboard.greetingMorning") : hour < 18 ? t("dashboard.greetingDay") : t("dashboard.greetingEvening");

  const today = parseDayKey(overview.todayDate);
  const { counts } = overview;
  const summary = [
    counts.today > 0 ? t("dashboard.summaryToday", { count: counts.today }) : t("dashboard.summaryNoToday"),
    counts.tomorrow > 0 ? t("dashboard.summaryTomorrow", { count: counts.tomorrow }) : t("dashboard.summaryNoTomorrow"),
  ].join(" · ");

  // First wedding after tomorrow — shown when tomorrow itself is free.
  const nextAfterTomorrow = overview.week.slice(2).flatMap((d) => d.events)[0];

  const prepAlerts = [...overview.todayEvents, ...overview.tomorrowEvents]
    .map((e) => ({ event: e, issues: prepIssues(e, t) }))
    .filter((x) => x.issues.length > 0);
  const lowStock = overview.lowStockItems ?? [];
  const pendingLists = overview.pendingShoppingLists ?? 0;
  const showAttention = role !== "ZAVZAL";
  const fin = overview.monthlyFinancials;
  const collectedPct =
    fin && Number(fin.totalExpected) > 0 ? Math.min(100, Math.round((Number(fin.totalCollected) / Number(fin.totalExpected)) * 100)) : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ---------- Greeting ---------- */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card px-5 py-6 sm:px-8 sm:py-8">
        <OrnamentalPattern id="dash-ornament" className="text-accent opacity-[0.05]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_120%_at_100%_0%,var(--surface-glow),transparent_60%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
              {dict.weekdaysLong[weekdayIndex(today)]} · {formatDate(today, locale)}
            </p>
            <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              {greeting}
              {fullName && `, ${fullName}`}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/events"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-card/60 px-4 text-sm font-medium backdrop-blur transition hover:bg-muted"
            >
              <CalendarDays className="h-4 w-4" /> {t("dashboard.calendar")}
            </Link>
            {canCreate && (
              <Link
                href="/dashboard/events/new"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:brightness-95"
              >
                <Plus className="h-4 w-4" /> {t("dashboard.newEvent")}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Key numbers ---------- */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatTile
          featured
          label={t("dashboard.activeWeddings")}
          value={counts.active}
          hint={t("dashboard.activeHint", { count: counts.thisMonth })}
          icon={<CalendarHeart className="h-5 w-5" />}
          href="/dashboard/events"
        />
        <StatTile
          label={t("dashboard.upcoming")}
          value={counts.week}
          hint={t("dashboard.weekHint", { count: counts.weekGuests })}
          icon={<CalendarDays className="h-5 w-5" />}
          href="/dashboard/events"
        />
        <StatTile
          label={t("dashboard.tomorrowWeddings")}
          value={counts.tomorrow}
          hint={t("dashboard.tomorrowHintToday", { count: counts.today })}
          icon={<CalendarCheck className="h-5 w-5" />}
          href="/dashboard/events"
        />
      </div>

      <div className={cn("grid gap-6", (showAttention || fin) && "lg:grid-cols-[minmax(0,1fr)_340px]")}>
        <div className="min-w-0 space-y-6">
          {/* ---------- Week plan ---------- */}
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{t("dashboard.weekPlan")}</h2>
              <Link href="/dashboard/events" className="text-sm text-primary hover:underline">
                {t("dashboard.calendar")} →
              </Link>
            </div>
            {counts.week === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("dashboard.nothingThisWeek")}</p>
            ) : (
              <WeekPlan week={overview.week} t={t} weekdays={dict.weekdaysShort} />
            )}
          </section>

          {/* ---------- Today ---------- */}
          {overview.todayEvents.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <PartyPopper className="h-4 w-4 text-primary" /> {t("dashboard.todayWeddings")}
                <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground tabular-nums">
                  {overview.todayEvents.length}
                </span>
              </h2>
              {overview.todayEvents.map((e) => (
                <EventPrepCard key={e.id} event={e} t={t} locale={locale} weekdays={dict.weekdaysShort} />
              ))}
            </section>
          )}

          {/* ---------- Tomorrow ---------- */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <CalendarCheck className="h-4 w-4 text-accent" /> {t("dashboard.tomorrowWeddings")}
              {overview.tomorrowEvents.length > 0 && (
                <span className="rounded-full bg-accent/15 px-2 text-xs text-accent tabular-nums">{overview.tomorrowEvents.length}</span>
              )}
            </h2>
            {overview.tomorrowEvents.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-border bg-card/50 px-5 py-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                  </span>
                  <p className="text-sm text-muted-foreground">{t("dashboard.noTomorrow")}</p>
                </div>
                {nextAfterTomorrow && (
                  <Link
                    href={`/dashboard/events/${nextAfterTomorrow.id}`}
                    className="rounded-xl bg-muted px-3 py-2 text-sm transition hover:bg-border/60"
                  >
                    <span className="text-muted-foreground">{t("dashboard.nextWedding")}: </span>
                    <span className="font-medium">
                      {formatDate(nextAfterTomorrow.eventDate, locale)}, {formatTime(nextAfterTomorrow.eventDate)}
                    </span>
                  </Link>
                )}
              </div>
            ) : (
              overview.tomorrowEvents.map((e) => (
                <EventPrepCard key={e.id} event={e} t={t} locale={locale} weekdays={dict.weekdaysShort} />
              ))
            )}
          </section>
        </div>

        {(showAttention || fin) && (
          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            {/* ---------- Month finance (SUPER_ADMIN) ---------- */}
            {fin && (
              <Link
                href="/dashboard/accounting"
                className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary/30 hover:shadow-md"
              >
                <p className="text-sm text-muted-foreground">{t("dashboard.monthFinance")}</p>
                <p className="font-display mt-1 text-3xl font-semibold lining-nums tabular-nums">{formatSom(fin.totalCollected, locale)}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${collectedPct}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t("dashboard.collectedOf", { percent: collectedPct })} · {formatSom(fin.totalExpected, locale)}
                </p>
                <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t("dashboard.netProfit")}</dt>
                    <dd className={cn("font-semibold tabular-nums", Number(fin.netProfit) < 0 && "text-destructive")}>
                      {formatSom(fin.netProfit, locale)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t("dashboard.outstanding")}</dt>
                    <dd className={cn("font-semibold tabular-nums", Number(fin.totalOutstanding) > 0 && "text-accent")}>
                      {formatSom(fin.totalOutstanding, locale)}
                    </dd>
                  </div>
                </dl>
              </Link>
            )}

            {/* ---------- Needs attention ---------- */}
            {showAttention && (
              <section className="rounded-2xl border border-border bg-card p-3">
                <h2 className="px-2 pb-2 pt-1 text-sm font-semibold">{t("dashboard.attention")}</h2>
                {prepAlerts.length === 0 && lowStock.length === 0 && pendingLists === 0 ? (
                  <p className="px-2 pb-2 text-sm text-muted-foreground">{t("dashboard.allGood")}</p>
                ) : (
                  <div className="space-y-0.5">
                    {pendingLists > 0 && (
                      <AttentionItem href="/dashboard/shopping-lists" icon={<ChefHat className="h-4 w-4" />}>
                        {t("dashboard.pendingLists", { count: pendingLists })}
                      </AttentionItem>
                    )}
                    {prepAlerts.map(({ event, issues }) => (
                      <AttentionItem key={event.id} href={`/dashboard/events/${event.id}`} icon={<CalendarHeart className="h-4 w-4" />}>
                        <span className="block font-medium">{event.clientName}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatTime(event.eventDate)} · {issues.join(", ")}
                        </span>
                      </AttentionItem>
                    ))}
                    {lowStock.length > 0 && (
                      <AttentionItem href="/dashboard/inventory" icon={<PackageX className="h-4 w-4" />} tone="danger">
                        <span className="block font-medium">{t("dashboard.lowStock")}</span>
                        <span className="block text-xs text-muted-foreground">
                          {lowStock
                            .slice(0, 4)
                            .map((i) => `${i.name} (${Number(i.quantity)})`)
                            .join(", ")}
                          {lowStock.length > 4 && ` +${lowStock.length - 4}`}
                        </span>
                      </AttentionItem>
                    )}
                  </div>
                )}
              </section>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
