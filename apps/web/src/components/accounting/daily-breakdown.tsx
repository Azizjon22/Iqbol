"use client";

import { useMemo, useState } from "react";
import type { DailyReportDay } from "@/lib/types";
import { formatDate, formatSom, cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

type Period = "all" | "year" | "month";

function parseDayLocal(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function DailyBreakdown({
  days,
  valueKey,
  tone,
}: {
  days: DailyReportDay[];
  valueKey: "netProfit" | "totalExpenses";
  tone: "success" | "destructive";
}) {
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

  const total = filtered.reduce((sum, d) => sum + Number(d[valueKey]), 0);
  const toneClass = tone === "success" ? "text-success" : "text-destructive";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-border bg-muted p-1 text-xs font-medium">
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
        <p className={cn("text-sm font-semibold", toneClass)}>{formatSom(total, locale)}</p>
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">{t("common.noData")}</p>}
        {filtered.map((d) => (
          <div key={d.date} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              {formatDate(parseDayLocal(d.date), locale)}
              {d.eventCount > 1 && ` · ${t("accounting.eventsCount", { count: d.eventCount })}`}
            </span>
            <span className={cn("font-medium", toneClass)}>{formatSom(d[valueKey], locale)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
