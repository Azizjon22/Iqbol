"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { startTransition, useActionState } from "react";
import { createEventAction, type FormActionState } from "@/lib/actions/events.actions";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import { MenuAndDishes } from "@/components/events/menu-and-dishes";
import { Button } from "@/components/ui/button";
import type { Menu } from "@/lib/types";

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
  const tr = useTr();

  const [state, formAction, isPending] = useActionState(createEventAction, initialState);
  const defaultDateTime = defaultDate ? `${defaultDate}T18:00` : undefined;

  return (
    <form suppressHydrationWarning
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        <div>
          <Label htmlFor="clientName">{tr("Mijoz ismi")}</Label>
          <Input id="clientName" name="clientName" required />
        </div>
        <div>
          <Label htmlFor="clientPhone">{tr("Mijoz telefoni")}</Label>
          <Input id="clientPhone" name="clientPhone" placeholder="+998901234567" required />
        </div>
      </div>

      {/* Two columns on tablets (date gets a full row), three only when wide. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        <div className="sm:col-span-2 xl:col-span-1">
          <Label htmlFor="eventDate">{tr("Sana va vaqt")}</Label>
          <Input id="eventDate" name="eventDate" type="datetime-local" defaultValue={defaultDateTime} required />
        </div>
        <div>
          <Label htmlFor="guestCount">{tr("Mehmonlar soni")}</Label>
          <Input id="guestCount" name="guestCount" type="number" min={1} required />
        </div>
        <div>
          <Label htmlFor="tableCapacity">{tr("Stol turi")}</Label>
          <Select id="tableCapacity" name="tableCapacity" required>
            <option value="10">{tr("10 kishilik")}</option>
            <option value="12">{tr("12 kishilik")}</option>
          </Select>
        </div>
      </div>

      <MenuAndDishes menus={menus} canSetDishes={canSetDishes} />

      <div>
        <Label htmlFor="notes">{tr("Izoh (ixtiyoriy)")}</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>

      <FieldError>{state?.error}</FieldError>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Yaratilmoqda..." : <>{tr("To'yni yaratish")}</>}
      </Button>
    </form>
  );
}
