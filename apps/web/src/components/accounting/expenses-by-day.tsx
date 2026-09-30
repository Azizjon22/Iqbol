"use client";

import { useMemo, useState } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import type { DailyReportDay } from "@/lib/types";
import { formatDate, formatSom, cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

type Period = "all" | "year" | "month";

function parseDayLocal(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ExpensesByDay({ days }: { days: DailyReportDay[] }) {
  const { t, locale } = useLocale();
  const [period, setPeriod] = useState<Period>("all");

  const periodOptions: [Period, string][] = [
    ["all", t("common.all")],
    ["year", t("common.thisYear")],
    ["month", t("common.thisMonth")],
  ];

  const filtered = useMemo(() => {
    const now = new Date();
    if (period === "month") {
      return days.filter((d) => {
        const date = parseDayLocal(d.date);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      });
    }
    if (period === "year") {
      return days.filter((d) => parseDayLocal(d.date).getFullYear() === now.getFullYear());
    }
    return days;
  }, [days, period]);

  return (
    <div className="space-y-3">
      <div className="flex w-fit gap-1 rounded-lg border border-border bg-muted p-1 text-xs font-medium">
        {periodOptions.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriod(value)}
            className={cn(
              "rounded-md px-2.5 py-1.5 transition-colors",
              period === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">{t("common.noData")}</p>}
        {filtered.map((day) => (
          <CollapsibleCard
            key={day.date}
            title={
              formatDate(parseDayLocal(day.date), locale) +
              (day.eventCount > 1 ? ` · ${t("accounting.eventsCount", { count: day.eventCount })}` : "")
            }
            meta={<span className="text-sm font-semibold text-destructive">{formatSom(day.totalExpenses, locale)}</span>}
          >
            <div className="space-y-2">
              {day.expensesByCategory.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
              )}
              {day.expensesByCategory.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span>{t(`expenseCategories.${item.category}`)}</span>
                  <span className="font-medium text-destructive">{formatSom(item.amount, locale)}</span>
                </div>
              ))}
            </div>
          </CollapsibleCard>
        ))}
      </div>
    </div>
  );
}
