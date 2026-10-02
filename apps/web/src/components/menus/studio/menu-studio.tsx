"use client";
import { useLocale, useTr } from "@/components/i18n/locale-provider";


import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Copy,
  Crown,
  ExternalLink,
  ImageIcon,
  Pencil,
  Plus,
  Star,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import {
  MENU_DISH_CATEGORIES,
  MENU_DISH_CATEGORY_LABELS_UZ,
  MENU_MEDIA_SECTIONS,
  MENU_MEDIA_SECTION_LABELS_UZ,
  type MenuDishCategory,
  type MenuMediaSection,
} from "@iqbol/shared";
import type { Menu, MenuDish, MenuMedia } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/menus/showcase/safe-image";
import { formatSom, cn } from "@/lib/utils";
import { MenuInfoModal } from "./menu-info-modal";
import { DishModal } from "./dish-modal";
import { MediaModal } from "./media-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReadinessRing } from "./readiness-ring";
import { menuReadiness, allMenuImageUrls } from "./readiness";
import { useBrokenImages } from "./use-broken-images";
import { menuApi, errorText } from "./api";

type Tab = "dishes" | "gallery";

type Dialog =
  | { kind: "info" }
  | { kind: "dish"; dish?: MenuDish; category?: MenuDishCategory }
  | { kind: "media"; item?: MenuMedia; section?: MenuMediaSection }
  | { kind: "confirm"; title: string; message: string; run: () => Promise<void> }
  | null;

/** Groups items by a key in the canonical key order, keeping each group's own order. */
function groupBy<T, K extends string>(items: T[], keys: readonly K[], keyOf: (t: T) => K) {
  return keys.map((key) => ({ key, items: items.filter((i) => keyOf(i) === key) }));
}

/** The whole list's ids after moving `id` one step within its group. */
function movedIds<T extends { id: string }, K extends string>(
  groups: { key: K; items: T[] }[],
  id: string,
  delta: -1 | 1,
) {
  const next = groups.map((g) => {
    const i = g.items.findIndex((x) => x.id === id);
    if (i < 0 || i + delta < 0 || i + delta >= g.items.length) return g.items;
    const copy = [...g.items];
    [copy[i], copy[i + delta]] = [copy[i + delta], copy[i]];
    return copy;
  });
  return next.flat().map((x) => x.id);
}

const iconButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

