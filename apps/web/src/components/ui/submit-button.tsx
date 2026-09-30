"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useFormStatus } from "react-dom";
import { Button, ButtonProps } from "./button";

export function SubmitButton({ children, pendingText = "Saqlanmoqda...", ...props }: ButtonProps & { pendingText?: string }) {
  const tr = useTr();
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? tr(pendingText) : children}
    </Button>
  );
}
