import { uz } from "./dictionaries/uz";
import { ru } from "./dictionaries/ru";
import type { Dictionary, Locale } from "./types";
import { DEFAULT_LOCALE } from "./types";

const dictionaries: Record<Locale, Dictionary> = { uz, ru };

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

type DotPath<T, Prefix extends string = ""> = T extends readonly string[]
  ? never
  : T extends object
    ? {
        [K in keyof T & string]: T[K] extends string
          ? Prefix extends ""
            ? K
            : `${Prefix}.${K}`
          : T[K] extends readonly string[]
            ? never
            : DotPath<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>;
      }[keyof T & string]
    : never;

export type TranslationKey = DotPath<Dictionary>;

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function translate(
  dictionary: Dictionary,
  key: TranslationKey | string,
  params?: Record<string, string | number>,
): string {
  const value = getByPath(dictionary, key);
  let text = typeof value === "string" ? value : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
