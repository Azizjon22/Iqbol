"use client";

import { LoginForm } from "@/components/auth/login-form";
import { useT } from "@/components/i18n/locale-provider";
import { BrandMark } from "@/components/brand/brand-mark";

export default function LoginPage() {
  const t = useT();

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,var(--surface-glow),transparent)]" />
      <div className="relative mb-8 flex flex-col items-center text-center animate-fade-up">
        <BrandMark className="mb-3 h-12 w-12 text-xl shadow-lg shadow-primary/25" />
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{t("common.brand")}</h1>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t("authExtra.welcome")}</p>
      </div>
      <div className="relative w-full max-w-sm animate-soft-scale rounded-2xl border border-border/80 bg-card p-6 shadow-[0_12px_40px_rgba(28,25,23,0.06)]">
        <LoginForm />
      </div>
    </main>
  );
}
