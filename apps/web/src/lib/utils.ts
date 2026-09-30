import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale } from "@/i18n/types";
import { getDictionary } from "@/i18n/get-dictionary";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function groupThousands(value: number) {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatSom(value: number | string, locale: Locale = "uz") {
  const num = typeof value === "string" ? Number(value) : value;
  const dict = getDictionary(locale);
  return `${groupThousands(num)} ${dict.common.som}`;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

export function formatDate(value: string | Date, locale: Locale = "uz") {
  const date = typeof value === "string" ? new Date(value) : value;
  const months = getDictionary(locale).months;
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateTime(value: string | Date, locale: Locale = "uz") {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${formatDate(date, locale)}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Local-date key like "2026-09-25", matching an <input type="date"> value. */
export function toDateParam(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** @deprecated Use formatDate with locale */
export const UZ_MONTHS = getDictionary("uz").months;
