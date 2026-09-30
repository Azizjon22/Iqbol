"use client";

import { InputHTMLAttributes, forwardRef, useId } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

/** An iOS-style on/off toggle (green, with a check/cross icon riding the knob). */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, id, disabled, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;

    return (
      <span className={cn("inline-flex items-center gap-2.5", className)}>
        <label htmlFor={inputId} className="switch">
          <input ref={ref} id={inputId} type="checkbox" disabled={disabled} {...props} />
          <span className="slider">
            <span className="circle">
              <X className="cross" strokeWidth={3} />
              <Check className="checkmark" strokeWidth={3} />
            </span>
          </span>
        </label>
        {label && (
          <label htmlFor={inputId} className="cursor-pointer select-none text-sm text-foreground">
            {label}
          </label>
        )}
      </span>
    );
  },
);
Switch.displayName = "Switch";
