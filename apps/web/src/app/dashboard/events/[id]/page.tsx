import { Pencil } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { EventDetail } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { formatDateTime, formatSom } from "@/lib/utils";
import { UNIT_LABELS_UZ } from "@iqbol/shared";
import { StatusSelect } from "@/components/events/status-select";
import { UnassignButton } from "@/components/events/unassign-button";
import { PaymentForm } from "@/components/events/payment-form";
import { ExpenseForm } from "@/components/events/expense-form";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { ShoppingListPdfButton } from "@/components/shopping-lists/shopping-list-pdf-button";
import { ShoppingListEditor } from "@/components/shopping-lists/shopping-list-editor";
import { ItemQuantity } from "@/components/shopping-lists/item-quantity";
import { shoppingListStatusMeta, isShoppingListEditable } from "@/lib/shopping-list-status";
import { removeExpenseAction } from "@/lib/actions/events.actions";
import { StockReturnButton } from "@/components/events/stock-return-button";
import { getLocale } from "@/i18n/locale";
import { getDictionary, translate } from "@/i18n/get-dictionary";

export default async function EventDetailPage({ params }: PageProps<"/dashboard/events/[id]">) {
  const { id } = await params;
  const [event, session, locale] = await Promise.all([
    apiFetch<EventDetail>(`/events/${id}`),
    getSession(),
    getLocale(),
  ]);
  const dict = getDictionary(locale);
  const t = (key: string, params?: Record<string, string | number>) => translate(dict, key, params);

  const role = session?.user.kind === "STAFF" ? session.user.role : undefined;
  const canSeeFinancials = role === "SUPER_ADMIN";
  const canEdit = role === "SUPER_ADMIN" || role === "ADMIN";
  const canDelete = role === "SUPER_ADMIN";

  // Exact paid total when recorded, else unit price × quantity — same as the API's expense report.
  const itemCost = (item: { unitPrice: string | null; quantity: string; totalCost?: string | null }) =>
    item.totalCost != null ? Number(item.totalCost) : item.unitPrice === null ? 0 : Number(item.unitPrice) * Number(item.quantity);
  const shoppingLists = event.shoppingLists ?? [];
  const shoppingTotal = shoppingLists.reduce(
    (sum, list) => sum + list.items.reduce((s, item) => s + (item.isPurchased ? itemCost(item) : 0), 0),
    0,
  );
  const unpricedItems = shoppingLists.reduce(
    (n, list) => n + list.items.filter((item) => !item.isPurchased || item.unitPrice === null).length,
    0,
  );
  const hasShoppingExpense = (event.expenses ?? []).some((x) => x.category === "SHOPPING");
  // What chefs took from the store for this wedding (super admin only).
  const stockUsages = event.stockUsages ?? [];
  const stockTotal = stockUsages.reduce((sum, u) => sum + u.items.reduce((s, i) => s + Number(i.totalCost ?? 0), 0), 0);
  const stockUnpriced = stockUsages.reduce((n, u) => n + u.items.filter((i) => i.totalCost === null).length, 0);
  const hasStockExpense = (event.expenses ?? []).some((x) => x.category === "STOCK");
  const suggestedAmounts = {
    ...(!hasShoppingExpense && shoppingTotal > 0 ? { SHOPPING: shoppingTotal } : {}),
    ...(!hasStockExpense && stockTotal > 0 ? { STOCK: stockTotal } : {}),
  };
  const received = (event.payments ?? []).filter((p) => p.type !== "REFUND").reduce((s, p) => s + Number(p.amount), 0);
  const refunded = (event.payments ?? []).filter((p) => p.type === "REFUND").reduce((s, p) => s + Number(p.amount), 0);
  const kept = received - refunded;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight [overflow-wrap:anywhere]">{event.clientName}</h1>
          <p className="text-sm text-muted-foreground">{event.clientPhone}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <LinkButton href={`/dashboard/events/${event.id}/edit`} variant="outline" size="sm">
              <Pencil className="h-4 w-4" /> {t("common.edit")}
            </LinkButton>
          )}
          {/* Once confirmed, or once any money is on it, a wedding stays in the books. */}
          {canDelete &&
            event.status !== "CONFIRMED" &&
            event.status !== "COMPLETED" &&
            (event.payments ?? []).length === 0 &&
            (event.expenses ?? []).length === 0 && (
              <DeleteEventButton eventId={event.id} clientName={event.clientName} />
            )}
          <StatusSelect eventId={event.id} status={event.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("events.detailsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">{t("events.dateLabel")}</p>
            <p className="font-medium">{formatDateTime(event.eventDate, locale)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("events.menuLabel")}</p>
            <p className="font-medium">{event.menu.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("events.guestCountLabel")}</p>
            <p className="font-medium">{event.guestCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("events.tableType")}</p>
            <p className="font-medium">{t("events.seatsOption", { count: event.tableCapacity })}</p>
          </div>
          <div className="sm:col-span-2">
            {event.firstDish || event.secondDish ? (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    [t("events.firstDish"), event.firstDish],
                    [t("events.secondDish"), event.secondDish],
                  ] as const
                ).map(([label, dish]) => (
                  <div key={label} className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent">{label}</p>
                    <p className="font-display text-lg font-semibold leading-tight [overflow-wrap:anywhere]">{dish ?? "—"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-accent/50 bg-accent/5 px-3 py-2.5 text-sm text-accent">
                {t("events.dishesNotSet")}
                {canDelete && ` ${t("events.setViaEdit")}`}
              </p>
            )}
          </div>
          {canSeeFinancials && event.totalPrice && (
            <>
              <div>
                <p className="text-muted-foreground">{t("events.totalPrice")}</p>
                <p className="font-medium text-primary">{formatSom(event.totalPrice, locale)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("events.balance")}</p>
                <p className={`font-medium ${Number(event.balance) > 0 ? "text-destructive" : "text-success"}`}>
                  {formatSom(event.balance ?? "0", locale)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("events.totalExpense")}</p>
                <p className="font-medium">{formatSom(event.totalExpenses ?? "0", locale)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("events.netProfit")}</p>
                <p className={`font-medium ${Number(event.netProfit) >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatSom(event.netProfit ?? "0", locale)}
                </p>
              </div>
            </>
          )}
          {event.notes && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">{t("events.note")}</p>
              <p className="font-medium">{event.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("events.assignedWorkers")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("events.assignWorkersHint")}</p>
          <div className="flex flex-wrap gap-2">
            {event.assignments.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("events.noWorkersAssigned")}</p>
            )}
            {event.assignments.map((a) => (
              <Badge key={a.id} variant="primary" className="gap-1">
                {a.worker.fullName} · {t(`workerPositions.${a.worker.position}`)}
                <UnassignButton eventId={event.id} workerId={a.workerId} />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("shoppingLists.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(event.shoppingLists ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">{t("events.noShoppingLists")}</p>
          )}
          {(event.shoppingLists ?? []).map((list) => {
            const statusMeta = shoppingListStatusMeta(t, list.status);
            return (
            <div key={list.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{list.createdByWorker.fullName}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(list.createdAt, locale)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                  <ShoppingListPdfButton list={list} />
                </div>
              </div>
              {canSeeFinancials && isShoppingListEditable(list.status) && (
                <div className="mt-2">
                  <ShoppingListEditor list={list} />
                </div>
              )}
              <ul className="mt-2 space-y-1 text-sm">
                {list.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3">
                    <span>{item.name}</span>
                    <span className="text-right text-muted-foreground">
                      <ItemQuantity item={item} />
                      {item.isPurchased && " · ✓"}
                      {canSeeFinancials && item.isPurchased && item.unitPrice !== null && (
                        <span className="ml-2 inline-block min-w-24 font-medium text-foreground">
                          {formatSom(itemCost(item), locale)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {canSeeFinancials && shoppingLists.length > 1 && (
                <p className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
                  <span className="text-muted-foreground">{t("events.listTotal")}</span>
                  <span className="font-medium">
                    {formatSom(list.items.reduce((s, item) => s + (item.isPurchased ? itemCost(item) : 0), 0), locale)}
                  </span>
                </p>
              )}
            </div>
            );
          })}
          {canSeeFinancials && shoppingLists.length > 0 && (
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("events.shoppingTotal")}</span>
                <span className="text-lg font-semibold">{formatSom(shoppingTotal, locale)}</span>
              </div>
              {unpricedItems > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("events.unpricedItemsNote", { count: unpricedItems })}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {canSeeFinancials && (
        <Card>
          <CardHeader>
            <CardTitle>{t("events.payments")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.status === "CANCELLED" && kept > 0 && (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {t("events.cancelledUnrefunded", { amount: formatSom(kept, locale) })}
              </p>
            )}
            <div className="space-y-2">
              {(event.payments ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">{t("events.noPayments")}</p>
              )}
              {(event.payments ?? []).map((p) => {
                const isRefund = p.type === "REFUND";
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${isRefund ? "border-destructive/30 bg-destructive/5" : "border-border"}`}
                  >
                    <span className="min-w-0">
                      <span className={`font-medium tabular-nums ${isRefund ? "text-destructive" : ""}`}>
                        {isRefund ? "−" : "+"}
                        {formatSom(p.amount, locale)}
                      </span>
                      <span className="mt-0.5 block break-words text-xs text-muted-foreground">
                        {isRefund ? t("events.refundedWord") : t("events.paymentWord")} ·{" "}
                        {t(`paymentMethods.${p.method}`)}
                        {p.note && ` · ${p.note}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(p.paymentDate, locale)}</span>
                  </div>
                );
              })}
            </div>
            {refunded > 0 && (
              <div className="grid grid-cols-1 gap-2 text-center text-xs min-[420px]:grid-cols-3">
                <div className="min-w-0 rounded-lg bg-muted/60 px-2 py-2">
                  <p className="text-muted-foreground">{t("events.received")}</p>
                  <p className="break-words font-semibold tabular-nums">{formatSom(received, locale)}</p>
                </div>
                <div className="min-w-0 rounded-lg bg-destructive/10 px-2 py-2">
                  <p className="text-muted-foreground">{t("events.refundedWord")}</p>
                  <p className="break-words font-semibold tabular-nums text-destructive">−{formatSom(refunded, locale)}</p>
                </div>
                <div className="min-w-0 rounded-lg bg-muted/60 px-2 py-2">
                  <p className="text-muted-foreground">{t("events.net")}</p>
                  <p className="break-words font-semibold tabular-nums">{formatSom(kept, locale)}</p>
                </div>
              </div>
            )}
            {event.status !== "CANCELLED" && <PaymentForm eventId={event.id} />}
            {kept > 0 && (
              <details className="rounded-xl border border-border px-3 py-2" open={event.status === "CANCELLED"}>
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                  {t("events.refundDetails")}
                </summary>
                <div className="pt-3">
                  <PaymentForm eventId={event.id} mode="refund" />
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {canSeeFinancials && stockUsages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ombordan olingan mahsulotlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stockUsages.map((usage) => (
              <div key={usage.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {usage.worker.fullName}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{formatDateTime(usage.createdAt, locale)}</span>
                  </p>
                  <StockReturnButton usageId={usage.id} />
                </div>
                <ul className="mt-2 divide-y divide-border text-sm">
                  {usage.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-1.5">
                      <span className="min-w-0 truncate">
                        {item.name}{" "}
                        <span className="text-muted-foreground">
                          — {Number(item.quantity)} {UNIT_LABELS_UZ[item.unit]}
                        </span>
                      </span>
                      <span className={item.totalCost === null ? "shrink-0 text-xs text-muted-foreground" : "shrink-0 font-medium tabular-nums"}>
                        {item.totalCost === null ? "narx kiritilmagan" : formatSom(item.totalCost, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ombordan jami</span>
                <span className="text-lg font-semibold">{formatSom(stockTotal, locale)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stockUnpriced > 0 && `${stockUnpriced} ta mahsulotning ombordagi narxi kiritilmagan — ular jamiga qo'shilmagan. `}
                {hasStockExpense
                  ? "Xarajatlarda «Ombor mahsulotlari» qatori bor."
                  : "Bu summa xarajatga o'zi yozilmaydi: pastdagi «Ombor mahsulotlari» qatoridan kiriting."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {canSeeFinancials && (
        <Card>
          <CardHeader>
            <CardTitle>{t("events.expenses")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {(event.expenses ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">{t("events.noExpenses")}</p>
              )}
              {(event.expenses ?? []).map((x) => (
                <div
                  key={x.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {t(`expenseCategories.${x.category}`)}
                      {x.note && <span className="font-normal text-muted-foreground"> — {x.note}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(x.createdAt, locale)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-medium text-destructive">{formatSom(x.amount, locale)}</span>
                    {canDelete && <DeleteIconButton action={removeExpenseAction.bind(null, event.id, x.id)} />}
                  </div>
                </div>
              ))}
            </div>
            <ExpenseForm
              eventId={event.id}
              suggestedAmounts={Object.keys(suggestedAmounts).length > 0 ? suggestedAmounts : undefined}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
