import { getTr } from "@/i18n/server-tr";
import { getLocale } from "@/i18n/locale";
import { Pencil } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { EventDetail } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { formatDateTime, formatSom } from "@/lib/utils";
import { WORKER_POSITION_LABELS_UZ, EVENT_EXPENSE_CATEGORY_LABELS_UZ } from "@iqbol/shared";
import { StatusSelect } from "@/components/events/status-select";
import { UnassignButton } from "@/components/events/unassign-button";
import { PaymentForm, METHOD_LABEL } from "@/components/events/payment-form";
import { ExpenseForm } from "@/components/events/expense-form";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { ShoppingListPdfButton } from "@/components/shopping-lists/shopping-list-pdf-button";
import { ShoppingListEditor } from "@/components/shopping-lists/shopping-list-editor";
import { ItemQuantity } from "@/components/shopping-lists/item-quantity";
import { SHOPPING_LIST_STATUS_UZ, isShoppingListEditable } from "@/lib/shopping-list-status";
import { removeExpenseAction } from "@/lib/actions/events.actions";

export default async function EventDetailPage({ params }: PageProps<"/dashboard/events/[id]">) {
  const tr = await getTr();
  const locale = await getLocale();

  const { id } = await params;
  const [event, session] = await Promise.all([apiFetch<EventDetail>(`/events/${id}`), getSession()]);

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
  const received = (event.payments ?? []).filter((p) => p.type !== "REFUND").reduce((s, p) => s + Number(p.amount), 0);
  const refunded = (event.payments ?? []).filter((p) => p.type === "REFUND").reduce((s, p) => s + Number(p.amount), 0);
  const kept = received - refunded;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{event.clientName}</h1>
          <p className="text-sm text-muted-foreground">{event.clientPhone}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <LinkButton href={`/dashboard/events/${event.id}/edit`} variant="outline" size="sm">
              <Pencil className="h-4 w-4" />  {tr("Tahrirlash")}
            </LinkButton>
          )}
          {canDelete && <DeleteEventButton eventId={event.id} clientName={event.clientName} />}
          <StatusSelect eventId={event.id} status={event.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tr("To'y ma'lumotlari")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">{tr("Sana")}</p>
            <p className="font-medium">{formatDateTime(event.eventDate, locale)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{tr("Menyu")}</p>
            <p className="font-medium">{event.menu.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{tr("Mehmonlar soni")}</p>
            <p className="font-medium">{event.guestCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{tr("Stol turi")}</p>
            <p className="font-medium">{tr(`${event.tableCapacity} kishilik`)}</p>
          </div>
          <div className="sm:col-span-2">
            {event.firstDish || event.secondDish ? (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    [tr("1-ovqat"), event.firstDish],
                    [tr("2-ovqat"), event.secondDish],
                  ] as const
                ).map(([label, dish]) => (
                  <div key={label} className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent">{label}</p>
                    <p className="font-display text-lg font-semibold">{dish ?? "—"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-accent/50 bg-accent/5 px-3 py-2.5 text-sm text-accent">
                
                {tr("1-ovqat va 2-ovqat hali tanlanmagan — oshpaz bozorlikni shunga qarab yozadi.")}
                {canDelete && tr(" \"Tahrirlash\" orqali belgilang.")}
              </p>
            )}
          </div>
          {canSeeFinancials && event.totalPrice && (
            <>
              <div>
                <p className="text-muted-foreground">{tr("Umumiy narx")}</p>
                <p className="font-medium text-primary">{formatSom(event.totalPrice, locale)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{tr("Qoldiq balans")}</p>
                <p className={`font-medium ${Number(event.balance) > 0 ? "text-destructive" : "text-success"}`}>
                  {formatSom(event.balance ?? "0", locale)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{tr("Jami xarajat")}</p>
                <p className="font-medium">{formatSom(event.totalExpenses ?? "0", locale)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{tr("Sof foyda")}</p>
                <p className={`font-medium ${Number(event.netProfit) >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatSom(event.netProfit ?? "0", locale)}
                </p>
              </div>
            </>
          )}
          {event.notes && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">{tr("Izoh")}</p>
              <p className="font-medium">{event.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("Tayinlangan ishchilar")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            
            {tr("Ishchilarni belgilash uchun \"Ishchilar\" bo'limidagi \"Ertangi kunga\r\n            chiqadiganlar\" jadvalidan foydalaning.")}
          </p>
          <div className="flex flex-wrap gap-2">
            {event.assignments.length === 0 && (
              <p className="text-sm text-muted-foreground">{tr("Hali hech kim tayinlanmagan.")}</p>
            )}
            {event.assignments.map((a) => (
              <Badge key={a.id} variant="primary" className="gap-1">
                {a.worker.fullName} · {tr(WORKER_POSITION_LABELS_UZ[a.worker.position])}
                <UnassignButton eventId={event.id} workerId={a.workerId} />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("Bozorlik ro'yxatlari")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(event.shoppingLists ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">{tr("Bu to'y uchun hali bozorlik ro'yxati yozilmagan.")}</p>
          )}
          {(event.shoppingLists ?? []).map((list) => (
            <div key={list.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{list.createdByWorker.fullName}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(list.createdAt, locale)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={SHOPPING_LIST_STATUS_UZ[list.status]?.variant ?? "primary"}>
                    {tr(SHOPPING_LIST_STATUS_UZ[list.status]?.label) ?? list.status}
                  </Badge>
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
                  <span className="text-muted-foreground">{tr("Ro'yxat jami")}</span>
                  <span className="font-medium">
                    {formatSom(list.items.reduce((s, item) => s + (item.isPurchased ? itemCost(item) : 0), 0), locale)}
                  </span>
                </p>
              )}
            </div>
          ))}
          {canSeeFinancials && shoppingLists.length > 0 && (
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{tr("Bozorlik jami")}</span>
                <span className="text-lg font-semibold">{formatSom(shoppingTotal, locale)}</span>
              </div>
              {unpricedItems > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {unpricedItems}  {tr("ta mahsulot hali sotib olinmagan yoki narxi kiritilmagan — jamiga qo'shilmagan.")}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {canSeeFinancials && (
        <Card>
          <CardHeader>
            <CardTitle>{tr("To'lovlar")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.status === "CANCELLED" && kept > 0 && (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                
                {tr("To'y bekor qilingan, mijozdan olingan")} {formatSom(kept, locale)}  {tr("hali qaytarilmagan. Pul qaytarilgan bo'lsa,\r\n                pastdagi \"Pulni qaytarish\" orqali yozing — shu to'y kunidan ayriladi.")}
              </p>
            )}
            <div className="space-y-2">
              {(event.payments ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">{tr("To'lovlar hali kiritilmagan.")}</p>
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
                      <span className="ml-2 text-xs text-muted-foreground">
                        {isRefund ? tr("Qaytarildi") : tr("To'lov")} · {tr(METHOD_LABEL[p.method]) ?? p.method}
                        {p.note && ` · ${p.note}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(p.paymentDate, locale)}</span>
                  </div>
                );
              })}
            </div>
            {refunded > 0 && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-muted/60 px-2 py-2">
                  <p className="text-muted-foreground">{tr("Olindi")}</p>
                  <p className="font-semibold tabular-nums">{formatSom(received, locale)}</p>
                </div>
                <div className="rounded-lg bg-destructive/10 px-2 py-2">
                  <p className="text-muted-foreground">{tr("Qaytarildi")}</p>
                  <p className="font-semibold tabular-nums text-destructive">−{formatSom(refunded, locale)}</p>
                </div>
                <div className="rounded-lg bg-muted/60 px-2 py-2">
                  <p className="text-muted-foreground">{tr("Sof")}</p>
                  <p className="font-semibold tabular-nums">{formatSom(kept, locale)}</p>
                </div>
              </div>
            )}
            {event.status !== "CANCELLED" && <PaymentForm eventId={event.id} />}
            {kept > 0 && (
              <details className="rounded-xl border border-border px-3 py-2" open={event.status === "CANCELLED"}>
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">{tr("Pulni qaytarish (vozvrat)")}</summary>
                <div className="pt-3">
                  <PaymentForm eventId={event.id} mode="refund" />
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {canSeeFinancials && (
        <Card>
          <CardHeader>
            <CardTitle>{tr("Xarajatlar")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {(event.expenses ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">{tr("Xarajatlar hali kiritilmagan.")}</p>
              )}
              {(event.expenses ?? []).map((x) => (
                <div
                  key={x.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {tr(EVENT_EXPENSE_CATEGORY_LABELS_UZ[x.category])}
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
              suggestedAmounts={!hasShoppingExpense && shoppingTotal > 0 ? { SHOPPING: shoppingTotal } : undefined}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
