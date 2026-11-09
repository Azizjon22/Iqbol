"use client";

import Script from "next/script";
import { useState } from "react";
import { AlertCircle, Send } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { useBrand } from "@/components/brand/brand-provider";

interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

type State = { kind: "loading"; step: number } | { kind: "error"; message: string } | { kind: "outside" };

const STEPS = ["Telegram tekshirilmoqda", "Hisobingiz ochilmoqda", "Sahifa tayyorlanmoqda"];

export function TelegramEntry({ next }: { next?: string }) {
  const brand = useBrand();
  const [state, setState] = useState<State>({ kind: "loading", step: 0 });

  async function start() {
    const app = window.Telegram?.WebApp;
    if (!app?.initData) {
      setState({ kind: "outside" });
      return;
    }
    app.ready();
    app.expand();
    setState({ kind: "loading", step: 1 });
    try {
      const res = await fetch("/api/telegram/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: app.initData, next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.redirect) {
        setState({ kind: "error", message: data?.message ?? "Kirib bo'lmadi" });
        return;
      }
      setState({ kind: "loading", step: 2 });
      window.location.replace(data.redirect);
    } catch {
      setState({ kind: "error", message: "Internet aloqasini tekshirib, ilovani qayta oching" });
    }
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onReady={() => void start()} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_38%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]" />

      <div className="relative flex flex-col items-center animate-soft-scale">
        <div className="relative">
          {state.kind === "loading" && (
            <>
              <span className="animate-splash-ring absolute inset-0 rounded-full bg-primary/25" />
              <span className="animate-splash-ring absolute inset-0 rounded-full bg-primary/20 [animation-delay:0.6s]" />
            </>
          )}
          <BrandMark className="relative h-24 w-24 text-4xl shadow-xl shadow-primary/25 ring-4 ring-background" />
        </div>
        <h1 className="font-display mt-6 text-3xl font-semibold tracking-tight">{brand.brandName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">To&apos;yxona boshqaruv tizimi</p>
      </div>

      {state.kind === "loading" && (
        <div className="relative mt-10 w-full max-w-60 animate-fade-up">
          <div className="h-1 overflow-hidden rounded-full bg-foreground/10">
            <div className="animate-splash-bar h-full w-2/5 rounded-full bg-primary" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground/80">{STEPS[state.step]}…</p>
          <ol className="mt-3 flex justify-center gap-1.5" aria-hidden>
            {STEPS.map((step, i) => (
              <li key={step} className={`h-1.5 rounded-full transition-all duration-500 ${i <= state.step ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />
            ))}
          </ol>
        </div>
      )}

      {state.kind === "error" && (
        <div className="relative mt-8 w-full max-w-sm rounded-2xl border border-destructive/30 bg-card p-4 text-left shadow-sm animate-fade-up">
          <p className="flex items-start gap-2 text-sm font-semibold text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.message}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Avval saytga kirib, Profil sahifasidagi «Telegram botga ulash» tugmasini bosing (yoki botda /start bosib,
            telefon raqamingiz va parolingiz bilan ulaning). Keyin ilovani qayta oching.
          </p>
          <button
            type="button"
            onClick={() => {
              setState({ kind: "loading", step: 0 });
              void start();
            }}
            className="mt-3 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-95"
          >
            Qayta urinish
          </button>
        </div>
      )}

      {state.kind === "outside" && (
        <div className="relative mt-8 max-w-sm space-y-2 animate-fade-up">
          <p className="flex items-center justify-center gap-2 text-sm font-medium">
            <Send className="h-4 w-4 text-primary" /> Bu sahifa Telegram ichida ochiladi
          </p>
          <p className="text-xs text-muted-foreground">
            Brauzerda ishlash uchun <a className="text-primary underline" href="/login">login sahifasiga</a> o&apos;ting.
          </p>
        </div>
      )}
    </main>
  );
}
