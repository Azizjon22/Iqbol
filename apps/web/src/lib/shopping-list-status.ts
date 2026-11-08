import type { ShoppingListStatus } from "@iqbol/shared";
import type { TranslationKey } from "@/i18n/get-dictionary";

type BadgeVariant = "default" | "primary" | "success" | "accent";
type T = (key: TranslationKey | string, params?: Record<string, string | number>) => string;

const STATUS_VARIANT: Record<ShoppingListStatus, BadgeVariant> = {
  SUBMITTED: "primary",
  REVIEWED: "default",
  APPROVED: "accent",
  PURCHASED: "success",
  CLOSED: "default",
};

const STATUS_KEY: Record<ShoppingListStatus, string> = {
  SUBMITTED: "statusSubmitted",
  REVIEWED: "statusReviewed",
  APPROVED: "statusApproved",
  PURCHASED: "statusPurchased",
  CLOSED: "statusClosed",
};

export function shoppingListStatusMeta(t: T, status: ShoppingListStatus): { label: string; variant: BadgeVariant } {
  return { label: t(`shoppingLists.${STATUS_KEY[status]}`), variant: STATUS_VARIANT[status] };
}

/** SUPER_ADMIN can still correct the list until ADMIN has bought everything. */
export function isShoppingListEditable(status: ShoppingListStatus) {
  return status === "SUBMITTED" || status === "REVIEWED" || status === "APPROVED";
}

export function isShoppingListSent(status: ShoppingListStatus) {
  return status !== "SUBMITTED" && status !== "REVIEWED";
}
