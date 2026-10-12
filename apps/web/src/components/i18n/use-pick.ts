"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import { pickLang } from "@/i18n/pick";

/** Picks Uzbek or Russian content for the language selected in the header. */
export function usePick() {
  const { locale } = useLocale();
  return (uz?: string | null, ru?: string | null) => pickLang(locale, uz, ru);
}
