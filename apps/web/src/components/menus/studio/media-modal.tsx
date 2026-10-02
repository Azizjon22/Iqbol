"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useState } from "react";
import { MENU_MEDIA_SECTIONS, MENU_MEDIA_SECTION_LABELS_UZ, type MenuMediaSection } from "@iqbol/shared";
import type { MenuMedia } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { UploadField } from "@/components/uploads/upload-field";
import { menuApi, errorText } from "./api";

function mediaKind(url: string): "PHOTO" | "VIDEO" {
  return /\.(?:mp4|mov)(?:$|\?)/i.test(url) ? "VIDEO" : "PHOTO";
}

export function MediaModal({
  open,
  onClose,
  onSaved,
  menuId,
  item,
  section,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  menuId: string;
  item?: MenuMedia;
  section?: MenuMediaSection;
}) {
  const tr = useTr();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const url = String(form.get("url") ?? "");
    if (!url) return setError(tr("Rasm yoki videoni yuklang"));
    const body = {
      section: form.get("section"),
      mediaType: mediaKind(url),
      url,
      caption: String(form.get("caption") ?? "").trim(),
    };

    setBusy(true);
    setError(undefined);
    try {
      if (item) await menuApi(`/${menuId}/media/${item.id}`, "PATCH", body);
      else await menuApi(`/${menuId}/media`, "POST", body);
      onSaved();
      onClose();
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
      title={item ? tr("Faylni tahrirlash") : tr("Galereyaga qo'shish")}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            
            {tr("Bekor qilish")}
          </Button>
          <Button type="submit" form="media-form" disabled={busy}>
            {busy ? tr("Saqlanmoqda...") : tr("Saqlash")}
          </Button>
        </>
      }
    >
      <form id="media-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <UploadField
            name="url"
            label={tr("Rasm yoki video")}
            folder="menus"
            kind={item?.mediaType === "VIDEO" ? "video" : "image"}
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,.mov"
            browse
            formats="JPG, PNG, WebP, MP4, MOV · 200 MB"
            defaultValue={item?.url}
          />
          <p className="mt-2 text-xs text-muted-foreground">{tr("Video galereyada ovozsiz ko'rsatiladi. Maksimum 200 MB.")}</p>
        </div>
        <div>
          <Label htmlFor="media-section">{tr("Bo'lim")}</Label>
          <Select id="media-section" name="section" defaultValue={item?.section ?? section ?? "HALL"}>
            {MENU_MEDIA_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {tr(MENU_MEDIA_SECTION_LABELS_UZ[s])}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="media-caption">{tr("Izoh — taqdimotda rasm ustida chiqadi")}</Label>
          <Input id="media-caption" name="caption" defaultValue={item?.caption ?? ""} placeholder={tr("masalan: Asosiy zal")} />
        </div>
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  );
}
