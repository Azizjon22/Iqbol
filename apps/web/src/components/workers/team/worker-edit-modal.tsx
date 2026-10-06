"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { WORKER_GENDERS, WORKER_GENDER_LABELS_UZ, WORKER_POSITIONS, WORKER_POSITION_LABELS_UZ } from "@iqbol/shared";
import type { WorkerSummary } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { UploadField } from "@/components/uploads/upload-field";
import { workerApi } from "./types";

export function WorkerEditModal({ worker, onClose }: { worker: WorkerSummary; onClose: () => void }) {
  const tr = useTr();

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const phone = String(form.get("phone") ?? "").replace(/\s/g, "");
    if (fullName.length < 3) return setError(tr("Ism-familiyani to'liq kiriting"));
    if (!/^\+?[0-9]{9,15}$/.test(phone)) return setError(tr("Telefon raqami noto'g'ri"));
    const photo = String(form.get("photoUrl") ?? "");

    setBusy(true);
    setError(undefined);
    try {
      await workerApi(`/${worker.id}`, "PATCH", {
        fullName,
        phone,
        position: form.get("position"),
        gender: form.get("gender"),
        ...(photo ? { photoUrl: photo } : {}),
      });
      onClose();
      router.refresh();
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
      title={tr("Ishchi ma'lumotlari")}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            
            {tr("Bekor qilish")}
          </Button>
          <Button type="submit" form="worker-edit-form" disabled={busy}>
            {busy ? tr("Saqlanmoqda...") : tr("Saqlash")}
          </Button>
        </>
      }
    >
      <form suppressHydrationWarning id="worker-edit-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="sm:row-span-4">
          <UploadField name="photoUrl" label={tr("Rasm")} folder="workers" aspect="square" defaultValue={worker.photoUrl} />
        </div>
        <div>
          <Label htmlFor="w-name">{tr("Ism-familiya")}</Label>
          <Input id="w-name" name="fullName" defaultValue={worker.fullName} required />
        </div>
        <div>
          <Label htmlFor="w-phone">{tr("Telefon")}</Label>
          <Input id="w-phone" name="phone" defaultValue={worker.phone} inputMode="tel" required />
        </div>
        <div className="grid gap-4 min-[420px]:grid-cols-2">
          <div>
            <Label htmlFor="w-position">{tr("Lavozim")}</Label>
            <Select id="w-position" name="position" defaultValue={worker.position}>
              {WORKER_POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {tr(WORKER_POSITION_LABELS_UZ[p])}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="w-gender">{tr("Jinsi")}</Label>
            <Select id="w-gender" name="gender" defaultValue={worker.gender ?? "MALE"}>
              {WORKER_GENDERS.map((g) => (
                <option key={g} value={g}>
                  {tr(WORKER_GENDER_LABELS_UZ[g])}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {worker.position !== "CHEF" && (
          <p className="text-xs text-muted-foreground">
            
            {tr("Oshpazga o'tkazilsa, tizimga kirishi uchun \"PIN tiklash\" orqali PIN bering.")}
          </p>
        )}
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  );
}
