"use client";

import { startTransition, useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Link2, Palette, Phone, RotateCcw, ShieldCheck } from "lucide-react";
import type { StaffRole } from "@iqbol/shared";
import { changeStaffPasswordAction } from "@/lib/actions/auth.actions";
import type { Brand, HeroMediaKind } from "@/lib/brand-shared";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Input, Label, PasswordInput } from "@/components/ui/input";
import { UploadField } from "@/components/uploads/upload-field";
import { useT, useTr } from "@/components/i18n/locale-provider";
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
  const tr = useTr();

  const [state, formAction, isPending] = useActionState(changeStaffPasswordAction, undefined);
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <KeyRound className="h-4 w-4 text-muted-foreground" />  {tr("Parolni o'zgartirish")}
      </h2>
      {justChanged && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />  {tr("Parol yangilandi.")}
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
          <Label htmlFor="currentPassword">{tr("Joriy parol")}</Label>
          <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" required />
        </div>
        <div>
          <Label htmlFor="newPassword">{tr("Yangi parol")}</Label>
          <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" minLength={6} required />
        </div>
        <div>
          <Label htmlFor="confirmPassword">{tr("Takrorlang")}</Label>
          <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" minLength={6} required />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <Button type="submit" variant="outline" disabled={isPending}>
            {isPending ? tr("Saqlanmoqda...") : tr("Parolni yangilash")}
          </Button>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </div>
      </form>
    </section>
  );
}

/** Live preview of where the brand shows up: sidebar, login, client presentation. */
function BrandPreview({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const tr = useTr();

  const shown = name.trim() || "Nomsiz";
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tr("Ko'rinishi")}</p>
      <div className="rounded-xl border border-border bg-background p-3">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{tr("Yon menyu")}</p>
        <div className="flex items-center gap-2.5">
          <BrandMark name={shown} logoUrl={logoUrl} className="h-9 w-9 text-lg" />
          <span className="font-display truncate text-lg font-semibold">{shown}</span>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-background p-4 text-center">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{tr("Kirish sahifasi")}</p>
        <BrandMark name={shown} logoUrl={logoUrl} className="mx-auto h-12 w-12 text-xl shadow-lg shadow-primary/25" />
        <p className="font-display mt-2 truncate text-2xl font-semibold">{shown}</p>
      </div>
      <div className="rounded-xl bg-[#111813] p-4 text-center text-white">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-white/50">{tr("Mijozga taqdimot")}</p>
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.35em] text-[#c5d4c9]">{shown}  {tr("· To'y menyusi")}</p>
      </div>
    </div>
  );
}

function heroKind(url: string | null): HeroMediaKind | null {
  if (!url) return null;
  return /\.(?:mp4|mov)(?:$|\?)/i.test(url) ? "VIDEO" : "IMAGE";
}

function BrandCard({ brand }: { brand: Brand }) {
  const tr = useTr();

  const router = useRouter();
  const [name, setName] = useState(brand.brandName);
  const [logoUrl, setLogoUrl] = useState<string | null>(brand.logoUrl);
  const [heroUrl, setHeroUrl] = useState<string | null>(brand.heroMediaUrl);
  const [heroKey, setHeroKey] = useState(0);
  const [linkMode, setLinkMode] = useState(false);
  const [link, setLink] = useState("");
  const [uploaderKey, setUploaderKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const trimmed = name.trim();
  const dirty = trimmed !== brand.brandName || logoUrl !== brand.logoUrl || heroUrl !== brand.heroMediaUrl;
  const validName = trimmed.length >= 2 && trimmed.length <= 40;

  function applyLink() {
    try {
      const u = new URL(link.trim());
      if (!/^https?:$/.test(u.protocol)) throw new Error();
      setLogoUrl(u.toString());
      setLinkMode(false);
      setError(undefined);
    } catch {
      setError(tr("Havola noto'g'ri — https:// bilan boshlanadigan rasm manzilini kiriting"));
    }
  }

  async function save() {
    if (!validName) return setError(tr("Nom 2 dan 40 belgigacha bo'lishi kerak"));
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
        throw new Error((Array.isArray(data?.message) ? data.message[0] : data?.message) ?? tr("Saqlab bo'lmadi"));
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Palette className="h-4 w-4 text-muted-foreground" /> Loyiha brendi
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            
            {tr("Nom va logo butun loyihada. Orqa fon faqat «To'y menyu paketlari» sahifasida. Video ovozsiz aylanadi.")}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> Faqat super admin
        </span>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <div>
            <Label htmlFor="brandName">{tr("Loyiha nomi")}</Label>
            <Input id="brandName" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={tr("masalan: Iqbol")} />
            <p className={cn("mt-1 text-xs", validName ? "text-muted-foreground" : "text-destructive")}>{trimmed.length}/40 belgi</p>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">{tr("Logo")}</p>
            <div className="flex flex-wrap items-center gap-4">
              <BrandMark name={trimmed || "?"} logoUrl={logoUrl} className="h-20 w-20 text-3xl shadow-md" />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setLinkMode((v) => !v)}>
                  <Link2 className="h-4 w-4" /> Havola orqali
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLogoUrl(null);
                      setUploaderKey((k) => k + 1);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" /> Harfli logoga qaytarish
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-3 max-w-xs">
              <UploadField
                key={uploaderKey}
                name="logoUpload"
                label={tr("Rasm yuklash (kvadrat, PNG/JPG/WebP)")}
                folder="branding"
                aspect="square"
                onChange={(url) => url && setLogoUrl(url)}
              />
            </div>
            {linkMode && (
              <div className="mt-3 flex max-w-lg gap-2">
                <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://.../logo.png" />
                <Button type="button" variant="outline" onClick={applyLink}>
                  
                  {tr("Qo'llash")}
                </Button>
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium">{tr("To'y menyu paketlari — orqa fon")}</p>
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
                  <RotateCcw className="h-4 w-4" /> {tr("Menyudagi rasmga qaytarish")}
                </Button>
              )}
            </div>
            <div className="max-w-md">
              <UploadField
                key={heroKey}
                name="heroUpload"
                label={tr("Orqa fon")}
                folder="branding"
                kind={heroKind(heroUrl) === "VIDEO" ? "video" : "image"}
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,.mov"
                aspect="video"
                browse
                formats="JPG, PNG, WebP, MP4, MOV"
                defaultValue={heroUrl}
                onChange={(url) => setHeroUrl(url || null)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {tr("Rasm yoki video. MP4 va MOV sahifa ochilganda ovozsiz, takrorlanib turadi.")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button type="button" onClick={save} disabled={busy || !dirty || !validName}>
              {busy ? tr("Saqlanmoqda...") : tr("Saqlash")}
            </Button>
            {dirty && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setName(brand.brandName);
                  setLogoUrl(brand.logoUrl);
                  setHeroUrl(brand.heroMediaUrl);
                  setUploaderKey((k) => k + 1);
                  setHeroKey((k) => k + 1);
                  setError(undefined);
                }}
                disabled={busy}
              >
                
                {tr("Bekor qilish")}
              </Button>
            )}
            {saved && !dirty && (
              <span className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />  {tr("Saqlandi — butun loyihada yangilandi")}
              </span>
            )}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </div>

        <BrandPreview name={name} logoUrl={logoUrl} />
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
  const tr = useTr();

  const t = useT();
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-up">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{tr("Profil")}</h1>

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
