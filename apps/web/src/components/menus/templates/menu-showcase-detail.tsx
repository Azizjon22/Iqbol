"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Play, UtensilsCrossed } from "lucide-react";
import type { Menu, MenuDish } from "@/lib/types";
import { PresentationHeader } from "@/components/layout/presentation-header";
import { OrnamentDivider, CornerFlourish } from "@/components/menus/showcase/ornament-divider";
import { Reveal } from "@/components/menus/showcase/reveal";
import { SafeImage } from "@/components/menus/showcase/safe-image";
import { Lightbox, type LightboxItem } from "@/components/menus/showcase/lightbox";
import { PriceCalculator } from "@/components/menus/showcase/price-calculator";
import { ClosingCta } from "@/components/menus/showcase/closing-cta";
import { MENU_DISH_CATEGORIES, MENU_MEDIA_SECTIONS, type MenuMediaSection } from "@iqbol/shared";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatSom, cn } from "@/lib/utils";

// Bento rhythm for the gallery: groups of five — one 2×2 feature plus four
// small tiles beside it. A short last group widens its tiles so the 4-column
// grid never ends with a hole.
function tileSpans(count: number) {
  const spans: string[] = [];
  for (let start = 0; start < count; start += 5) {
    const small = Math.min(4, count - start - 1);
    spans.push(small === 0 ? "col-span-2 row-span-2 md:col-span-4" : "col-span-2 row-span-2");
    if (small === 4) spans.push("", "", "", "");
    if (small === 3) spans.push("", "", "col-span-2");
    if (small === 2) spans.push("col-span-2", "col-span-2");
    if (small === 1) spans.push("col-span-2 row-span-2");
  }
  return spans;
}

