"use client";

import Script from "next/script";
import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";

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

type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "outside" };

export function TelegramEntry({ next }: { next?: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  async function start() {
    const app = window.Telegram?.WebApp;
    if (!app?.initData) {
      setState({ kind: "outside" });
      return;
    }
    app.ready();
    app.expand();
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
      window.location.replace(data.redirect);
    } catch {
      setState({ kind: "error", message: "Internet aloqasini tekshirib, ilovani qayta oching" });
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onReady={() => void start()} />
      <BrandMark className="h-16 w-16 text-2xl" />
      {state.kind === "loading" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Kirilmoqda…
        </p>
      )}
      {state.kind === "error" && (
        <div className="max-w-sm space-y-3">
          <p className="text-sm font-medium text-destructive">{state.message}</p>
          <p className="text-xs text-muted-foreground">
            Botga qayting, /start bosing va tizimga kiradigan telefon raqamingiz hamda parolingiz (oshpaz — PIN) bilan ulaning.
            Keyin ilovani qayta oching.
          </p>
        </div>
      )}
      {state.kind === "outside" && (
        <div className="max-w-sm space-y-2">
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
