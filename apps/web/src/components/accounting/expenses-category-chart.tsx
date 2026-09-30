"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { EventExpenseCategory } from "@iqbol/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatSom } from "@/lib/utils";

const COLORS = [
  "#111813",
  "#3c4f44",
  "#1f7a62",
  "#c2342a",
  "#5b6fd6",
  "#1d6a8a",
  "#5d7364",
  "#3d5a80",
  "#6b7280",
];

export function ExpensesCategoryChart({
  expensesByCategory,
}: {
  expensesByCategory: { category: EventExpenseCategory; amount: string }[];
}) {
  const { t, locale } = useLocale();

  const data = useMemo(
    () =>
      expensesByCategory
        .map((item) => ({
          name: t(`expenseCategories.${item.category}`),
          value: Number(item.amount),
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [expensesByCategory, t],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("accounting.categoryTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("common.noData")}</p>
        ) : (
          <div className="h-64 w-full sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="48%"
                  outerRadius="72%"
                  paddingAngle={2}
                >
                  {data.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
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
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
