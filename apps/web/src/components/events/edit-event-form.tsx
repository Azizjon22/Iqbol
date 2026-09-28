"use client";

import { startTransition, useActionState } from "react";
import { updateEventAction, type FormActionState } from "@/lib/actions/events.actions";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import { MenuAndDishes } from "@/components/events/menu-and-dishes";
import { Button } from "@/components/ui/button";
import type { EventDetail, Menu } from "@/lib/types";

const initialState: FormActionState = undefined;

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditEventForm({ event, menus, canSetDishes }: { event: EventDetail; menus: Menu[]; canSetDishes: boolean }) {
  const action = updateEventAction.bind(null, event.id);
  const [state, formAction, isPending] = useActionState(action, initialState);

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
          <Label htmlFor="clientName">Mijoz ismi</Label>
          <Input id="clientName" name="clientName" defaultValue={event.clientName} required />
        </div>
        <div>
          <Label htmlFor="clientPhone">Mijoz telefoni</Label>
          <Input id="clientPhone" name="clientPhone" defaultValue={event.clientPhone} placeholder="+998901234567" required />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="eventDate">Sana va vaqt</Label>
          <Input
            id="eventDate"
            name="eventDate"
            type="datetime-local"
            defaultValue={toDateTimeLocalValue(event.eventDate)}
            required
          />
        </div>
        <div>
          <Label htmlFor="guestCount">Mehmonlar soni</Label>
          <Input id="guestCount" name="guestCount" type="number" min={1} defaultValue={event.guestCount} required />
        </div>
        <div>
          <Label htmlFor="tableCapacity">Stol turi</Label>
          <Select id="tableCapacity" name="tableCapacity" defaultValue={String(event.tableCapacity)} required>
            <option value="10">10 kishilik</option>
            <option value="12">12 kishilik</option>
          </Select>
        </div>
      </div>

      <MenuAndDishes
        menus={menus}
        defaultMenuId={event.menuId}
        defaultFirst={event.firstDish}
        defaultSecond={event.secondDish}
        canSetDishes={canSetDishes}
      />

      <div>
        <Label htmlFor="notes">Izoh (ixtiyoriy)</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={event.notes ?? ""} />
      </div>

      <FieldError>{state?.error}</FieldError>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saqlanmoqda..." : <>O&apos;zgarishlarni saqlash</>}
      </Button>
    </form>
  );
}
