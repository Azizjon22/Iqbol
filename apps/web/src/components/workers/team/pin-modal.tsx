"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useState } from "react";
import { resetWorkerPinAction } from "@/lib/actions/workers.actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function PinModal({ worker, onClose }: { worker: { id: string; fullName: string }; onClose: () => void }) {
  const tr = useTr();

  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function save() {
    setBusy(true);
    setError(undefined);
    const res = await resetWorkerPinAction(worker.id, pin);
    setBusy(false);
    if (res?.error) setError(res.error);
    else onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={tr("PIN kodni tiklash")}
      description={tr(`${worker.fullName} keyingi kirishda PIN'ni o'zi almashtiradi.`)}
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            
            {tr("Bekor qilish")}
          </Button>
          <Button type="button" onClick={save} disabled={busy || pin.length !== 4}>
            {busy ? tr("Saqlanmoqda...") : tr("Saqlash")}
          </Button>
        </>
      }
    >
      <Label htmlFor="new-pin">{tr("Yangi vaqtinchalik PIN (4 raqam)")}</Label>
      <Input
        id="new-pin"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        placeholder="••••"
        autoFocus
        className="text-center text-2xl tracking-[0.5em]"
      />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </Modal>
  );
}
