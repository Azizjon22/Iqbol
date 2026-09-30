"use client";

import { createContext, useCallback, useContext, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary, Locale } from "@/i18n/types";
import { translate, type TranslationKey } from "@/i18n/get-dictionary";
import { setLocaleAction } from "@/i18n/locale";
import { trText } from "@/i18n/tr";

type TFunction = (key: TranslationKey | string, params?: Record<string, string | number>) => string;

const LocaleContext = createContext<{
  locale: Locale;
  dictionary: Dictionary;
  t: TFunction;
  setLocale: (locale: Locale) => void;
} | null>(null);

export function LocaleProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const t = useCallback<TFunction>(
    (key, params) => translate(dictionary, key, params),
    [dictionary],
  );

  const setLocale = useCallback(
    (next: Locale) => {
      startTransition(async () => {
        await setLocaleAction(next);
        router.refresh();
      });
    },
    [router],
  );

  const value = useMemo(
    () => ({ locale, dictionary, t, setLocale }),
    [locale, dictionary, t, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export function useT() {
  return useLocale().t;
}

export function useTr() {
  const { locale } = useLocale();
  return useCallback((text: string) => trText(locale, text), [locale]);
}
