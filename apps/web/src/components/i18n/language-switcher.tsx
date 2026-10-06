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

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/60 p-0.5 text-xs font-semibold",
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
            // Taller on touch screens, where 24px is too small to hit reliably.
            "rounded-full px-2.5 py-1 transition-colors pointer-coarse:px-3 pointer-coarse:py-2",
            locale === opt.value
              ? "bg-card text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
