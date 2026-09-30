export type Locale = "uz" | "ru";

export const LOCALES: Locale[] = ["uz", "ru"];
export const DEFAULT_LOCALE: Locale = "uz";
export const LOCALE_COOKIE = "locale";

type DeepStringify<T> = T extends string
  ? string
  : T extends readonly unknown[]
    ? string[]
    : T extends object
      ? { [K in keyof T]: DeepStringify<T[K]> }
      : T;

export type Dictionary = DeepStringify<typeof import("./dictionaries/uz").uz>;
