import type { PaymentMethod } from "@iqbol/shared";

/**
 * Uzbek source text — pass through `tr()`. Lives outside any "use client"
 * file so server pages can read it too (a value imported from a client
 * module arrives on the server as an opaque reference, not as the object).
 */
export const METHOD_LABEL: Record<PaymentMethod, string> = { CASH: "Naqd", CARD: "Karta", TRANSFER: "O'tkazma" };
