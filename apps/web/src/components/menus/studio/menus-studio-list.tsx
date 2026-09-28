"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarHeart, Copy, Crown, ExternalLink, ImageIcon, Pencil, Plus, UtensilsCrossed } from "lucide-react";
import type { Menu } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/menus/showcase/safe-image";
import { formatSom, cn } from "@/lib/utils";
import { MenuInfoModal } from "./menu-info-modal";
import { ReadinessRing } from "./readiness-ring";
import { menuReadiness, allMenuImageUrls } from "./readiness";
import { useBrokenImages } from "./use-broken-images";
import { menuApi, errorText } from "./api";

export function MenusStudioList({ menus, usage }: { menus: Menu[]; usage: Record<string, number> }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  const broken = useBrokenImages(useMemo(() => menus.flatMap(allMenuImageUrls), [menus]));
  const sorted = [...menus].sort((a, b) => Number(a.pricePerPerson) - Number(b.pricePerPerson));
  const readiness = sorted.map((m) => menuReadiness(m, broken));
  const needAttention = readiness.filter((r) => r.percent < 85).length;

  async function duplicate(menu: Menu) {
    setBusyId(menu.id);
    setError(undefined);
    try {
      const copy = await menuApi<{ id: string }>(`/${menu.id}/duplicate`, "POST");
      router.push(`/dashboard/menus/${copy.id}`);
    } catch (err) {
      setError(errorText(err));
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Menyular</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Har bir menyu mijozga taqdimotda shu ko&apos;rinishda chiqadi. Foiz — menyu taqdimotga qanchalik tayyor ekanini
            ko&apos;rsatadi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/showcase"
            target="_blank"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-input px-4 text-sm font-medium transition hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" /> Taqdimotni ochish
          </Link>
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Yangi menyu
          </Button>
        </div>
      </div>

      {sorted.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Menyular", value: sorted.length },
            { label: "Narx oralig'i", value: `${Number(sorted[0].pricePerPerson) / 1000}–${Number(sorted[sorted.length - 1].pricePerPerson) / 1000} ming` },
            { label: "Jami to'ylarda", value: Object.values(usage).reduce((s, n) => s + n, 0) },
            { label: "E'tibor kerak", value: needAttention, warn: needAttention > 0 },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("mt-1 text-xl font-semibold tabular-nums", s.warn && "text-accent")}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {sorted.map((menu, i) => {
          const r = readiness[i];
          const issues = r.checks.filter((c) => c.hint).slice(0, 2);
          const photos = menu.media.filter((m) => m.mediaType === "PHOTO").length;
          const used = usage[menu.id] ?? 0;
          return (
            <div
              key={menu.id}
              className={cn(
                "group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
                menu.isVip ? "border-accent/50" : "border-border",
              )}
            >
              <Link href={`/dashboard/menus/${menu.id}`} className="relative block aspect-[16/9] overflow-hidden bg-muted">
                <SafeImage
                  src={menu.coverImageUrl}
                  fallbacks={menu.media.filter((m) => m.mediaType === "PHOTO").map((m) => m.url)}
                  alt={menu.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                {menu.isVip && (
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#c99a52] via-[#f1d9a0] to-[#c99a52] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#24180a]">
                    <Crown className="h-3 w-3" /> VIP
                  </span>
                )}
                {(!menu.coverImageUrl || broken.has(menu.coverImageUrl)) && (
                  <span className="absolute right-3 top-3 rounded-full bg-destructive/90 px-2.5 py-1 text-[11px] font-medium text-white">
                    {menu.coverImageUrl ? "Muqova ochilmayapti" : "Muqova yo'q"}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="font-display text-2xl font-semibold leading-tight">{menu.name}</p>
                  <p className="text-sm text-white/80 tabular-nums">{formatSom(menu.pricePerPerson)} / kishi</p>
                </div>
              </Link>

              <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex items-center gap-4">
                  <ReadinessRing percent={r.percent} />
                  <div className="min-w-0 flex-1 space-y-1">
                    {issues.length === 0 ? (
                      <p className="text-sm font-medium text-success">Taqdimotga tayyor</p>
                    ) : (
                      issues.map((c) => (
                        <p key={c.key} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> {c.hint}
                        </p>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-muted/60 px-2 py-2">
                    <UtensilsCrossed className="mx-auto mb-1 h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-semibold tabular-nums">{menu.dishes.length}</span> taom
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2 py-2">
                    <ImageIcon className="mx-auto mb-1 h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-semibold tabular-nums">{photos}</span> rasm
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2 py-2">
                    <CalendarHeart className="mx-auto mb-1 h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-semibold tabular-nums">{used}</span> to&apos;y
                  </div>
                </div>

                <div className="mt-auto flex gap-2">
                  <Link
                    href={`/dashboard/menus/${menu.id}`}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:brightness-95"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Tahrirlash
                  </Link>
                  <button
                    type="button"
                    onClick={() => duplicate(menu)}
                    disabled={busyId !== null}
                    title="Nusxa olish — yangi narx darajasi uchun"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                    aria-label="Nusxa olish"
                  >
                    <Copy className={cn("h-4 w-4", busyId === menu.id && "animate-pulse")} />
                  </button>
                  <Link
                    href={`/showcase/${menu.id}`}
                    target="_blank"
                    title="Taqdimotda ko'rish"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Taqdimotda ko'rish"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Plus className="h-6 w-6" />
          </span>
          <span className="text-sm font-medium">Yangi menyu qo&apos;shish</span>
        </button>
      </div>

      <MenuInfoModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