export function MenuStudio({ menu, usedInEvents, canDelete }: { menu: Menu; usedInEvents: number; canDelete: boolean }) {
  const tr = useTr();
  const locale = useLocale().locale;

  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dishes");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const broken = useBrokenImages(useMemo(() => allMenuImageUrls(menu), [menu]));
  const readiness = menuReadiness(menu, broken);
  const dishGroups = groupBy(menu.dishes, MENU_DISH_CATEGORIES, (d) => d.category);
  const mediaGroups = groupBy(menu.media, MENU_MEDIA_SECTIONS, (m) => m.section);
  const photoUsage = new Map<string, number>();
  for (const d of menu.dishes) if (d.photoUrl) photoUsage.set(d.photoUrl, (photoUsage.get(d.photoUrl) ?? 0) + 1);

  const refresh = () => router.refresh();

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
      refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const moveDish = (id: string, delta: -1 | 1) =>
    act(() => menuApi(`/${menu.id}/dishes/order`, "PUT", { ids: movedIds(dishGroups, id, delta) }));
  const moveMedia = (id: string, delta: -1 | 1) =>
    act(() => menuApi(`/${menu.id}/media/order`, "PUT", { ids: movedIds(mediaGroups, id, delta) }));
  const makeCover = (url: string) => act(() => menuApi(`/${menu.id}`, "PATCH", { coverImageUrl: url }));

  async function duplicate() {
    setBusy(true);
    try {
      const copy = await menuApi<{ id: string }>(`/${menu.id}/duplicate`, "POST");
      router.push(`/dashboard/menus/${copy.id}`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  const coverBroken = !!menu.coverImageUrl && broken.has(menu.coverImageUrl);

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-up">
      <Link href="/dashboard/menus" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />  {tr("Barcha menyular")}
      </Link>

      {/* ---------- Header ---------- */}
      <div className={cn("overflow-hidden rounded-2xl border bg-card shadow-sm", menu.isVip ? "border-accent/50" : "border-border")}>
        <div className="grid md:grid-cols-[minmax(0,420px)_1fr]">
          <button
            type="button"
            onClick={() => setDialog({ kind: "info" })}
            className="group relative aspect-[16/10] overflow-hidden bg-muted md:aspect-auto md:min-h-64"
            title={tr("Muqovani almashtirish")}
          >
            <SafeImage src={menu.coverImageUrl} alt={menu.name} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
              <ImageIcon className="mr-2 h-4 w-4" />  {tr("Muqovani almashtirish")}
            </span>
            {(!menu.coverImageUrl || coverBroken) && (
              <span className="absolute left-3 top-3 rounded-full bg-destructive/90 px-2.5 py-1 text-[11px] font-medium text-white">
                {coverBroken ? tr("Muqova ochilmayapti") : tr("Muqova yo'q")}
              </span>
            )}
          </button>

          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{menu.name}</h1>
                  {menu.isVip && (
                    <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-[#111813] via-[#e4eee7] to-[#111813] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#111813]">
                      <Crown className="h-3 w-3" /> VIP
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xl font-semibold text-primary tabular-nums">
                  {formatSom(menu.pricePerPerson, locale)} <span className="text-sm font-normal text-muted-foreground">{tr("/ kishi")}</span>
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setDialog({ kind: "info" })}>
                <Pencil className="h-4 w-4" />  {tr("Tahrirlash")}
              </Button>
            </div>

            {menu.description ? (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{menu.description}</p>
            ) : (
              <button
                type="button"
                onClick={() => setDialog({ kind: "info" })}
                className="w-fit text-sm text-accent underline-offset-4 hover:underline"
              >
                
                {tr("+ Mijoz uchun tavsif qo'shing")}
              </button>
            )}

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-muted px-3 py-1">{menu.dishes.length} ta taom</span>
              <span className="rounded-full bg-muted px-3 py-1">{menu.media.length} ta fayl</span>
              <span className="rounded-full bg-muted px-3 py-1">{usedInEvents}  {tr("ta to'yda ishlatilgan")}</span>
            </div>

            <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
              <Link
                href={`/showcase/${menu.id}`}
                target="_blank"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:brightness-95"
              >
                <ExternalLink className="h-4 w-4" />  {tr("Taqdimotda ko'rish")}
              </Link>
              <Button type="button" variant="outline" size="sm" onClick={duplicate} disabled={busy}>
                <Copy className="h-4 w-4" /> Nusxa olish
              </Button>
              {canDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  disabled={busy || usedInEvents > 0}
                  title={usedInEvents > 0 ? tr(`${usedInEvents} ta to'yda ishlatilgan — o'chirib bo'lmaydi`) : undefined}
                  onClick={() =>
                    setDialog({
                      kind: "confirm",
                      title: tr("Menyuni o'chirish"),
                      message: tr(`"${menu.name}" menyusi barcha taomlari va rasmlari bilan butunlay o'chiriladi.`),
                      run: async () => {
                        await menuApi(`/${menu.id}`, "DELETE");
                        router.push("/dashboard/menus");
                      },
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />  {tr("O'chirish")}
                </Button>
              )}
              {canDelete && usedInEvents > 0 && (
                <span className="self-center text-xs text-muted-foreground">{tr("To'ylarda ishlatilgani uchun o'chirib bo'lmaydi")}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* ---------- Content ---------- */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-xl border border-border bg-card p-1">
              {(
                [
                  ["dishes", tr("Taomlar"), menu.dishes.length, UtensilsCrossed],
                  ["gallery", tr("Galereya"), menu.media.length, ImageIcon],
                ] as const
              ).map(([key, label, count, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4",
                    tab === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-xs tabular-nums",
                      tab === key ? "bg-primary-foreground/20" : "bg-muted",
                    )}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setDialog(tab === "dishes" ? { kind: "dish" } : { kind: "media" })}
            >
              <Plus className="h-4 w-4" /> {tab === "dishes" ? tr("Taom") : "Fayl"}
            </Button>
          </div>

          {tab === "dishes" && (
            <div className="space-y-4">
              {dishGroups.map(({ key: category, items }) => (
                <section key={category} className="rounded-2xl border border-border bg-card">
                  <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                      {tr(MENU_DISH_CATEGORY_LABELS_UZ[category])}
                      <span className="rounded-full bg-muted px-2 text-xs font-normal tabular-nums text-muted-foreground">{items.length}</span>
                      {items.length === 0 && readiness.missingCourses.includes(category) && (
                        <span className="text-xs font-normal text-accent">— mijoz bu turkumni kutadi</span>
                      )}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: "dish", category })}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4" />  {tr("Qo'shish")}
                    </button>
                  </header>
                  {items.length > 0 && (
                    <ul className="divide-y divide-border">
                      {items.map((dish, i) => {
                        const isBroken = !!dish.photoUrl && broken.has(dish.photoUrl);
                        const shared = !!dish.photoUrl && (photoUsage.get(dish.photoUrl) ?? 0) > 1;
                        return (
                          <li key={dish.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                              <SafeImage
                                src={dish.photoUrl}
                                alt={dish.name}
                                className="h-full w-full object-cover"
                                fallbackIcon={<UtensilsCrossed className="h-4 w-4" />}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{dish.name}</p>
                              {dish.description && <p className="truncate text-xs text-muted-foreground">{dish.description}</p>}
                              <div className="mt-1 flex flex-wrap gap-1">
                                {!dish.photoUrl && <Tag tone="warn">{tr("Rasm yo'q")}</Tag>}
                                {isBroken && <Tag tone="danger">{tr("Rasm ochilmayapti")}</Tag>}
                                {shared && !isBroken && <Tag tone="warn">{tr("Boshqa taomlar bilan bir xil rasm")}</Tag>}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center">
                              <button type="button" className={cn(iconButton, "hidden sm:inline-flex")} disabled={busy || i === 0} onClick={() => moveDish(dish.id, -1)} aria-label={tr("Yuqoriga")}>
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button type="button" className={cn(iconButton, "hidden sm:inline-flex")} disabled={busy || i === items.length - 1} onClick={() => moveDish(dish.id, 1)} aria-label={tr("Pastga")}>
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button type="button" className={iconButton} onClick={() => setDialog({ kind: "dish", dish })} aria-label={tr("Tahrirlash")}>
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className={cn(iconButton, "hover:bg-destructive/10 hover:text-destructive")}
                                aria-label={tr("O'chirish")}
                                onClick={() =>
                                  setDialog({
                                    kind: "confirm",
                                    title: tr("Taomni o'chirish"),
                                    message: tr(`"${dish.name}" menyudan olib tashlanadi.`),
                                    run: async () => {
                                      await menuApi(`/${menu.id}/dishes/${dish.id}`, "DELETE");
                                      refresh();
                                    },
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}

          {tab === "gallery" && (
            <div className="space-y-4">
              {mediaGroups.map(({ key: section, items }) => (
                <section key={section} className="rounded-2xl border border-border bg-card">
                  <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                      {tr(MENU_MEDIA_SECTION_LABELS_UZ[section])}
                      <span className="rounded-full bg-muted px-2 text-xs font-normal tabular-nums text-muted-foreground">{items.length}</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: "media", section })}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4" />  {tr("Qo'shish")}
                    </button>
                  </header>
                  {items.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 p-4 min-[480px]:grid-cols-2 xl:grid-cols-3">
                      {items.map((item, i) => {
                        const isVideo = item.mediaType === "VIDEO" || /\.(?:mp4|mov)(?:$|\?)/i.test(item.url);
                        const isBroken = !isVideo && broken.has(item.url);
                        const isCover = item.url === menu.coverImageUrl;
                        return (
                          <div key={item.id} className={cn("overflow-hidden rounded-xl border bg-background", isBroken ? "border-destructive/50" : "border-border")}>
                            <div className="relative aspect-video bg-muted">
                              {isVideo ? (
                                <video
                                  src={item.url}
                                  controls
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                  preload="auto"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <SafeImage src={item.url} alt={item.caption ?? ""} className="h-full w-full object-cover" />
                              )}
                              {isBroken && (
                                <span className="absolute inset-x-0 bottom-0 bg-destructive/90 px-3 py-1.5 text-xs font-medium text-white">
                                  
                                  {tr("Rasm ochilmayapti — almashtiring yoki o'chiring")}
                                </span>
                              )}
                              {isCover && (
                                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-[#e4eee7] backdrop-blur">
                                  <Star className="h-3 w-3 fill-current" />  {tr("Muqova")}
                                </span>
                              )}
                            </div>
                            <p className={cn("truncate px-3 pt-2.5 text-sm font-medium", !item.caption && "font-normal italic text-muted-foreground")}>
                              {item.caption || tr("Izoh yo'q — qo'shing")}
                            </p>
                            <div className="flex items-center gap-0.5 px-1.5 pb-1.5 pt-1">
                              <button type="button" className={iconButton} disabled={busy || i === 0} onClick={() => moveMedia(item.id, -1)} aria-label={tr("Oldinga")}>
                                <ArrowLeft className="h-4 w-4" />
                              </button>
                              <button type="button" className={iconButton} disabled={busy || i === items.length - 1} onClick={() => moveMedia(item.id, 1)} aria-label={tr("Orqaga")}>
                                <ArrowRight className="h-4 w-4" />
                              </button>
                              <span className="flex-1" />
                              {item.mediaType === "PHOTO" && !isCover && !isBroken && (
                                <button type="button" className={iconButton} disabled={busy} onClick={() => makeCover(item.url)} title={tr("Muqova qilish")} aria-label={tr("Muqova qilish")}>
                                  <Star className="h-4 w-4" />
                                </button>
                              )}
                              <button type="button" className={iconButton} onClick={() => setDialog({ kind: "media", item })} aria-label={tr("Tahrirlash")}>
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className={cn(iconButton, "hover:bg-destructive/10 hover:text-destructive")}
                                aria-label={tr("O'chirish")}
                                onClick={() =>
                                  setDialog({
                                    kind: "confirm",
                                    title: tr("Faylni o'chirish"),
                                    message: isCover
                                      ? tr("Bu rasm muqova sifatida ham ishlatilyapti. Galereyadan o'chirilgach muqovada qolaveradi.")
                                      : "Fayl galereyadan olib tashlanadi.",
                                    run: async () => {
                                      await menuApi(`/${menu.id}/media/${item.id}`, "DELETE");
                                      refresh();
                                    },
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>

        {/* ---------- Readiness ---------- */}
        <aside className="order-first lg:sticky lg:top-20 lg:order-none lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-4">
              <ReadinessRing percent={readiness.percent} size={76} />
              <div>
                <p className="font-semibold">{tr("Taqdimotga tayyorlik")}</p>
                <p className="text-xs text-muted-foreground">
                  {readiness.percent >= 85 ? tr("Mijozga ko'rsatsa bo'ladi") : tr("Quyidagilarni to'ldiring")}
                </p>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {readiness.checks.map((c) => {
                const done = c.score >= 0.999;
                return (
                  <li key={c.key}>
                    <button
                      type="button"
                      disabled={done || !c.tab}
                      onClick={() => {
                        if (c.tab === "info") setDialog({ kind: "info" });
                        else if (c.tab) setTab(c.tab);
                      }}
                      className="flex w-full items-start gap-2.5 text-left disabled:cursor-default"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                          done ? "bg-success/15 text-success" : "bg-accent/15 text-accent",
                        )}
                      >
                        {done ? <Check className="h-3 w-3" strokeWidth={3} /> : <AlertTriangle className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0">
                        <span className={cn("block text-sm", done && "text-muted-foreground")}>{tr(c.label)}</span>
                        {!done && c.hint && <span className="block text-xs text-accent">{tr(c.hint)}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>

      <MenuInfoModal open={dialog?.kind === "info"} onClose={() => setDialog(null)} menu={menu} />
      {dialog?.kind === "dish" && (
        <DishModal
          open
          onClose={() => setDialog(null)}
          onSaved={refresh}
          menuId={menu.id}
          dish={dialog.dish}
          category={dialog.category}
        />
      )}
      {dialog?.kind === "media" && (
        <MediaModal
          open
          onClose={() => setDialog(null)}
          onSaved={refresh}
          menuId={menu.id}
          item={dialog.item}
          section={dialog.section}
        />
      )}
      {dialog?.kind === "confirm" && (
        <ConfirmDialog open onClose={() => setDialog(null)} title={dialog.title} message={dialog.message} onConfirm={dialog.run} />
      )}
    </div>
  );
}

function Tag({ tone, children }: { tone: "warn" | "danger"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "warn" ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive",
      )}
    >
      {children}
    </span>
  );
}
