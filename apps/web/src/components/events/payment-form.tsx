"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { PAYMENT_METHODS } from "@iqbol/shared";
import { addPaymentAction, addRefundAction, type FormActionState } from "@/lib/actions/events.actions";
import { Input, Select, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/locale-provider";

const initialState: FormActionState = undefined;

/**
 * Payment in, or refund out (mode="refund"). Submitted via onSubmit so a
 * server-side refusal (e.g. "exceeds the remaining balance") keeps the input.
 */
export function PaymentForm({ eventId, mode = "payment" }: { eventId: string; mode?: "payment" | "refund" }) {
  const t = useT();
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
    <form
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
        <Label htmlFor={`${mode}-amount`}>{refund ? t("events.refundAmount") : t("events.amountSom")}</Label>
        <Input id={`${mode}-amount`} name="amount" type="number" min={1} required />
      </div>
      <div>
        <Label htmlFor={`${mode}-method`}>{t("events.method")}</Label>
        <Select id={`${mode}-method`} name="method" className="sm:w-36">
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {t(`paymentMethods.${m}`)}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex-1">
        <Label htmlFor={`${mode}-note`}>{t("events.note")}</Label>
        <Input id={`${mode}-note`} name="note" placeholder={refund ? t("events.refundNotePlaceholder") : undefined} />
      </div>
      <Button type="submit" variant={refund ? "destructive" : "primary"} disabled={isPending}>
        {isPending ? t("common.saving") : refund ? t("events.refundSubmit") : t("events.paymentSubmit")}
      </Button>
      <FieldError>{state?.error}</FieldError>
    </form>
  );
}
