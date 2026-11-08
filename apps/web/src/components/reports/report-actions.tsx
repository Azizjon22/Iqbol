"use client";

import { useState } from "react";
import { Download, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useTr } from "@/components/i18n/locale-provider";
import { downloadPdf, inTelegramMiniApp } from "@/lib/pdf-delivery";

type Kind = "ACCOUNTING" | "ARCHIVE";
const PERIODS = [
  ["THIS_MONTH", "Shu oy"],
  ["LAST_MONTH", "O'tgan oy"],
  ["THIS_YEAR", "Shu yil"],
  ["ALL", "Butun davr"],
] as const;

/**
 * The super admin's PDF of this page: downloaded, or sent by the Telegram bot
 * (the reliable way inside the Telegram mini app, where downloads are flaky).
 */
export function ReportActions({ kind }: { kind: Kind }) {
  const tr = useTr();
  const [period, setPeriod] = useState<(typeof PERIODS)[number][0]>("THIS_MONTH");
  const [busy, setBusy] = useState<"pdf" | "tg" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function download() {
    // Inside the Telegram mini app a file would cover the app: send it to the chat instead.
    if (inTelegramMiniApp()) return toTelegram();
    setBusy("pdf");
    setMessage(null);
    try {
      await downloadPdf(`/api/reports/pdf?kind=${kind}&period=${period}`);
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
      const res = await fetch("/api/proxy/reports/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, period }),
      });
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
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label={tr("Hisobot davri")}
          value={period}
          onChange={(e) => setPeriod(e.target.value as typeof period)}
          className="h-9 w-auto min-w-36"
        >
          {PERIODS.map(([value, label]) => (
            <option key={value} value={value}>
              {tr(label)}
            </option>
          ))}
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={download} disabled={busy !== null}>
          {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
        </Button>
        <Button type="button" size="sm" onClick={toTelegram} disabled={busy !== null}>
          {busy === "tg" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {tr("Telegramga")}
        </Button>
      </div>
      {message && <p className={message.ok ? "text-xs text-success" : "text-xs text-destructive"}>{message.text}</p>}
    </div>
  );
}
