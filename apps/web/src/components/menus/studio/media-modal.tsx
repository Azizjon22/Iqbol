"use client";

import { useState } from "react";
import { MENU_MEDIA_SECTIONS, MENU_MEDIA_SECTION_LABELS_UZ, type MenuMediaSection } from "@iqbol/shared";
import type { MenuMedia } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { UploadField } from "@/components/uploads/upload-field";
import { cn } from "@/lib/utils";
import { menuApi, errorText } from "./api";

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
  const [kind, setKind] = useState<"PHOTO" | "VIDEO">(item?.mediaType ?? "PHOTO");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const url = String(form.get("url") ?? "");
    if (!url) return setError(kind === "PHOTO" ? "Rasmni yuklang" : "Videoni yuklang");
    const body = {
      section: form.get("section"),
      mediaType: kind,
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
      title={item ? "Faylni tahrirlash" : "Galereyaga qo'shish"}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Bekor qilish
          </Button>
          <Button type="submit" form="media-form" disabled={busy}>
            {busy ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </>
      }
    >
      <form id="media-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        {!item && (
          <div className="sm:col-span-2">
            <div className="inline-flex rounded-lg border border-border p-1">
              {(["PHOTO", "VIDEO"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition",
                    kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {k === "PHOTO" ? "Rasm" : "Video"}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="sm:col-span-2">
          <UploadField
            key={kind}
            name="url"
            label={kind === "PHOTO" ? "Rasm" : "Video (mp4)"}
            kind={kind === "PHOTO" ? "image" : "video"}
            folder="menus"
            accept={kind === "PHOTO" ? "image/jpeg,image/png,image/webp" : "video/mp4"}
            defaultValue={item?.url}
          />
        </div>
        <div>
          <Label htmlFor="media-section">Bo&apos;lim</Label>
          <Select id="media-section" name="section" defaultValue={item?.section ?? section ?? "HALL"}>
            {MENU_MEDIA_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {MENU_MEDIA_SECTION_LABELS_UZ[s]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="media-caption">Izoh — taqdimotda rasm ustida chiqadi</Label>
          <Input id="media-caption" name="caption" defaultValue={item?.caption ?? ""} placeholder="masalan: Asosiy zal" />
        </div>
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  );
}
