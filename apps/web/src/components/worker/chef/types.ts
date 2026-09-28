import type { MenuDishCategory, ShoppingListStatus } from "@iqbol/shared";

export interface ChefEvent {
  id: string;
  clientName: string;
  eventDate: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  guestCount: number;
  tableCapacity: number;
  menu: { name: string; dishes: { id: string; name: string; category: MenuDishCategory }[] };
  /** The couple's chosen dishes — what the chef actually cooks and shops for. */
  firstDish: string | null;
  secondDish: string | null;
  /** Non-empty when this chef is assigned to the wedding. */
  assignments: { id: string }[];
  /** This chef's own lists for the wedding. */
  shoppingLists: { id: string; status: ShoppingListStatus; createdAt: string }[];
}

const DAY = 24 * 60 * 60 * 1000;

function midnight(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function daysUntil(date: string | Date) {
  return Math.round((midnight(new Date(date)) - midnight(new Date())) / DAY);
}

/** "Bugun", "Ertaga", "3 kundan keyin". */
export function whenLabel(date: string | Date) {
  const d = daysUntil(date);
  if (d <= 0) return "Bugun";
  if (d === 1) return "Ertaga";
  return `${d} kundan keyin`;
}

export const WEEKDAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
export const WEEKDAYS_SHORT = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];

export const LIST_STEPS: { key: ShoppingListStatus; label: string }[] = [
  { key: "SUBMITTED", label: "Yuborildi" },
  { key: "REVIEWED", label: "Ko'rildi" },
  { key: "APPROVED", label: "Tasdiqlandi" },
  { key: "PURCHASED", label: "Olindi" },
];

export function listStepIndex(status: ShoppingListStatus) {
  if (status === "CLOSED") return LIST_STEPS.length - 1;
  return LIST_STEPS.findIndex((s) => s.key === status);
}
