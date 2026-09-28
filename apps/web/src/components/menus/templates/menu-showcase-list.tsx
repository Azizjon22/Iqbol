"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Crown, Minus, Plus, Users } from "lucide-react";
import type { Menu } from "@/lib/types";
import { PresentationHeader } from "@/components/layout/presentation-header";
import { OrnamentalPattern } from "@/components/menus/ornamental-pattern";
import { OrnamentDivider } from "@/components/menus/showcase/ornament-divider";
import { Reveal } from "@/components/menus/showcase/reveal";
import { SafeImage } from "@/components/menus/showcase/safe-image";
import { ClosingCta } from "@/components/menus/showcase/closing-cta";
import {
  GUESTS_DEFAULT,
  GUESTS_MAX,
  GUESTS_MIN,
  GUESTS_STEP,
  GUEST_PRESETS,
  clampGuests,
} from "@/components/menus/showcase/guests";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatSom, cn } from "@/lib/utils";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

// How many cards share a row on wide screens — chosen so the last row is
// never a lonely orphan (4 menus → 4 across, 3 or 6 → 3 across).
function cardWidth(count: number) {
  const perRow = count % 4 === 0 ? 4 : count % 3 === 0 ? 3 : Math.min(4, count);
  return cn(
    "w-full",
    count > 1 && "sm:w-[calc((100%-1.5rem)/2)]",
    perRow === 3 && "lg:w-[calc((100%-3rem)/3)]",
    perRow === 4 && "xl:w-[calc((100%-4.5rem)/4)]",
  );
}

function photoFallbacks(menu: Menu) {
  return menu.media.filter((m) => m.mediaType === "PHOTO").map((m) => m.url);
}

