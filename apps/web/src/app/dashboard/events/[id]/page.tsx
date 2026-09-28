import { Pencil } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { EventDetail } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { formatDateTime, formatSom } from "@/lib/utils";
import { WORKER_POSITION_LABELS_UZ, EVENT_EXPENSE_CATEGORY_LABELS_UZ } from "@shodiyora/shared";
import { StatusSelect } from "@/components/events/status-select";
import { UnassignButton } from "@/components/events/unassign-button";
import { PaymentForm } from "@/components/events/payment-form";
import { ExpenseForm } from "@/components/events/expense-form";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { ShoppingListPdfButton } from "@/components/shopping-lists/shopping-list-pdf-button";
import { ShoppingListEditor } from "@/components/shopping-lists/shopping-list-editor";
import { ItemQuantity } from "@/components/shopping-lists/item-quantity";
import { SHOPPING_LIST_STATUS_UZ, isShoppingListEditable } from "@/lib/shopping-list-status";
import { removeExpenseAction } from "@/lib/actions/events.actions";

export default async function EventDetailPage({ params }: PageProps<"/dashboard/events/[id]">) {
  const { id } = await params;
  const [event, session] = await Promise.all([apiFetch<EventDetail>(`/events/${id}`), getSession()]);

  const role = session?.user.kind === "STAFF" ? session.user.role : undefined;
  const canSeeFinancials = role === "SUPER_ADMIN";
  const canEdit = role === "SUPER_ADMIN" || role === "ADMIN";
  const canDelete = role === "SUPER_ADMIN";

  // unitPrice is per unit (kg, litr, dona) — same maths as the API's expense report.
  const itemCost = (item: { unitPrice: string | null; quantity: string }) =>
    item.unitPrice === null ? 0 : Number(item.unitPrice) * Number(item.quantity);
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
              <Pencil className="h-4 w-4" /> Tahrirlash
            </LinkButton>
          )}
          {canDelete && <DeleteEventButton eventId={event.id} clientName={event.clientName} />}
          <StatusSelect eventId={event.id} status={event.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>To&apos;y ma&apos;lumotlari</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Sana</p>
            <p className="font-medium">{formatDateTime(event.eventDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Menyu</p>
            <p className="font-medium">{event.menu.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Mehmonlar soni</p>
            <p className="font-medium">{event.guestCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Stol turi</p>
            <p className="font-medium">{event.tableCapacity} kishilik</p>
          </div>
          <div className="sm:col-span-2">
            {event.firstDish || event.secondDish ? (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["1-ovqat", event.firstDish],
                    ["2-ovqat", event.secondDish],
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
                1-ovqat va 2-ovqat hali tanlanmagan — oshpaz bozorlikni shunga qarab yozadi.
                {canDelete && " \"Tahrirlash\" orqali belgilang."}
              </p>
            )}
          </div>
          {canSeeFinancials && event.totalPrice && (
            <>
              <div>
                <p className="text-muted-foreground">Umumiy narx</p>
                <p className="font-medium text-primary">{formatSom(event.totalPrice)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Qoldiq balans</p>
                <p className={`font-medium ${Number(event.balance) > 0 ? "text-destructive" : "text-success"}`}>
                  {formatSom(event.balance ?? "0")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Jami xarajat</p>
                <p className="font-medium">{formatSom(event.totalExpenses ?? "0")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sof foyda</p>
                <p className={`font-medium ${Number(event.netProfit) >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatSom(event.netProfit ?? "0")}
                </p>
              </div>
            </>
          )}
          {event.notes && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Izoh</p>
              <p className="font-medium">{event.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tayinlangan ishchilar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Ishchilarni belgilash uchun &quot;Ishchilar&quot; bo&apos;limidagi &quot;Ertangi kunga
            chiqadiganlar&quot; jadvalidan foydalaning.
          </p>
          <div className="flex flex-wrap gap-2">
            {event.assignments.length === 0 && (
              <p className="text-sm text-muted-foreground">Hali hech kim tayinlanmagan.</p>
            )}
            {event.assignments.map((a) => (
              <Badge key={a.id} variant="primary" className="gap-1">
                {a.worker.fullName} · {WORKER_POSITION_LABELS_UZ[a.worker.position]}
                <UnassignButton eventId={event.id} workerId={a.workerId} />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bozorlik ro&apos;yxatlari</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(event.shoppingLists ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Bu to&apos;y uchun hali bozorlik ro&apos;yxati yozilmagan.</p>
          )}
          {(event.shoppingLists ?? []).map((list) => (
            <div key={list.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{list.createdByWorker.fullName}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(list.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={SHOPPING_LIST_STATUS_UZ[list.status]?.variant ?? "primary"}>
                    {SHOPPING_LIST_STATUS_UZ[list.status]?.label ?? list.status}
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
                          {formatSom(itemCost(item))}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {canSeeFinancials && shoppingLists.length > 1 && (
                <p className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
                  <span className="text-muted-foreground">Ro&apos;yxat jami</span>
                  <span className="font-medium">
                    {formatSom(list.items.reduce((s, item) => s + (item.isPurchased ? itemCost(item) : 0), 0))}
                  </span>
                </p>
              )}
            </div>
          ))}
          {canSeeFinancials && shoppingLists.length > 0 && (
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bozorlik jami</span>
                <span className="text-lg font-semibold">{formatSom(shoppingTotal)}</span>
              </div>
              {unpricedItems > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {unpricedItems} ta mahsulot hali sotib olinmagan yoki narxi kiritilmagan — jamiga qo&apos;shilmagan.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {canSeeFinancials && (
        <Card>
          <CardHeader>
            <CardTitle>To&apos;lovlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {(event.payments ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">To&apos;lovlar hali kiritilmagan.</p>
              )}
              {(event.payments ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{formatSom(p.amount)}</span>
                  <span className="text-muted-foreground">{formatDateTime(p.paymentDate)}</span>
                </div>
              ))}
            </div>
            <PaymentForm eventId={event.id} />
          </CardContent>
        </Card>
      )}

      {canSeeFinancials && (
        <Card>
          <CardHeader>
            <CardTitle>Xarajatlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {(event.expenses ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Xarajatlar hali kiritilmagan.</p>
              )}
              {(event.expenses ?? []).map((x) => (
                <div
                  key={x.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {EVENT_EXPENSE_CATEGORY_LABELS_UZ[x.category]}
                      {x.note && <span className="font-normal text-muted-foreground"> — {x.note}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(x.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-medium text-destructive">{formatSom(x.amount)}</span>
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
