"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTr } from "@/components/i18n/locale-provider";

/** "1250000" -> "1 250 000". */
export function groupDigits(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * A sum in so'm that groups its digits while you type (500 000, 1 250 000),
 * so a missing or extra zero is easy to spot. `value` / `onValueChange`
 * carry the plain digits.
 */
export const MoneyInput = forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
    value: string;
    onValueChange: (digits: string) => void;
  }
>(function MoneyInput({ value, onValueChange, className, ...rest }, ref) {
  const tr = useTr();
  return (
    <div className="relative">
      <Input
        ref={ref}
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={groupDigits(value)}
        onChange={(e) => onValueChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12))}
        className={cn("pr-12 text-base font-semibold tabular-nums tracking-wide", className)}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{tr("so'm")}</span>
    </div>
  );
});
