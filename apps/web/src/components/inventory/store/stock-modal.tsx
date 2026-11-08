"use client";
import { useLocale, useTr } from "@/components/i18n/locale-provider";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardCheck, Minus, Plus } from "lucide-react";
import { UNIT_LABELS_UZ } from "@iqbol/shared";
import type { InventoryItem, UpcomingEvent } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { BilingualField } from "@/components/i18n/bilingual-field";
import { usePick } from "@/components/i18n/use-pick";
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
  canSeePrices,
  onClose,
}: {
  item: InventoryItem;
  initialMode: StockMode;
  events: UpcomingEvent[];
  /** Prices are the super admin's alone. */
  canSeePrices: boolean;
  onClose: () => void;
}) {
  const tr = useTr();
  const pick = usePick();
  const locale = useLocale().locale;

  const router = useRouter();
  const [mode, setMode] = useState<StockMode>(initialMode);
  const [amount, setAmount] = useState(initialMode === "COUNT" ? String(Number(item.quantity)) : "");
  const [eventId, setEventId] = useState("");
  const [note, setNote] = useState("");
  const [noteRu, setNoteRu] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // Price lots, oldest first; the newest one's price is the going price.
  const lots = item.lots ?? [];
  const lastPrice = lots.length > 0 ? lots[lots.length - 1].unitPrice : null;
  const [price, setPrice] = useState(lastPrice ? String(Number(lastPrice)) : "");
  const [lotPrices, setLotPrices] = useState<Record<string, string>>({});

  const current = Number(item.quantity);
  const value = Number(amount.replace(",", "."));
  const valid = amount.trim() !== "" && Number.isFinite(value) && (mode === "COUNT" ? value >= 0 : value > 0);
  const after = !valid ? current : mode === "IN" ? current + value : mode === "OUT" ? current - value : value;
  const overdraw = mode === "OUT" && valid && after < 0;
  const dishware = item.category === "DISHWARE";
  const presets = item.unit === "DONA" ? [10, 50, 100] : [1, 5, 10, 25];
  const unit = tr(UNIT_LABELS_UZ[item.unit]);

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
    const fullNoteRu = noteRu.trim()
      ? [event ? `Свадьба: ${event.clientNameRu?.trim() || event.clientName}` : "", noteRu.trim()].filter(Boolean).join(" — ")
      : undefined;
    try {
      if (mode === "COUNT") {
        await inventoryApi(`/${item.id}/count`, "POST", { actual: value, note: fullNote || undefined, noteRu: fullNoteRu });
      } else {
        const unitPrice = Number(price.replace(/\s/g, "").replace(",", "."));
        await inventoryApi(`/${item.id}/transactions`, "POST", {
          type: mode,
          quantity: value,
          note: fullNote || undefined,
          noteRu: fullNoteRu,
          ...(mode === "IN" && canSeePrices && unitPrice > 0 ? { unitPrice } : {}),
        });
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
  const typedPrice = Number(price.replace(/\s/g, "").replace(",", "."));
  const priceChanged = lastPrice !== null && typedPrice > 0 && typedPrice !== Number(lastPrice);

  async function saveLotPrice(lotId: string) {
    const unitPrice = Number((lotPrices[lotId] ?? "").replace(/\s/g, "").replace(",", "."));
    if (!(unitPrice > 0)) return;
    setBusy(true);
    setError(undefined);
    try {
      await inventoryApi(`/lots/${lotId}`, "PATCH", { unitPrice });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={pick(item.name, item.nameRu)}
      description={tr(`Hozirgi qoldiq: ${qty(item.quantity, item.unit)}`)}
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            
            {tr("Bekor qilish")}
          </Button>
          <Button type="button" onClick={submit} disabled={busy || !valid || overdraw || noChange}>
            {busy ? tr("Saqlanmoqda...") : mode === "IN" ? tr("Kirim qilish") : mode === "OUT" ? tr("Chiqim qilish") : tr("Qoldiqni tasdiqlash")}
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
            {m.icon} {tr(m.label)}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <Label htmlFor="stock-amount">
          {mode === "COUNT" ? tr("Omborda haqiqatda qancha bor?") : mode === "IN" ? "Qancha keldi?" : dishware ? "Qancha chiqdi / sindi?" : "Qancha ishlatildi?"}
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
                
                {tr("Hammasi")}
              </button>
            )}
          </div>
        )}
      </div>

      {mode === "IN" && canSeePrices && !dishware && (
        <div className="mt-4">
          <Label htmlFor="stock-price">{tr(`1 ${unit} narxi, so'm`)}</Label>
          <Input
            id="stock-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder={tr("masalan: 15000")}
            className="tabular-nums"
          />
          <p className={cn("mt-1 text-xs", priceChanged ? "text-accent" : "text-muted-foreground")}>
            {priceChanged
              ? tr(`Narx o'zgargan (oldin ${Number(lastPrice).toLocaleString("ru-RU")} so'm): bu kirim alohida partiya bo'lib turadi, avval eski narxdagisi sarflanadi.`)
              : lastPrice !== null
                ? tr(`Oxirgi narx: ${Number(lastPrice).toLocaleString("ru-RU")} so'm. Narx o'zgargan bo'lsa, yangisini yozing.`)
                : tr("Narx kiritilsa, to'yga olinganda tannarxi hisoblanadi.")}
          </p>
        </div>
      )}

      {mode === "OUT" && !dishware && events.length > 0 && (
        <div className="mt-4">
          <Label htmlFor="stock-event">{tr("Qaysi to'y uchun? (ixtiyoriy)")}</Label>
          <Select id="stock-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">— tanlanmagan —</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {formatDate(e.eventDate, locale)} — {pick(e.clientName, e.clientNameRu)}
              </option>
            ))}
          </Select>
        </div>
      )}

      <BilingualField
        name="stock-note"
        submit={false}
        label={tr("Izoh (ixtiyoriy)")}
        className="mt-4"
        placeholder={mode === "IN" ? tr("masalan: Chorsu bozoridan") : mode === "OUT" ? (dishware ? "masalan: 3 ta singan" : "masalan: oshxonaga") : "masalan: oylik sanoq"}
        onValues={(uz, ru) => {
          setNote(uz);
          setNoteRu(ru);
        }}
      />

      <div
        className={cn(
          "mt-5 flex items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm",
          overdraw ? "border-destructive/40 bg-destructive/10" : "border-border bg-muted/40",
        )}
      >
        <span className="tabular-nums text-muted-foreground">{tr(qty(current, item.unit))}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className={cn("text-base font-semibold tabular-nums", overdraw ? "text-destructive" : after > current ? "text-success" : after < current ? "text-accent" : "")}>
          {overdraw ? tr("Yetarli emas") : tr(qty(after, item.unit))}
        </span>
      </div>
      {noChange && <p className="mt-2 text-center text-xs text-muted-foreground">{tr("Sanoq hisob bilan bir xil — o'zgarish yo'q.")}</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {canSeePrices && !dishware && lots.length > 0 && (
        <div className="mt-5 rounded-xl border border-border p-3">
          <p className="text-sm font-semibold">{tr("Narx bo'yicha qoldiq")}</p>
          <p className="mb-2 text-xs text-muted-foreground">{tr("Yuqoridagisi birinchi sarflanadi.")}</p>
          <ul className="space-y-1.5">
            {lots.map((lot) => (
              <li key={lot.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-24 shrink-0 font-medium tabular-nums">{tr(qty(lot.quantity, item.unit))}</span>
                {lot.unitPrice !== null ? (
                  <>
                    <span className="text-muted-foreground tabular-nums">× {Number(lot.unitPrice).toLocaleString("ru-RU")} {tr("so'm")}</span>
                    <span className="ml-auto font-medium tabular-nums">
                      {Math.round(Number(lot.unitPrice) * Number(lot.quantity)).toLocaleString("ru-RU")} {tr("so'm")}
                    </span>
                  </>
                ) : (
                  <>
                    <Input
                      value={lotPrices[lot.id] ?? ""}
                      onChange={(e) => setLotPrices((prev) => ({ ...prev, [lot.id]: e.target.value }))}
                      inputMode="decimal"
                      placeholder={tr(`1 ${unit} narxi`)}
                      className="h-9 min-w-0 flex-1 tabular-nums"
                      aria-label={tr("Partiya narxi")}
                    />
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => saveLotPrice(lot.id)}>
                      {tr("Narxni saqlash")}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