export function MenuShowcaseDetail({ menu, initialGuests }: { menu: Menu; initialGuests?: number }) {
  const { t, locale } = useLocale();
  const price = Number(menu.pricePerPerson);

  const [section, setSection] = useState<MenuMediaSection | "ALL">("ALL");
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null);

  const markBroken = useCallback((url: string) => {
    setBroken((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
  }, []);

  const courses = MENU_DISH_CATEGORIES.map((category) => ({
    category,
    dishes: menu.dishes.filter((d) => d.category === category),
  })).filter((c) => c.dishes.length > 0);

  // Dead links are dropped from the gallery entirely rather than shown torn.
  const media = useMemo(
    () => menu.media.filter((m) => m.mediaType === "VIDEO" || !broken.has(m.url)),
    [menu.media, broken],
  );
  const sectionsPresent = MENU_MEDIA_SECTIONS.filter((s) => media.some((m) => m.section === s));
  const visibleMedia = section === "ALL" ? media : media.filter((m) => m.section === section);
  const spans = tileSpans(visibleMedia.length);

  const dishPhotos: LightboxItem[] = menu.dishes
    .filter((d) => d.photoUrl && !broken.has(d.photoUrl))
    .map((d) => ({ url: d.photoUrl!, caption: d.name, kind: "PHOTO" }));

  function openDish(dish: MenuDish) {
    const index = dishPhotos.findIndex((p) => p.caption === dish.name);
    if (index >= 0) setLightbox({ items: dishPhotos, index });
  }

  function openMedia(index: number) {
    setLightbox({
      items: visibleMedia.map((m) => ({ url: m.url, caption: m.caption, kind: m.mediaType })),
      index,
    });
  }

  // "160 000 so'm" → big "160 000" with the currency set smaller beneath it.
  const priceParts = formatSom(price, locale).split(" ");
  const somLabel = priceParts.pop();
  const priceDigits = priceParts.join(" ");

  const navLink =
    "rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground";

  return (
    <div className="presentation-root min-h-screen bg-background text-foreground">
      <PresentationHeader />

      {/* ---------- Hero ---------- */}
      <section className="relative isolate flex min-h-[calc(100svh-4rem-1px)] items-end overflow-hidden bg-[#071422] text-white">
        <div className="absolute inset-0 -z-10 animate-ken-burns">
          <SafeImage
            src={menu.coverImageUrl}
            fallbacks={menu.media.filter((m) => m.mediaType === "PHOTO").map((m) => m.url)}
            alt={menu.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#071422] via-[#071422]/65 to-[#071422]/45" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(94,182,239,0.22),transparent)]" />

        <div className="absolute inset-x-0 top-4 mx-auto w-full max-w-5xl px-4 sm:top-6 sm:px-6 2xl:max-w-7xl">
          <Link
            href="/showcase"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3.5 py-1.5 text-sm text-white/85 backdrop-blur-md transition hover:bg-black/50"
          >
            <ArrowLeft className="h-4 w-4" /> {t("presentation.allMenus")}
          </Link>
        </div>

        <div className="mx-auto w-full max-w-5xl px-4 pb-14 pt-24 text-center sm:px-6 sm:pb-20 2xl:max-w-6xl 2xl:pb-28 [@media(max-height:620px)]:pb-8 [@media(max-height:620px)]:pt-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-[#b7dff8] animate-fade-up">
            {t("common.brand")} · {t("presentation.eyebrow")}
          </p>
          <h1 className="font-display mt-5 text-[clamp(2.6rem,min(9vw,11svh),8.5rem)] font-semibold leading-[0.95] tracking-tight lining-nums [overflow-wrap:anywhere] animate-fade-up [@media(max-height:620px)]:mt-3">
            {menu.name}
          </h1>
          {menu.isVip && (
            <span className="mt-5 inline-flex items-center rounded-full border border-[#b7dff8]/50 bg-[#b7dff8]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#d6efff]">
              {t("common.vip")}
            </span>
          )}
          <OrnamentDivider className="mt-7 text-[#5eb6ef] [@media(max-height:620px)]:mt-4" />
          <div className="mt-6 animate-soft-scale [@media(max-height:620px)]:mt-3">
            <p className="font-display text-gilded text-[clamp(3rem,min(8vw,10svh),7.5rem)] font-semibold lining-nums tabular-nums leading-none">{priceDigits}</p>
            <p className="mt-2 text-sm uppercase tracking-[0.3em] text-white/70">
              {somLabel} · {t("presentation.perGuest")}
            </p>
          </div>
          {menu.description && (
            <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg 2xl:max-w-2xl 2xl:text-xl [@media(max-height:620px)]:hidden">{menu.description}</p>
          )}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-sm text-white/80 [@media(max-height:620px)]:mt-4">
            <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur">
              {t("presentation.dishesCount", { count: menu.dishes.length })}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur">
              {t("presentation.coursesCount", { count: courses.length })}
            </span>
          </div>
          <a
            href="#menu"
            className="mt-10 inline-flex flex-col items-center gap-1 text-xs uppercase tracking-[0.3em] text-white/60 hover:text-white [@media(max-height:620px)]:hidden"
          >
            {t("presentation.scrollHint")}
            <ChevronDown className="h-5 w-5 animate-scroll-cue" />
          </a>
        </div>
      </section>

      {/* ---------- Section nav ---------- */}
      <nav className="sticky top-[calc(4rem+1px)] z-10 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2 sm:px-6 2xl:max-w-7xl">
          <div className="-mx-1 flex gap-1 overflow-x-auto">
            <a href="#menu" className={navLink}>
              {t("presentation.navMenu")}
            </a>
            <a href="#calc" className={navLink}>
              {t("presentation.navCalc")}
            </a>
            {media.length > 0 && (
              <a href="#gallery" className={navLink}>
                {t("presentation.navGallery")}
              </a>
            )}
          </div>
          <span className="font-display hidden shrink-0 text-lg font-semibold lining-nums text-accent sm:inline">
            {formatSom(price, locale)} <span className="text-sm font-normal text-muted-foreground">{t("common.perPerson")}</span>
          </span>
        </div>
      </nav>

      <main>
        {/* ---------- Menu card ---------- */}
        {courses.length > 0 && (
          <section id="menu" className="relative scroll-mt-32 overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,var(--surface-glow),transparent)]" />
            <Reveal className="relative mx-auto max-w-4xl 2xl:max-w-5xl">
              <div className="relative rounded-[28px] border border-accent/35 bg-card/80 px-4 py-12 shadow-2xl shadow-black/10 backdrop-blur min-[400px]:px-6 sm:px-14 sm:py-16 2xl:px-20 2xl:py-20">
                <div className="pointer-events-none absolute inset-2.5 rounded-[22px] border border-accent/15" />
                <CornerFlourish className="left-4 top-4 text-accent/70" />
                <CornerFlourish className="right-4 top-4 rotate-90 text-accent/70" />
                <CornerFlourish className="bottom-4 right-4 rotate-180 text-accent/70" />
                <CornerFlourish className="bottom-4 left-4 -rotate-90 text-accent/70" />

                <div className="text-center">
                  <h2 className="font-display text-gilded-adaptive text-[clamp(2.75rem,6vw,4.5rem)] font-semibold tracking-tight">
                    {t("presentation.menuCardTitle")}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{t("presentation.menuCardSubtitle")}</p>
                  <OrnamentDivider className="mt-5 text-accent" />
                </div>

                <div className="mt-12 space-y-12">
                  {courses.map(({ category, dishes }, ci) => (
                    <Reveal key={category} delay={ci * 60}>
                      <div className="mb-6 flex items-center gap-4">
                        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-accent/40" />
                        <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">
                          {t(`dishCategories.${category}`)}
                        </h3>
                        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-accent/40" />
                      </div>
                      <ul
                        className={cn(
                          "grid gap-x-12 gap-y-5",
                          dishes.length > 1 ? "sm:grid-cols-2" : "mx-auto max-w-sm",
                        )}
                      >
                        {dishes.map((dish) => (
                          <li key={dish.id}>
                            <button
                              type="button"
                              onClick={() => openDish(dish)}
                              className="group flex w-full items-center gap-4 rounded-2xl p-2 text-left transition hover:bg-muted/60"
                            >
                              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full sm:h-16 sm:w-16 2xl:h-20 2xl:w-20 ring-1 ring-accent/30 ring-offset-2 ring-offset-card transition group-hover:ring-accent/70">
                                <SafeImage
                                  src={dish.photoUrl}
                                  alt={dish.name}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  fallbackIcon={<UtensilsCrossed className="h-4 w-4" />}
                                  onBroken={dish.photoUrl ? () => markBroken(dish.photoUrl!) : undefined}
                                />
                              </span>
                              <span className="min-w-0">
                                <span className="font-display block text-xl font-semibold leading-tight min-[400px]:text-2xl 2xl:text-3xl">{dish.name}</span>
                                {dish.description && (
                                  <span className="mt-0.5 block text-sm italic text-muted-foreground">{dish.description}</span>
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* ---------- Price calculator ---------- */}
        <section id="calc" className="scroll-mt-32 border-y border-border/60 bg-muted/30 px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-5xl 2xl:max-w-6xl">
            <div className="mb-10 text-center">
              <h2 className="font-display text-[clamp(2.25rem,4.5vw,4rem)] font-semibold tracking-tight">{t("presentation.calcTitle")}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{t("presentation.calcSubtitle")}</p>
              <OrnamentDivider className="mt-5 text-accent" />
            </div>
            <PriceCalculator pricePerPerson={price} initialGuests={initialGuests} />
          </Reveal>
        </section>

        {/* ---------- Gallery ---------- */}
        {media.length > 0 && (
          <section id="gallery" className="scroll-mt-32 px-4 py-16 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-6xl 2xl:max-w-[1600px]">
              <Reveal className="mb-10 text-center">
                <h2 className="font-display text-[clamp(2.25rem,4.5vw,4rem)] font-semibold tracking-tight">{t("presentation.galleryTitle")}</h2>
                <p className="mt-3 text-sm text-muted-foreground">{t("presentation.gallerySubtitle")}</p>
                <OrnamentDivider className="mt-5 text-accent" />
              </Reveal>

              {sectionsPresent.length > 1 && (
                <div className="mb-8 flex flex-wrap justify-center gap-2">
                  {(["ALL", ...sectionsPresent] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSection(s)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm font-medium transition",
                        section === s
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                      )}
                    >
                      {s === "ALL" ? t("presentation.galleryAll") : t(`mediaSections.${s}`)}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid auto-rows-[clamp(130px,38vw,190px)] grid-flow-dense grid-cols-2 gap-2 min-[400px]:gap-3 md:auto-rows-[clamp(180px,16vw,340px)] md:grid-cols-4">
                {visibleMedia.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openMedia(i)}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl bg-muted text-left animate-soft-scale",
                      spans[i],
                    )}
                  >
                    {item.mediaType === "PHOTO" ? (
                      <SafeImage
                        src={item.url}
                        alt={item.caption ?? ""}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onBroken={() => markBroken(item.url)}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/40 via-accent/20 to-background">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition-transform group-hover:scale-110">
                          <Play className="h-6 w-6 translate-x-0.5 fill-current" />
                        </span>
                      </span>
                    )}
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-80 transition-opacity group-hover:opacity-100" />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 p-3 sm:p-4">
                      <span className="block text-[10px] font-medium uppercase tracking-[0.25em] text-[#b7dff8]">
                        {t(`mediaSections.${item.section}`)}
                      </span>
                      {item.caption && (
                        <span className="font-display mt-0.5 block text-lg font-semibold leading-tight text-white sm:text-xl">
                          {item.caption}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <ClosingCta title={t("presentation.ctaTitle")} subtitle={t("presentation.ctaSubtitle")} />
      </main>

      {lightbox && (
        <Lightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndex={(index) => setLightbox((lb) => (lb ? { ...lb, index } : lb))}
        />
      )}
    </div>
  );
}
