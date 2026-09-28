"use client";

import { useState } from "react";
import { Minus, Plus, Users } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatSom, cn } from "@/lib/utils";
import {
  GUESTS_MAX as MAX,
  GUESTS_MIN as MIN,
  GUESTS_STEP as STEP,
  GUEST_PRESETS as PRESETS,
  GUESTS_DEFAULT,
  clampGuests as clamp,
} from "./guests";

/** Lets staff answer "how much for N guests?" live, in front of the client. */
export function PriceCalculator({
  pricePerPerson,
  initialGuests = GUESTS_DEFAULT,
}: {
  pricePerPerson: number;
  initialGuests?: number;
}) {
  const { t, locale } = useLocale();
  const [guests, setGuests] = useState(initialGuests);
  const [draft, setDraft] = useState<string | null>(null);
  const total = pricePerPerson * guests;
  const fill = ((guests - MIN) / (MAX - MIN)) * 100;

  const stepButton =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/30 text-accent transition hover:bg-accent/10 disabled:opacity-30";

  return (
    <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3 min-[480px]:flex-row min-[480px]:justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4 text-accent" /> {t("presentation.calcGuests")}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={stepButton}
              onClick={() => setGuests((g) => clamp(g - STEP))}
              disabled={guests <= MIN}
              aria-label="-10"
            >
              <Minus className="h-4 w-4" />
            </button>
            <label className="flex items-baseline gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                min={MIN}
                max={MAX}
                value={draft ?? guests}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                  if (draft !== null && draft.trim() !== "") setGuests(clamp(Number(draft)));
                  setDraft(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="font-display w-24 rounded-md bg-transparent text-center text-4xl font-semibold lining-nums tabular-nums outline-none focus:ring-2 focus:ring-accent/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={t("presentation.calcGuests")}
              />
              <span className="text-sm text-muted-foreground">{t("presentation.calcGuestsUnit")}</span>
            </label>
            <button
              type="button"
              className={stepButton}
              onClick={() => setGuests((g) => clamp(g + STEP))}
              disabled={guests >= MAX}
              aria-label="+10"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="gold-range w-full"
          style={{ "--fill": `${fill}%` } as React.CSSProperties}
          aria-label={t("presentation.calcGuests")}
        />

        <div className="flex flex-wrap justify-center gap-2 min-[480px]:justify-start">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setGuests(n)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium tabular-nums transition",
                guests === n
                  ? "border-accent bg-accent text-accent-foreground shadow-md shadow-accent/20"
                  : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/10 via-card to-card px-4 py-6 text-center min-[400px]:p-6 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">{t("presentation.calcTotal")}</p>
        <p
          key={total}
          className="font-display text-gilded-adaptive mt-3 whitespace-nowrap text-[clamp(1.9rem,7.5vw,3.25rem)] font-semibold lining-nums tabular-nums animate-soft-scale md:text-[clamp(2rem,3.6vw,3.5rem)]"
        >
          {formatSom(total, locale)}
        </p>
        <p className="mt-3 text-sm tabular-nums text-muted-foreground">
          {guests} × {formatSom(pricePerPerson, locale)}
        </p>
        <p className="mt-4 text-xs text-muted-foreground/80">{t("presentation.calcNote")}</p>
      </div>
    </div>
  );
}
