"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardCheck, Minus, Plus } from "lucide-react";
import { UNIT_LABELS_UZ } from "@iqbol/shared";
import type { InventoryItem, UpcomingEvent } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { formatDate, cn } from "@/lib/utils";
import { inventoryApi, qty } from "./helpers";

export type StockMode = "IN" | "OUT" | "COUNT";

const MODES: { key: StockMode; label: string; icon: React.ReactNode; tone: string }[] = [
  { key: "IN", label: "Kirim", icon: <Plus className="h-4 w-4" />, tone: "bg-success text-success-foreground" },
  { key: "OUT", label: "Chiqim", icon: <Minus className="h-4 w-4" />, tone: "bg-destructive text-destructive-foreground" },
  { key: "COUNT", label: "Sanash", icon: <ClipboardCheck className="h-4 w-4" />, tone: "bg-primary text-primary-foreground" },
];

/** Kirim / chiqim / stocktake for one item, with a live "before → after" preview. */
export function StockModal({
  item,
  initialMode,
  events,
  onClose,
}: {
  item: InventoryItem;
  initialMode: StockMode;
  events: UpcomingEvent[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<StockMode>(initialMode);
  const [amount, setAmount] = useState(initialMode === "COUNT" ? String(Number(item.quantity)) : "");
  const [eventId, setEventId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const current = Number(item.quantity);
  const value = Number(amount.replace(",", "."));
  const valid = amount.trim() !== "" && Number.isFinite(value) && (mode === "COUNT" ? value >= 0 : value > 0);
  const after = !valid ? current : mode === "IN" ? current + value : mode === "OUT" ? current - value : value;
  const overdraw = mode === "OUT" && valid && after < 0;
  const dishware = item.category === "DISHWARE";
  const presets = item.unit === "DONA" ? [10, 50, 100] : [1, 5, 10, 25];
  const unit = UNIT_LABELS_UZ[item.unit];

  function switchMode(next: StockMode) {
    setMode(next);
    setError(undefined);
    setAmount(next === "COUNT" ? String(current) : "");
  }

  async function submit() {
    if (!valid || overdraw) return;
    setBusy(true);
    setError(undefined);
    const event = events.find((e) => e.id === eventId);
    const fullNote = [event ? `To'y: ${event.clientName}` : "", note.trim()].filter(Boolean).join(" — ");
    try {
      if (mode === "COUNT") {
        await inventoryApi(`/${item.id}/count`, "POST", { actual: value, note: fullNote || undefined });
      } else {
        await inventoryApi(`/${item.id}/transactions`, "POST", { type: mode, quantity: value, note: fullNote || undefined });
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  const noChange = mode === "COUNT" && valid && after === current;

  return (
    <Modal
      open
      onClose={onClose}
      title={item.name}
      description={`Hozirgi qoldiq: ${qty(item.quantity, item.unit)}`}
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Bekor qilish
          </Button>
          <Button type="button" onClick={submit} disabled={busy || !valid || overdraw || noChange}>
            {busy ? "Saqlanmoqda..." : mode === "IN" ? "Kirim qilish" : mode === "OUT" ? "Chiqim qilish" : "Qoldiqni tasdiqlash"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => switchMode(m.key)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition",
              mode === m.key ? cn(m.tone, "shadow-sm") : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <Label htmlFor="stock-amount">
          {mode === "COUNT" ? "Omborda haqiqatda qancha bor?" : mode === "IN" ? "Qancha keldi?" : dishware ? "Qancha chiqdi / sindi?" : "Qancha ishlatildi?"}
        </Label>
        <div className="relative">
          <Input
            id="stock-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            autoFocus
            className="h-14 pr-16 text-2xl font-semibold tabular-nums"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{unit}</span>
        </div>
        {mode !== "COUNT" && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {p} {unit}
              </button>
            ))}
            {mode === "OUT" && current > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(current))}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                Hammasi
              </button>
            )}
          </div>
        )}
      </div>

      {mode === "OUT" && !dishware && events.length > 0 && (
        <div className="mt-4">
          <Label htmlFor="stock-event">Qaysi to&apos;y uchun? (ixtiyoriy)</Label>
          <Select id="stock-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">— tanlanmagan —</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {formatDate(e.eventDate)} — {e.clientName}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="mt-4">
        <Label htmlFor="stock-note">Izoh (ixtiyoriy)</Label>
        <Input
          id="stock-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={mode === "IN" ? "masalan: Chorsu bozoridan" : mode === "OUT" ? (dishware ? "masalan: 3 ta singan" : "masalan: oshxonaga") : "masalan: oylik sanoq"}
        />
      </div>

      <div
        className={cn(
          "mt-5 flex items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm",
          overdraw ? "border-destructive/40 bg-destructive/10" : "border-border bg-muted/40",
        )}
      >
        <span className="tabular-nums text-muted-foreground">{qty(current, item.unit)}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className={cn("text-base font-semibold tabular-nums", overdraw ? "text-destructive" : after > current ? "text-success" : after < current ? "text-accent" : "")}>
          {overdraw ? "Yetarli emas" : qty(after, item.unit)}
        </span>
      </div>
      {noChange && <p className="mt-2 text-center text-xs text-muted-foreground">Sanoq hisob bilan bir xil — o&apos;zgarish yo&apos;q.</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </Modal>
  );
}
