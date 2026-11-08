"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImageIcon, KeyRound, Phone, RotateCcw, ShieldCheck } from "lucide-react";
import type { StaffRole } from "@iqbol/shared";
import { changeStaffPasswordAction } from "@/lib/actions/auth.actions";
import type { Brand, HeroMediaKind } from "@/lib/brand-shared";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Input, Label, PasswordInput } from "@/components/ui/input";
import { UploadField } from "@/components/uploads/upload-field";
import { useT } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PasswordCard({ justChanged }: { justChanged: boolean }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(changeStaffPasswordAction, undefined);
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <KeyRound className="h-4 w-4 text-muted-foreground" /> {t("profile.changePassword")}
      </h2>
      {justChanged && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> {t("profile.passwordUpdated")}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
        className="mt-4 grid gap-3 sm:grid-cols-3"
      >
        <input type="hidden" name="redirectTo" value="/dashboard/profile?password=ok" />
        <div>
          <Label htmlFor="currentPassword">{t("profile.currentPassword")}</Label>
          <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" required />
        </div>
        <div>
          <Label htmlFor="newPassword">{t("profile.newPassword")}</Label>
          <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" minLength={6} required />
        </div>
        <div>
          <Label htmlFor="confirmPassword">{t("profile.confirmPassword")}</Label>
          <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" minLength={6} required />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <Button type="submit" variant="outline" disabled={isPending}>
            {isPending ? t("common.saving") : t("profile.updatePassword")}
          </Button>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </div>
      </form>
    </section>
  );
}

function heroKind(url: string | null): HeroMediaKind | null {
  if (!url) return null;
  return /\.(?:mp4|mov)(?:$|\?)/i.test(url) ? "VIDEO" : "IMAGE";
}

function BrandCard({ brand }: { brand: Brand }) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState(brand.brandName);
  const [logoUrl, setLogoUrl] = useState<string | null>(brand.logoUrl);
  const [heroUrl, setHeroUrl] = useState<string | null>(brand.heroMediaUrl);
  const [logoKey, setLogoKey] = useState(0);
  const [heroKey, setHeroKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const trimmed = name.trim();
  const validName = trimmed.length >= 2 && trimmed.length <= 40;
  const dirty = trimmed !== brand.brandName || logoUrl !== brand.logoUrl || heroUrl !== brand.heroMediaUrl;

  // A just-uploaded hero video transcodes in the background — poll until it
  // lands, then swap the preview from the (still-processing) raw upload to
  // the final playable URL the server settled on.
  const wasProcessing = useRef(false);
  useEffect(() => {
    if (brand.heroMediaStatus === "PROCESSING") {
      wasProcessing.current = true;
      const id = setInterval(() => router.refresh(), 4000);
      return () => clearInterval(id);
    }
    if (wasProcessing.current) {
      wasProcessing.current = false;
      setHeroUrl(brand.heroMediaUrl);
    }
  }, [brand.heroMediaStatus, brand.heroMediaUrl, router]);

  async function save() {
    if (!validName) return setError(t("profile.nameLengthError"));
    setBusy(true);
    setError(undefined);
    setSaved(false);
    try {
      const res = await fetch("/api/proxy/settings/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: trimmed,
          logoUrl,
          heroMediaUrl: heroUrl,
          heroMediaKind: heroKind(heroUrl),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((Array.isArray(data?.message) ? data.message[0] : data?.message) ?? t("profile.saveFailed"));
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <ImageIcon className="h-4 w-4 text-muted-foreground" /> {t("profile.brandCardTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("profile.brandCardSubtitle")}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> {t("profile.superAdminOnly")}
        </span>
      </div>

      <div className="mt-5 max-w-md">
        <Label htmlFor="brandName">{t("profile.siteName")}</Label>
        <Input
          id="brandName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder={t("profile.siteNamePlaceholder")}
        />
        <p className={cn("mt-1 text-xs", validName ? "text-muted-foreground" : "text-destructive")}>
          {t("profile.charsCount", { count: trimmed.length })}
        </p>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <BrandMark name={trimmed || "?"} logoUrl={logoUrl} className="h-16 w-16 text-2xl shadow-md" />
            {logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLogoUrl(null);
                  setLogoKey((k) => k + 1);
                }}
              >
                <RotateCcw className="h-4 w-4" /> {t("profile.revertToLetterLogo")}
              </Button>
            )}
          </div>
          <UploadField
            key={logoKey}
            name="logoUpload"
            label={t("profile.logo")}
            folder="branding"
            aspect="square"
            browse
            formats="JPG, PNG, WebP"
            defaultValue={logoUrl}
            onChange={(url) => setLogoUrl(url || null)}
          />
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium">{t("profile.heroFieldTitle")}</p>
            {heroUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setHeroUrl(null);
                  setHeroKey((k) => k + 1);
                }}
              >
                <RotateCcw className="h-4 w-4" /> {t("profile.revertToMenuPhoto")}
              </Button>
            )}
          </div>
          <UploadField
            key={heroKey}
            name="heroUpload"
            label={t("profile.heroField")}
            folder="branding"
            kind={heroKind(heroUrl) === "VIDEO" ? "video" : "image"}
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,.mov"
            aspect="video"
            browse
            formats="JPG, PNG, WebP, MP4, MOV"
            minWidth={1920}
            minHeight={1080}
            defaultValue={heroUrl}
            onChange={(url) => setHeroUrl(url || null)}
          />
          <p className="mt-2 text-xs text-muted-foreground">{t("profile.heroHint")}</p>
          {brand.heroMediaStatus === "PROCESSING" && (
            <p className="mt-1.5 text-xs text-accent">{t("profile.heroProcessing")}</p>
          )}
          {brand.heroMediaStatus === "FAILED" && (
            <p className="mt-1.5 text-xs text-destructive">{t("profile.heroFailed")}</p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="button" onClick={save} disabled={busy || !dirty || !validName}>
          {busy ? t("common.saving") : t("common.save")}
        </Button>
        {dirty && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setName(brand.brandName);
              setLogoUrl(brand.logoUrl);
              setHeroUrl(brand.heroMediaUrl);
              setLogoKey((k) => k + 1);
              setHeroKey((k) => k + 1);
              setError(undefined);
            }}
            disabled={busy}
          >
            {t("common.cancel")}
          </Button>
        )}
        {saved && !dirty && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> {t("profile.saved")}
          </span>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </section>
  );
}

export function ProfilePage({
  user,
  brand,
  canEditBrand,
  passwordChanged,
}: {
  user: { fullName: string; phone: string; role: StaffRole };
  brand: Brand;
  canEditBrand: boolean;
  passwordChanged: boolean;
}) {
  const t = useT();
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-up">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t("profile.title")}</h1>

      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-xl font-semibold text-primary">
          {initials(user.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold">{user.fullName}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {user.phone}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{t(`roles.${user.role}`)}</span>
          </p>
        </div>
      </section>

      {canEditBrand && <BrandCard brand={brand} />}

      <PasswordCard justChanged={passwordChanged} />
    </div>
  );
}