export function MenuShowcaseList({ menus }: { menus: Menu[] }) {
  const { t, locale } = useLocale();
  const [guests, setGuests] = useState(GUESTS_DEFAULT);

  const sorted = [...menus].sort((a, b) => Number(a.pricePerPerson) - Number(b.pricePerPerson));
  const prices = sorted.map((m) => Number(m.pricePerPerson));
  const backdrop = sorted.find((m) => m.isVip) ?? sorted[sorted.length - 1];

  const stepButton =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 text-accent transition hover:bg-accent/10 disabled:opacity-30";

  return (
    <div className="presentation-root min-h-screen bg-background text-foreground">
      <PresentationHeader />

      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden bg-[#0d0a0b] text-white">
        {backdrop && (
          <div className="absolute inset-0 -z-20 animate-ken-burns">
            <SafeImage
              src={backdrop.coverImageUrl}
              fallbacks={sorted.map((m) => m.coverImageUrl).filter((u): u is string => !!u)}
              alt=""
              className="h-full w-full object-cover opacity-45 blur-[2px]"
            />
          </div>
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0d0a0b]/70 via-[#0d0a0b]/60 to-[#0d0a0b]" />
        <OrnamentalPattern id="list-hero-ornament" className="-z-10 text-[#d4a85c] opacity-[0.05]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(212,120,150,0.22),transparent)]" />

        <div className="mx-auto max-w-4xl px-4 pb-24 pt-16 text-center sm:px-6 sm:pb-32 sm:pt-24 2xl:max-w-5xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-[#e9cf98] animate-fade-up">
            {t("common.brand")} · {t("presentation.listEyebrow")}
          </p>
          <h1 className="font-display mt-5 text-[clamp(2.6rem,min(8vw,12svh),7rem)] font-semibold leading-[0.95] tracking-tight animate-fade-up">
            {t("presentation.heroTitle")}
          </h1>
          <OrnamentDivider className="mt-7 text-[#d4a85c]" />
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg 2xl:max-w-2xl">
            {t("presentation.heroSubtitle")}
          </p>
          {sorted.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm text-white/85">
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur">
                {t("presentation.packagesCount", { count: sorted.length })}
              </span>
              <span className="rounded-full border border-[#e9cf98]/30 bg-[#e9cf98]/10 px-4 py-1.5 text-[#f1d9a0] lining-nums backdrop-blur">
                {prices.length > 1 && prices[0] !== prices[prices.length - 1]
                  ? `${formatSom(prices[0], locale).replace(/\s\S+$/, "")} — ${formatSom(prices[prices.length - 1], locale)}`
                  : formatSom(prices[0], locale)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Guests bar (sticky) ---------- */}
      {sorted.length > 0 && (
        <div className="sticky top-[calc(4rem+1px)] z-10 -mt-12 px-4 sm:-mt-14 sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 rounded-2xl border border-accent/25 bg-card/90 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl sm:flex-row sm:justify-between sm:gap-6 sm:rounded-full sm:py-2.5 sm:pl-6 sm:pr-3">
            <div className="text-center sm:text-left">
              <p className="flex items-center justify-center gap-2 text-sm font-medium sm:justify-start">
                <Users className="h-4 w-4 text-accent" /> {t("presentation.guestsBarTitle")}
              </p>
              <p className="hidden max-w-xs text-xs leading-snug text-muted-foreground xl:block">{t("presentation.guestsBarHint")}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden gap-1 lg:flex">
                {GUEST_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setGuests(n)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-medium tabular-nums transition",
                      guests === n ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={stepButton}
                onClick={() => setGuests((g) => clampGuests(g - GUESTS_STEP))}
                disabled={guests <= GUESTS_MIN}
                aria-label="-10"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={GUESTS_MIN}
                max={GUESTS_MAX}
                step={GUESTS_STEP}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="gold-range hidden w-32 sm:block md:w-40"
                style={{ "--fill": `${((guests - GUESTS_MIN) / (GUESTS_MAX - GUESTS_MIN)) * 100}%` } as React.CSSProperties}
                aria-label={t("presentation.guestsBarTitle")}
              />
              <span className="font-display w-16 text-center text-3xl font-semibold lining-nums tabular-nums">{guests}</span>
              <button
                type="button"
                className={stepButton}
                onClick={() => setGuests((g) => clampGuests(g + GUESTS_STEP))}
                disabled={guests >= GUESTS_MAX}
                aria-label="+10"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Packages ---------- */}
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pb-28 sm:pt-16 2xl:max-w-[100rem]">
        {sorted.length === 0 && (
          <p className="py-20 text-center text-sm text-muted-foreground">{t("presentation.empty")}</p>
        )}

        <div className="flex flex-wrap justify-center gap-6">
          {sorted.map((menu, i) => {
            const price = Number(menu.pricePerPerson);
            return (
              <Reveal key={menu.id} delay={i * 90} className={cardWidth(sorted.length)}>
                <Link
                  href={`/showcase/${menu.id}?guests=${guests}`}
                  className={cn(
                    "@container group relative flex aspect-[4/5] w-full flex-col justify-end overflow-hidden rounded-[26px] bg-[#0d0a0b] text-white shadow-xl shadow-black/15 transition-all duration-500",
                    "hover:-translate-y-1.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:aspect-[3/4]",
                    menu.isVip
                      ? "ring-1 ring-[#d4a85c]/70 shadow-[#d4a85c]/20 hover:shadow-[#d4a85c]/35"
                      : "ring-1 ring-white/5 hover:ring-[#d4a85c]/40",
                  )}
                >
                  <div className="absolute inset-0">
                    <SafeImage
                      src={menu.coverImageUrl}
                      fallbacks={photoFallbacks(menu)}
                      alt={menu.name}
                      className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.06]"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a0b] from-35% via-[#0d0a0b]/70 via-60% to-[#0d0a0b]/10" />
                  {menu.isVip && (
                    <div className="pointer-events-none absolute inset-2 rounded-[20px] border border-[#d4a85c]/40" />
                  )}

                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
                    <span className="font-display flex h-11 w-11 items-center justify-center rounded-full border border-[#e9cf98]/40 bg-black/30 text-lg font-semibold text-[#f1d9a0] backdrop-blur-md">
                      {ROMAN[i] ?? i + 1}
                    </span>
                    {menu.isVip && (
                      <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#c99a52] via-[#f1d9a0] to-[#c99a52] px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#24180a] shadow-lg shadow-black/30">
                        <Crown className="h-3.5 w-3.5" /> {t("common.vip")}
                      </span>
                    )}
                  </div>

                  <div className="relative p-[clamp(1.1rem,7cqw,2rem)]">
                    <h2 className="font-display text-[clamp(1.6rem,10.5cqw,3rem)] font-semibold leading-[1.05] lining-nums">{menu.name}</h2>
                    {menu.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/65">{menu.description}</p>
                    )}
                    <div className="mt-4 h-px w-full bg-gradient-to-r from-[#d4a85c]/60 via-[#d4a85c]/20 to-transparent" />
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="font-display text-gilded text-[clamp(2rem,12cqw,3.5rem)] font-semibold leading-none lining-nums tabular-nums">
                          {formatSom(price, locale).replace(/\s\S+$/, "")}
                        </p>
                        <p className="mt-1.5 text-[11px] uppercase tracking-[0.2em] text-white/60">
                          {t("common.som")} · {t("presentation.perGuest")}
                        </p>
                      </div>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur transition-all duration-300 group-hover:border-transparent group-hover:bg-[#f1d9a0] group-hover:text-[#24180a]">
                        <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 backdrop-blur-md">
                      <span className="text-xs text-white/60">{t("presentation.totalFor", { count: guests })}</span>
                      <span key={guests} className="text-sm font-semibold lining-nums tabular-nums text-[#f1d9a0] animate-soft-scale">
                        {formatSom(price * guests, locale)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-white/50">
                      {t("presentation.dishesCount", { count: menu.dishes.length })}
                      <span className="mx-2 text-[#d4a85c]">·</span>
                      <span className="text-[#e9cf98] opacity-80 transition-opacity group-hover:opacity-100">
                        {t("presentation.viewMenu")}
                      </span>
                    </p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </main>

      <ClosingCta title={t("presentation.listCtaTitle")} subtitle={t("presentation.listCtaSubtitle")} />
    </div>
  );
}
