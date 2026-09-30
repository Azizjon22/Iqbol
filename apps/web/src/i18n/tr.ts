import type { Locale } from "./types";
import { PHRASE_PATTERNS, PHRASES_RU } from "./phrases-ru";

const compiled = PHRASE_PATTERNS.map((pattern) => {
  const body = pattern.uz
    .split("{x}")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("([\\s\\S]+?)");
  return { re: new RegExp(`^${body}$`), ru: pattern.ru };
}).sort((a, b) => b.re.source.length - a.re.source.length);

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function trText(locale: Locale, text: string): string {
  if (locale !== "ru" || !text) return text;
  const key = normalize(text);
  const exact = PHRASES_RU[key];
  if (exact) return exact;
  for (const pattern of compiled) {
    const match = key.match(pattern.re);
    if (!match) continue;
    let out = pattern.ru;
    for (let i = match.length - 1; i >= 1; i--) {
      out = out.replaceAll(`$${i}`, trText(locale, match[i]));
    }
    return out;
  }
  return text;
}
