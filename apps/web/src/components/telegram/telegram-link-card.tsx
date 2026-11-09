"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTr } from "@/components/i18n/locale-provider";
import { telegramLinkAction, telegramUnlinkAction, type TelegramStatus } from "@/lib/actions/telegram.actions";

type WebApp = { initData?: string; openTelegramLink?: (url: string) => void };

/**
 * The profile's Telegram card. "Connect" opens the bot with a one-time code:
 * the bot links this account to the chat, and from then on the mini app
 * signs in by itself — no phone and password.
 */
export function TelegramLinkCard({ status }: { status: TelegramStatus }) {
  const tr = useTr();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [waiting, setWaiting] = useState(false);

  // Back from Telegram after tapping Start: show the new state.
  useEffect(() => {
    if (!waiting) return;
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [waiting, router]);

  function connect() {
    setError(undefined);
    startTransition(async () => {
      const res = await telegramLinkAction();
      if (!res.url) {
        setError(res.error ?? tr("Havola olinmadi"));
        return;
      }
      setWaiting(true);
      const app = (window as { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp;
      if (app?.initData && app.openTelegramLink) app.openTelegramLink(res.url);
      else window.open(res.url, "_blank", "noopener");
    });
  }

  function disconnect() {
    if (!window.confirm(tr("Telegram botni hisobingizdan uzasizmi? Xabarlar kelmay qoladi."))) return;
    setError(undefined);
    startTransition(async () => {
      const res = await telegramUnlinkAction();
      if (res.error) setError(res.error);
      router.refresh();
    });
  }

  const linkedAt = status.linkedAt
    ? new Date(status.linkedAt).toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent" })
    : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Send className="h-4 w-4 text-muted-foreground" /> {tr("Telegram bot")}
        {status.botUsername && <span className="text-sm font-normal text-muted-foreground">@{status.botUsername}</span>}
      </h2>

      {!status.enabled ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {tr("Telegram bot hozircha sozlanmagan. Administrator serverda bot tokenini kiritgach, shu yerdan ulaysiz.")}
        </p>
      ) : status.linked ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {tr("Ulangan — ilova botdan login va parolsiz ochiladi.")}
          {linkedAt && <span className="text-muted-foreground">({linkedAt})</span>}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {tr("Bir marta ulang: bot ochiladi, «Start» ni bosasiz — xabarlar shu yerga keladi, ilova esa botdan login va parolsiz ochiladi.")}
        </p>
      )}

      {status.enabled && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {status.linked ? (
            <Button type="button" variant="outline" onClick={disconnect} disabled={pending}>
              <Unlink className="h-4 w-4" /> {tr("Uzish")}
            </Button>
          ) : (
            <Button type="button" onClick={connect} disabled={pending}>
              <Send className="h-4 w-4" /> {pending ? tr("Ochilmoqda...") : tr("Telegram botga ulash")}
            </Button>
          )}
          {waiting && !status.linked && (
            <p className="text-xs text-muted-foreground">{tr("Botda «Start» ni bosgach, shu sahifaga qayting.")}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </section>
  );
}
