"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createEventSchema,
  updateEventSchema,
  createPaymentSchema,
  createEventExpenseSchema,
} from "@shodiyora/shared";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/errors";

export type FormActionState = { error?: string } | undefined;

/**
 * SUPER_ADMIN's form carries the couple's 1st/2nd dish (both required);
 * other roles never send them — the API refuses them from anyone else.
 */
function readDishes(formData: FormData): { error?: string; dishes?: { firstDish: string; secondDish: string } } {
  if (formData.get("canSetDishes") !== "1") return {};
  const firstDish = String(formData.get("firstDish") ?? "").trim();
  const secondDish = String(formData.get("secondDish") ?? "").trim();
  if (!firstDish) return { error: "1-ovqatni tanlang" };
  if (!secondDish) return { error: "2-ovqatni tanlang" };
  return { dishes: { firstDish, secondDish } };
}

export async function createEventAction(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = createEventSchema.safeParse({
    clientName: formData.get("clientName"),
    clientPhone: formData.get("clientPhone"),
    eventDate: formData.get("eventDate"),
    tableCapacity: Number(formData.get("tableCapacity")),
    guestCount: formData.get("guestCount"),
    menuId: formData.get("menuId"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };
  }

  const dishes = readDishes(formData);
  if (dishes.error) return { error: dishes.error };

  let eventId: string;
  try {
    const event = await apiFetch<{ id: string }>("/events", {
      method: "POST",
      body: JSON.stringify({ ...parsed.data, ...dishes.dishes, eventDate: parsed.data.eventDate.toISOString() }),
    });
    eventId = event.id;
  } catch (err) {
    return { error: extractErrorMessage(err, "To'y buyurtmasini yaratib bo'lmadi") };
  }

  revalidatePath("/dashboard/events");
  redirect(`/dashboard/events/${eventId}`);
}

export async function updateEventAction(
  eventId: string,
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = updateEventSchema.safeParse({
    clientName: formData.get("clientName"),
    clientPhone: formData.get("clientPhone"),
    eventDate: formData.get("eventDate"),
    tableCapacity: Number(formData.get("tableCapacity")),
    guestCount: formData.get("guestCount"),
    menuId: formData.get("menuId"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };
  }

  const dishes = readDishes(formData);
  if (dishes.error) return { error: dishes.error };

  try {
    await apiFetch(`/events/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify({ ...parsed.data, ...dishes.dishes, eventDate: parsed.data.eventDate?.toISOString() }),
    });
  } catch (err) {
    return { error: extractErrorMessage(err, "To'y buyurtmasini yangilab bo'lmadi") };
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/events");
  redirect(`/dashboard/events/${eventId}`);
}

export async function updateEventStatusAction(eventId: string, status: string) {
  await apiFetch(`/events/${eventId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/events");
}

export async function unassignWorkerAction(eventId: string, workerId: string) {
  await apiFetch(`/events/${eventId}/assignments/${workerId}`, { method: "DELETE" });
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/workers");
  revalidatePath("/dashboard");
}

export async function toggleEventAssignmentAction(eventId: string, workerId: string, assign: boolean) {
  if (assign) {
    await apiFetch(`/events/${eventId}/assignments`, {
      method: "POST",
      body: JSON.stringify({ workerId }),
    });
  } else {
    await apiFetch(`/events/${eventId}/assignments/${workerId}`, { method: "DELETE" });
  }
  revalidatePath("/dashboard/workers");
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard");
}

export async function addPaymentAction(
  eventId: string,
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = createPaymentSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };
  }

  try {
    await apiFetch(`/events/${eventId}/payments`, {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
  } catch (err) {
    return { error: extractErrorMessage(err, "To'lovni saqlab bo'lmadi") };
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  return undefined;
}

/** Money handed back to the client (e.g. deposit returned after a cancellation). */
export async function addRefundAction(
  eventId: string,
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = createPaymentSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };
  }
  try {
    await apiFetch(`/events/${eventId}/refunds`, { method: "POST", body: JSON.stringify(parsed.data) });
  } catch (err) {
    return { error: extractErrorMessage(err, "Qaytarishni saqlab bo'lmadi") };
  }
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/accounting");
  return undefined;
}

export async function deleteEventAction(eventId: string) {
  await apiFetch(`/events/${eventId}`, { method: "DELETE" });
  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}

export async function addExpenseAction(
  eventId: string,
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = createEventExpenseSchema.safeParse({
    category: formData.get("category"),
    amount: formData.get("amount"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };
  }

  try {
    await apiFetch(`/events/${eventId}/expenses`, {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
  } catch (err) {
    return { error: extractErrorMessage(err, "Xarajatni saqlab bo'lmadi") };
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/accounting");
  return undefined;
}

export async function removeExpenseAction(eventId: string, expenseId: string) {
  await apiFetch(`/expenses/${expenseId}`, { method: "DELETE" });
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/accounting");
}
