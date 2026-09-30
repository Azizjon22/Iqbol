"use client";
import { useTr } from "@/components/i18n/locale-provider";


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
  const tr = useTr();

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const price = Number(form.get("pricePerPerson"));
    if (name.length < 2) return setError(tr("Menyu nomini kiriting"));
    if (!(price > 0)) return setError(tr("Narx 0 dan katta bo'lishi kerak"));

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
      title={menu ? tr("Menyu ma'lumotlari") : tr("Yangi menyu")}
      description={menu ? undefined : tr("Asosiy ma'lumotlar — taomlar va rasmlarni keyingi qadamda qo'shasiz.")}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            
            {tr("Bekor qilish")}
          </Button>
          <Button type="submit" form="menu-info-form" disabled={busy}>
            {busy ? tr("Saqlanmoqda...") : menu ? tr("Saqlash") : tr("Menyuni yaratish")}
          </Button>
        </>
      }
    >
      <form id="menu-info-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[260px_1fr]">
        <div className="sm:row-span-2">
          <UploadField name="coverImageUrl" label={tr("Muqova rasmi")} folder="menus" defaultValue={menu?.coverImageUrl} />
          <p className="mt-1.5 text-xs text-muted-foreground">{tr("Taqdimotning birinchi ekrani va menyu kartasi")}</p>
        </div>
        <div>
          <Label htmlFor="menu-name">{tr("Menyu nomi")}</Label>
          <Input id="menu-name" name="name" defaultValue={menu?.name} placeholder={tr("masalan: 200 ming menyu")} required />
        </div>
        <div>
          <Label htmlFor="menu-price">{tr("1 kishiga narx (so'm)")}</Label>
          <Input
            id="menu-price"
            name="pricePerPerson"
            type="number"
            min={1}
            defaultValue={menu ? Number(menu.pricePerPerson) : undefined}
            required
          />
          {menu && (
            <p className="mt-1 text-xs text-muted-foreground">{tr("Allaqachon band qilingan to'ylarning narxi o'zgarmaydi.")}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="menu-description">{tr("Tavsif — mijoz taqdimotda ko'radi")}</Label>
          <Textarea
            id="menu-description"
            name="description"
            rows={3}
            defaultValue={menu?.description ?? ""}
            placeholder={tr("masalan: Standart to'y menyusi — salatlar, birinchi va ikkinchi ovqatlar, meva va ichimliklar.")}
          />
        </div>
        <div className="sm:col-span-2">
          <Switch name="isVip" defaultChecked={menu?.isVip} label={tr("VIP menyu — taqdimotda oltin ramka bilan ajratiladi")} />
        </div>
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  );
}
