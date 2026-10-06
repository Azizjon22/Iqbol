"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useActionState } from "react";
import { changeWorkerPinAction, logoutAction, type AuthActionState } from "@/lib/actions/auth.actions";
import { Input, Label, FieldError } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthActionState = undefined;

export function ChangePinForm() {
  const tr = useTr();

  const [state, formAction] = useActionState(changeWorkerPinAction, initialState);

  return (
    <div className="w-full max-w-sm">
      <form suppressHydrationWarning action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="currentPin">{tr("Joriy PIN (admin bergan)")}</Label>
          <Input id="currentPin" name="currentPin" inputMode="numeric" maxLength={4} placeholder="****" required />
        </div>
        <div>
          <Label htmlFor="newPin">{tr("Yangi PIN")}</Label>
          <Input id="newPin" name="newPin" inputMode="numeric" maxLength={4} placeholder="****" required />
        </div>
        <div>
          <Label htmlFor="confirmPin">{tr("Yangi PIN-ni tasdiqlang")}</Label>
          <Input id="confirmPin" name="confirmPin" inputMode="numeric" maxLength={4} placeholder="****" required />
        </div>
        <FieldError>{state?.error}</FieldError>
        <SubmitButton className="w-full" pendingText={tr("Saqlanmoqda...")}>
          PIN-ni saqlash va davom etish
        </SubmitButton>
      </form>
      <form suppressHydrationWarning action={logoutAction} className="mt-4 text-center">
        <button type="submit" className="text-sm text-muted-foreground hover:underline">
          
          {tr("Chiqish")}
        </button>
      </form>
    </div>
  );
}
