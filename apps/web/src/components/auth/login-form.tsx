"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginStaffAction, loginWorkerAction, type AuthActionState } from "@/lib/actions/auth.actions";
import { Input, PasswordInput, Label, FieldError } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

const initialState: AuthActionState = undefined;

export function LoginForm() {
  const [mode, setMode] = useState<"staff" | "worker">("staff");
  const [staffState, staffFormAction] = useActionState(loginStaffAction, initialState);
  const [workerState, workerFormAction] = useActionState(loginWorkerAction, initialState);
  const t = useT();

  // Controlled so a failed attempt doesn't wipe what was typed — React
  // resets a <form action> after the action settles (even on a returned
  // error, not just success), which would otherwise erase the phone/PIN
  // the person needs to see to spot their own typo.
  const [staffPhone, setStaffPhone] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [workerPin, setWorkerPin] = useState("");

  return (
    <div className="w-full max-w-sm">
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher />
      </div>
      <div className="mb-6 grid grid-cols-2 rounded-xl border border-border bg-muted p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("staff")}
          className={cn(
            "rounded-lg py-2 transition-colors",
            mode === "staff" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {t("authExtra.staffTab")}
        </button>
        <button
          type="button"
          onClick={() => setMode("worker")}
          className={cn(
            "rounded-lg py-2 transition-colors",
            mode === "worker" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {t("authExtra.chefTab")}
        </button>
      </div>

      {mode === "staff" ? (
        <form action={staffFormAction} className="space-y-4">
          <div>
            <Label htmlFor="phone">{t("authExtra.phoneLabel")}</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="+998901234567"
              required
              autoComplete="tel"
              value={staffPhone}
              onChange={(e) => setStaffPhone(e.target.value)}
              className={cn(staffState?.error && "border-destructive")}
            />
          </div>
          <div>
            <Label htmlFor="password">{t("auth.password")}</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="current-password"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              className={cn(staffState?.error && "border-destructive")}
            />
          </div>
          <FieldError>{staffState?.error}</FieldError>
          <SubmitButton className="w-full" pendingText={t("authExtra.loggingIn")}>
            {t("auth.login")}
          </SubmitButton>
        </form>
      ) : (
        <form action={workerFormAction} className="space-y-4">
          <div>
            <Label htmlFor="worker-phone">{t("authExtra.phoneLabel")}</Label>
            <Input
              id="worker-phone"
              name="phone"
              placeholder="+998901234567"
              required
              autoComplete="tel"
              value={workerPhone}
              onChange={(e) => setWorkerPhone(e.target.value)}
              className={cn(workerState?.error && "border-destructive")}
            />
          </div>
          <div>
            <Label htmlFor="pin">{t("auth.pin")}</Label>
            <Input
              id="pin"
              name="pin"
              inputMode="numeric"
              maxLength={4}
              placeholder="****"
              required
              value={workerPin}
              onChange={(e) => setWorkerPin(e.target.value)}
              className={cn(workerState?.error && "border-destructive")}
            />
          </div>
          <FieldError>{workerState?.error}</FieldError>
          <SubmitButton className="w-full" pendingText={t("authExtra.loggingIn")}>
            {t("auth.login")}
          </SubmitButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("authExtra.newWorker")}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t("authExtra.registerLink")}
        </Link>
      </p>
    </div>
  );
}
