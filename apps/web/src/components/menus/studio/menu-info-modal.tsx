"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Menu } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UploadField } from "@/components/uploads/upload-field";
import { menuApi, errorText } from "./api";

/** Create a menu (menu = undefined) or edit its name, price, text, cover, VIP flag. */
export function MenuInfoModal({ open, onClose, menu }: { open: boolean; onClose: () => void; menu?: Menu }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const price = Number(form.get("pricePerPerson"));
    if (name.length < 2) return setError("Menyu nomini kiriting");
    if (!(price > 0)) return setError("Narx 0 dan katta bo'lishi kerak");

    const cover = String(form.get("coverImageUrl") ?? "");
    const body = {
      name,
      pricePerPerson: price,
      description: String(form.get("description") ?? "").trim(),
      isVip: form.get("isVip") === "on",
      coverImageUrl: cover || (menu ? null : undefined),
    };

    setBusy(true);
    setError(undefined);
    try {
      if (menu) {
        await menuApi(`/${menu.id}`, "PATCH", body);
        onClose();
        router.refresh();
      } else {
        const created = await menuApi<{ id: string }>("", "POST", body);
        router.push(`/dashboard/menus/${created.id}`);
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={menu ? "Menyu ma'lumotlari" : "Yangi menyu"}
      description={menu ? undefined : "Asosiy ma'lumotlar — taomlar va rasmlarni keyingi qadamda qo'shasiz."}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Bekor qilish
          </Button>
          <Button type="submit" form="menu-info-form" disabled={busy}>
            {busy ? "Saqlanmoqda..." : menu ? "Saqlash" : "Menyuni yaratish"}
          </Button>
        </>
      }
    >
      <form id="menu-info-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[260px_1fr]">
        <div className="sm:row-span-2">
          <UploadField name="coverImageUrl" label="Muqova rasmi" folder="menus" defaultValue={menu?.coverImageUrl} />
          <p className="mt-1.5 text-xs text-muted-foreground">Taqdimotning birinchi ekrani va menyu kartasi</p>
        </div>
        <div>
          <Label htmlFor="menu-name">Menyu nomi</Label>
          <Input id="menu-name" name="name" defaultValue={menu?.name} placeholder="masalan: 200 ming menyu" required />
        </div>
        <div>
          <Label htmlFor="menu-price">1 kishiga narx (so&apos;m)</Label>
          <Input
            id="menu-price"
            name="pricePerPerson"
            type="number"
            min={1}
            defaultValue={menu ? Number(menu.pricePerPerson) : undefined}
            required
          />
          {menu && (
            <p className="mt-1 text-xs text-muted-foreground">Allaqachon band qilingan to&apos;ylarning narxi o&apos;zgarmaydi.</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="menu-description">Tavsif — mijoz taqdimotda ko&apos;radi</Label>
          <Textarea
            id="menu-description"
            name="description"
            rows={3}
            defaultValue={menu?.description ?? ""}
            placeholder="masalan: Standart to'y menyusi — salatlar, birinchi va ikkinchi ovqatlar, meva va ichimliklar."
          />
        </div>
        <div className="sm:col-span-2">
          <Switch name="isVip" defaultChecked={menu?.isVip} label="VIP menyu — taqdimotda oltin ramka bilan ajratiladi" />
        </div>
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  );
}
