"use server";

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./types";
import { getSession } from "@/lib/session";
import { apiFetch } from "@/lib/api";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return raw === "ru" ? "ru" : DEFAULT_LOCALE;
}

export async function setLocaleAction(locale: Locale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale === "ru" ? "ru" : "uz", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  // The Telegram bot writes to this person in the site's language too.
  if (await getSession()) {
    await apiFetch("/telegram/language", {
      method: "PATCH",
      body: JSON.stringify({ language: locale === "ru" ? "ru" : "uz" }),
    }).catch(() => undefined);
  }
}
