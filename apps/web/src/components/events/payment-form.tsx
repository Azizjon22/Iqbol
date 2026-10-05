"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { startTransition, useActionState, useEffect, useRef } from "react";
import { PAYMENT_METHODS } from "@iqbol/shared";
import { addPaymentAction, addRefundAction, type FormActionState } from "@/lib/actions/events.actions";
import { Input, Select, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { METHOD_LABEL } from "@/lib/payment-methods";
const initialState: FormActionState = undefined;

/**
 * Payment in, or refund out (mode="refund"). Submitted via onSubmit so a
 * server-side refusal (e.g. "exceeds the remaining balance") keeps the input.
 */
export function PaymentForm({ eventId, mode = "payment" }: { eventId: string; mode?: "payment" | "refund" }) {
  const tr = useTr();

  const refund = mode === "refund";
  const action = (refund ? addRefundAction : addPaymentAction).bind(null, eventId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  // Clear only after a successful save.
  useEffect(() => {
    if (submitted.current && !isPending && !state?.error) formRef.current?.reset();
    if (!isPending) submitted.current = false;
  }, [isPending, state]);

  return (
    <form suppressHydrationWarning
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        submitted.current = true;
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <Label htmlFor={`${mode}-amount`}>{refund ? "Qaytariladigan summa" : tr("Summa (so'm)")}</Label>
        <Input id={`${mode}-amount`} name="amount" type="number" min={1} required />
      </div>
      <div>
        <Label htmlFor={`${mode}-method`}>{tr("Usul")}</Label>
        <Select id={`${mode}-method`} name="method" className="sm:w-36">
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {tr(METHOD_LABEL[m])}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex-1">
        <Label htmlFor={`${mode}-note`}>{tr("Izoh")}</Label>
        <Input id={`${mode}-note`} name="note" placeholder={refund ? tr("masalan: to'y bekor qilindi, zaklad qaytarildi") : undefined} />
      </div>
      <Button type="submit" variant={refund ? "destructive" : "primary"} disabled={isPending}>
        {isPending ? tr("Saqlanmoqda...") : refund ? tr("Pulni qaytarish") : tr("To'lov qo'shish")}
      </Button>
      <FieldError>{state?.error}</FieldError>
    </form>
  );
}
