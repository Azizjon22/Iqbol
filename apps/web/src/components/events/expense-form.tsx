"use client";

import { useActionState, useEffect, useRef } from "react";
import { EVENT_EXPENSE_CATEGORIES, EVENT_EXPENSE_CATEGORY_LABELS_UZ, type EventExpenseCategory } from "@iqbol/shared";
import { addExpenseAction, type FormActionState } from "@/lib/actions/events.actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: FormActionState = undefined;

function ExpenseRow({
  eventId,
  category,
  suggestedAmount,
}: {
  eventId: string;
  category: EventExpenseCategory;
  suggestedAmount?: number;
}) {
  const action = addExpenseAction.bind(null, eventId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2.5"
    >
      <input type="hidden" name="category" value={category} />
      <span className="w-36 shrink-0 text-sm font-medium">{EVENT_EXPENSE_CATEGORY_LABELS_UZ[category]}</span>
      <Input
        type="number"
        name="amount"
        min={1}
        placeholder="Summa"
        defaultValue={suggestedAmount}
        className="h-9 min-w-28 flex-1"
        required
      />
      <Input
        name="note"
        placeholder="Izoh (ixtiyoriy)"
        defaultValue={suggestedAmount ? "Bozorlik ro'yxatlari bo'yicha" : undefined}
        className="h-9 min-w-28 flex-1"
      />
      <SubmitButton pendingText="Qo'shilmoqda..." size="sm" variant="outline" className="shrink-0">
        Qo&apos;shish
      </SubmitButton>
      {state?.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

/** suggestedAmounts pre-fills a row, e.g. SHOPPING with the purchased lists' total. */
export function ExpenseForm({
  eventId,
  suggestedAmounts,
}: {
  eventId: string;
  suggestedAmounts?: Partial<Record<EventExpenseCategory, number>>;
}) {
  return (
    <div className="space-y-2">
      {EVENT_EXPENSE_CATEGORIES.map((category) => (
        <ExpenseRow
          key={`${category}-${suggestedAmounts?.[category] ?? ""}`}
          eventId={eventId}
          category={category}
          suggestedAmount={suggestedAmounts?.[category]}
        />
      ))}
    </div>
  );
}
