"use client";

import { startTransition, useActionState } from "react";
import { createEventAction, type FormActionState } from "@/lib/actions/events.actions";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import { MenuAndDishes } from "@/components/events/menu-and-dishes";
import { Button } from "@/components/ui/button";
import type { Menu } from "@/lib/types";
import { useT } from "@/components/i18n/locale-provider";

const initialState: FormActionState = undefined;

export function CreateEventForm({
  menus,
  defaultDate,
  canSetDishes,
}: {
  menus: Menu[];
  defaultDate?: string;
  canSetDishes: boolean;
}) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(createEventAction, initialState);
  const defaultDateTime = defaultDate ? `${defaultDate}T18:00` : undefined;

  return (
    <form
      // onSubmit + formAction instead of action={formAction}: React resets an
      // action-bound form after every submit, wiping everything the user typed
      // whenever the server sends back a validation error.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="clientName">{t("events.clientName")}</Label>
          <Input id="clientName" name="clientName" required />
        </div>
        <div>
          <Label htmlFor="clientPhone">{t("events.clientPhone")}</Label>
          <Input id="clientPhone" name="clientPhone" placeholder="+998901234567" required />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="eventDate">{t("events.dateTime")}</Label>
          <Input id="eventDate" name="eventDate" type="datetime-local" defaultValue={defaultDateTime} required />
        </div>
        <div>
          <Label htmlFor="guestCount">{t("events.guestCountLabel")}</Label>
          <Input id="guestCount" name="guestCount" type="number" min={1} max={400} required />
        </div>
        <div>
          <Label htmlFor="tableCapacity">{t("events.tableType")}</Label>
          <Select id="tableCapacity" name="tableCapacity" required>
            <option value="10">{t("events.seatsOption", { count: 10 })}</option>
            <option value="12">{t("events.seatsOption", { count: 12 })}</option>
          </Select>
        </div>
      </div>

      <MenuAndDishes menus={menus} canSetDishes={canSetDishes} />

      <div>
        <Label htmlFor="notes">{t("events.notesOptional")}</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>

      <FieldError>{state?.error}</FieldError>
      <Button type="submit" disabled={isPending}>
        {isPending ? t("events.creating") : t("events.createSubmit")}
      </Button>
    </form>
  );
}
