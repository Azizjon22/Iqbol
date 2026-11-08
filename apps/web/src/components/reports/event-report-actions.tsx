"use client";

import { useState } from "react";
import { Download, FileText, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTr } from "@/components/i18n/locale-provider";
import { downloadPdf, inTelegramMiniApp } from "@/lib/pdf-delivery";

/**
 * One wedding's expenses as a PDF to show the client: what was bought and
 * taken from the store (no product prices) and the other costs.
 */
export function EventReportActions({ eventId }: { eventId: string }) {
  const tr = useTr();
  const [busy, setBusy] = useState<"pdf" | "tg" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function download() {
    // Inside the Telegram mini app a file would cover the app: send it to the chat instead.
    if (inTelegramMiniApp()) return toTelegram();
    setBusy("pdf");
    setMessage(null);
    try {
      await downloadPdf(`/api/reports/pdf?event=${eventId}`);
    } catch (err) {
      setMessage({ ok: false, text: tr(err instanceof Error ? err.message : "Xatolik yuz berdi") });
    } finally {
      setBusy(null);
    }
  }

  async function toTelegram() {
    setBusy("tg");
    setMessage(null);
    try {
      const res = await fetch(`/api/proxy/reports/event/${eventId}/telegram`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message ?? "Yuborib bo'lmadi");
      setMessage({ ok: true, text: tr("PDF Telegramga yuborildi") });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : tr("Xatolik yuz berdi") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <FileText className="h-4 w-4 text-primary" /> {tr("Mijoz uchun PDF")}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {tr("Bozordan va ombordan olingan mahsulotlar (narxlarsiz) hamda boshqa xarajatlar.")}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={download} disabled={busy !== null}>
          {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
        </Button>
        <Button type="button" size="sm" onClick={toTelegram} disabled={busy !== null}>
          {busy === "tg" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {tr("Telegramga")}
        </Button>
      </div>
      {message && <p className={message.ok ? "mt-2 text-xs text-success" : "mt-2 text-xs text-destructive"}>{message.text}</p>}
    </div>
  );
}
