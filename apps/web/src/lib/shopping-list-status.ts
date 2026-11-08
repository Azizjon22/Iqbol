import type { ShoppingListStatus } from "@iqbol/shared";

type BadgeVariant = "default" | "primary" | "success" | "accent";

/** The chef writes, confirms and buys a list on their own. */
export const SHOPPING_LIST_STATUS_UZ: Record<ShoppingListStatus, { label: string; variant: BadgeVariant }> = {
  SUBMITTED: { label: "Tasdiqlanmagan", variant: "primary" },
  REVIEWED: { label: "Tasdiqlanmagan", variant: "primary" },
  APPROVED: { label: "Xarid qilinmoqda", variant: "accent" },
  PURCHASED: { label: "Xarid qilindi", variant: "success" },
  CLOSED: { label: "Xarid qilindi", variant: "success" },
};
