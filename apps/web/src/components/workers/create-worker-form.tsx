"use client";

import { useActionState, useEffect, useState } from "react";
import { WORKER_GENDERS, WORKER_POSITIONS } from "@iqbol/shared";
import { createWorkerByStaffAction, type FormActionState } from "@/lib/actions/workers.actions";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { UploadField } from "@/components/uploads/upload-field";
import { useT } from "@/components/i18n/locale-provider";

const initialState: FormActionState = undefined;

export function CreateWorkerForm({ onSuccess }: { onSuccess?: () => void }) {
  const t = useT();
  const [state, formAction] = useActionState(createWorkerByStaffAction, initialState);
  const [position, setPosition] = useState<(typeof WORKER_POSITIONS)[number]>("WAITER_MALE");
  const needsPin = position === "CHEF";

  useEffect(() => {
    if (state?.success) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="fullName">{t("workers.fullName")}</Label>
        <Input id="fullName" name="fullName" required />
      </div>
      <div>
        <Label htmlFor="phone">{t("workers.phone")}</Label>
        <Input id="phone" name="phone" placeholder="+998901234567" required />
      </div>
      <div>
        <Label htmlFor="position">{t("workers.position")}</Label>
        <Select
          id="position"
          name="position"
          value={position}
          onChange={(e) => setPosition(e.target.value as typeof position)}
        >
          {WORKER_POSITIONS.map((p) => (
            <option key={p} value={p}>
              {t(`workerPositions.${p}`)}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="gender">{t("workers.gender")}</Label>
        <Select id="gender" name="gender" defaultValue="MALE" required>
          {WORKER_GENDERS.map((g) => (
            <option key={g} value={g}>
              {t(`workerGenders.${g}`)}
            </option>
          ))}
        </Select>
      </div>
      {needsPin && (
        <div>
          <Label htmlFor="pin">{t("workers.pin")}</Label>
          <Input id="pin" name="pin" inputMode="numeric" maxLength={4} placeholder="****" required />
        </div>
      )}
      <div className="sm:col-span-2">
        <UploadField name="photoUrl" label={t("workers.photo")} folder="workers" aspect="square" />
      </div>
      <div className="sm:col-span-2">
        <FieldError>{state?.error}</FieldError>
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pendingText={t("workers.submitting")} className="w-full sm:w-auto">
          {t("workers.submit")}
        </SubmitButton>
      </div>
    </form>
  );
}
