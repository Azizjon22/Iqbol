import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, TrendingDown, PiggyBank, CalendarDays, Receipt, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { DailyReport, EventDetail } from "@/lib/types";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { StatCard } from "@/components/ui/stat-card";
import { DailyBreakdown } from "@/components/accounting/daily-breakdown";
import { ExpensesByDay } from "@/components/accounting/expenses-by-day";
import { ProfitTrendChart } from "@/components/accounting/profit-trend-chart";
import { ExpensesCategoryChart } from "@/components/accounting/expenses-category-chart";
import { formatDate, formatSom } from "@/lib/utils";
import { getLocale } from "@/i18n/locale";
import { getDictionary, translate } from "@/i18n/get-dictionary";

export default async function AccountingPage() {
  const session = await getSession();
  if (session?.user.kind !== "STAFF" || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard/events");
  }

  const [report, events, locale] = await Promise.all([
    apiFetch<DailyReport>("/payments/daily-report"),
    apiFetch<EventDetail[]>("/events"),
    getLocale(),
  ]);
  const dict = getDictionary(locale);
  const t = (key: string, params?: Record<string, string | number>) => translate(dict, key, params);

  const outstandingEvents = events
    .filter((e) => e.status !== "CANCELLED" && e.balance && Number(e.balance) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance));
  const totalOutstanding = outstandingEvents.reduce((sum, e) => sum + Number(e.balance ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t("accounting.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("accounting.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("accounting.totalPaid")}
          value={formatSom(report.totalPaid, locale)}
          icon={<Wallet className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label={t("accounting.totalExpenses")}
          value={formatSom(report.totalExpenses, locale)}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="destructive"
        />
        <StatCard
          label={t("accounting.netProfit")}
          value={formatSom(report.netProfit, locale)}
          icon={<PiggyBank className="h-5 w-5" />}
          tone={Number(report.netProfit) >= 0 ? "accent" : "destructive"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ProfitTrendChart days={report.days} />
        </div>
        <div className="lg:col-span-2">
          <ExpensesCategoryChart expensesByCategory={report.expensesByCategory} />
        </div>
      </div>

      <CollapsibleCard
        icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
        title={t("accounting.dailyProfit")}
      >
        <DailyBreakdown days={report.days} valueKey="netProfit" tone="success" />
      </CollapsibleCard>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <Receipt className="h-4 w-4 text-muted-foreground" /> {t("accounting.dailyExpenses")}
        </h2>
        <ExpensesByDay days={report.days} />
      </div>

      <CollapsibleCard
        icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
        title={t("accounting.outstandingEvents")}
        meta={
          outstandingEvents.length > 0 ? (
            <span className="text-sm font-semibold text-destructive">{formatSom(totalOutstanding, locale)}</span>
          ) : undefined
        }
        defaultOpen={outstandingEvents.length > 0}
      >
        <div className="space-y-2">
          {outstandingEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("accounting.noOutstanding")}</p>
          )}
          {outstandingEvents.map((event) => (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}`}
              className="flex items-center justify-between rounded-md border border-border p-3 text-sm transition-colors hover:border-primary/40 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{event.clientName}</p>
                <p className="text-xs text-muted-foreground">{formatDate(event.eventDate, locale)}</p>
              </div>
              <span className="font-medium text-destructive">{formatSom(event.balance ?? "0", locale)}</span>
            </Link>
          ))}
        </div>
      </CollapsibleCard>
    </div>
  );
}
