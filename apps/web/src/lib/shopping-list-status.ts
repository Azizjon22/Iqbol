import type { ShoppingListStatus } from "@shodiyora/shared";

type BadgeVariant = "default" | "primary" | "success" | "accent";

export const SHOPPING_LIST_STATUS_UZ: Record<ShoppingListStatus, { label: string; variant: BadgeVariant }> = {
  SUBMITTED: { label: "Yangi", variant: "primary" },
  REVIEWED: { label: "Ko'rib chiqilgan", variant: "default" },
  APPROVED: { label: "Adminga yuborilgan", variant: "accent" },
  PURCHASED: { label: "Sotib olingan", variant: "success" },
  CLOSED: { label: "Yopilgan", variant: "default" },
};

/** SUPER_ADMIN can still correct the list until ADMIN has bought everything. */
export function isShoppingListEditable(status: ShoppingListStatus) {
  return status === "SUBMITTED" || status === "REVIEWED" || status === "APPROVED";
}

export function isShoppingListSent(status: ShoppingListStatus) {
  return status !== "SUBMITTED" && status !== "REVIEWED";
}
