"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyReportDay } from "@/lib/types";
import { cn, formatDate, formatSom } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Period = "all" | "year" | "month";

function parseDayLocal(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function filterDays(days: DailyReportDay[], period: Period) {
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
}

export function ProfitTrendChart({ days }: { days: DailyReportDay[] }) {
  const { t, locale } = useLocale();
  const [period, setPeriod] = useState<Period>("year");

  const periodOptions: [Period, string][] = [
    ["all", t("common.all")],
    ["year", t("common.thisYear")],
    ["month", t("common.thisMonth")],
  ];

  const data = useMemo(() => {
    const filtered = filterDays(days, period)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
    return filtered.map((d) => ({
      date: d.date,
      label: formatDate(parseDayLocal(d.date), locale),
      paid: Number(d.totalPaid),
      expenses: Number(d.totalExpenses),
      profit: Number(d.netProfit),
    }));
  }, [days, period, locale]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>{t("accounting.trendTitle")}</CardTitle>
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
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("common.noData")}</p>
        ) : (
          <div className="h-64 w-full sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="paidFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                  formatter={(value) => formatSom(Number(value ?? 0), locale)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="paid"
                  name={t("accounting.paid")}
                  stroke="var(--primary)"
                  fill="url(#paidFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name={t("accounting.expenses")}
                  stroke="var(--destructive)"
                  fill="url(#expenseFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name={t("accounting.profit")}
                  stroke="var(--success)"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
