"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import type { Locale } from "@/i18n/types";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "uz", label: "UZ" },
  { value: "ru", label: "RU" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  const next = OPTIONS.find((opt) => opt.value !== locale) ?? OPTIONS[0];

  return (
    <>
    {/* Narrow phones: one tap-sized toggle so the header title keeps its room. */}
    <button
      type="button"
      onClick={() => setLocale(next.value)}
      aria-label={`${t("common.language")}: ${next.label}`}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/60 text-xs font-semibold text-primary min-[400px]:hidden",
        className,
      )}
    >
      {OPTIONS.find((opt) => opt.value === locale)?.label}
    </button>
    <div
      className={cn(
        "hidden items-center gap-0.5 rounded-full border border-border bg-muted/60 p-0.5 text-xs font-semibold min-[400px]:inline-flex",
        className,
      )}
      role="group"
      aria-label={t("common.language")}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLocale(opt.value)}
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors pointer-coarse:py-2",
            locale === opt.value
              ? "bg-card text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
    </>
  );
}
