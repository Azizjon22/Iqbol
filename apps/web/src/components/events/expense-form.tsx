"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { EVENT_EXPENSE_CATEGORIES, EVENT_EXPENSE_CATEGORY_LABELS_UZ, type EventExpenseCategory } from "@iqbol/shared";
import { addExpenseAction, type FormActionState } from "@/lib/actions/events.actions";
import { useTr } from "@/components/i18n/locale-provider";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const initialState: FormActionState = undefined;

/** suggestedAmounts pre-fills shopping when the purchased lists have a total. */
export function ExpenseForm({
  eventId,
  suggestedAmounts,
}: {
  eventId: string;
  suggestedAmounts?: Partial<Record<EventExpenseCategory, number>>;
}) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<EventExpenseCategory>("SHOPPING");
  const action = addExpenseAction.bind(null, eventId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const wasPending = useRef(false);

  const suggested = suggestedAmounts?.[category];

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setOpen(false);
      setCategory("SHOPPING");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setCategory("SHOPPING");
          setOpen(true);
        }}
      >
        <Plus className="h-4 w-4" /> {tr("Xarajat qo'shish")}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={tr("Xarajat qo'shish")}
        size="sm"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              {tr("Bekor qilish")}
            </Button>
            <Button type="submit" form="add-expense" disabled={isPending}>
              {isPending ? tr("Qo'shilmoqda...") : tr("Qo'shish")}
            </Button>
          </>
        }
      >
        <form id="add-expense" action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="expense-category">{tr("Turkum")}</Label>
            <Select
              id="expense-category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as EventExpenseCategory)}
            >
              {EVENT_EXPENSE_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {tr(EVENT_EXPENSE_CATEGORY_LABELS_UZ[item])}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="expense-amount">{tr("Summa")}</Label>
            <Input
              id="expense-amount"
              type="number"
              name="amount"
              min={1}
              required
              key={`amount-${category}-${suggested ?? ""}`}
              defaultValue={suggested}
            />
          </div>
          <div>
            <Label htmlFor="expense-note">{tr("Izoh (ixtiyoriy)")}</Label>
            <Input
              id="expense-note"
              name="note"
              key={`note-${category}-${suggested ?? ""}`}
              defaultValue={category === "SHOPPING" && suggested ? tr("Bozorlik ro'yxatlari bo'yicha") : undefined}
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </form>
      </Modal>
    </>
  );
}
