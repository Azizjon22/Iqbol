import type { Locale } from "./types";

/** Russian text when the header is RU and that text is filled; otherwise Uzbek. */
export function pickLang(locale: Locale, uz?: string | null, ru?: string | null): string {
  if (locale === "ru" && ru?.trim()) return ru;
  return uz ?? "";
}
