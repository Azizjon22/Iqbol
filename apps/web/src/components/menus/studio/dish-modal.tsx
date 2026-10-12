"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useRef, useState } from "react";
import { MENU_DISH_CATEGORIES, MENU_DISH_CATEGORY_LABELS_UZ, type MenuDishCategory } from "@iqbol/shared";
import type { MenuDish } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { BilingualField } from "@/components/i18n/bilingual-field";
import { UploadField } from "@/components/uploads/upload-field";
import { menuApi, errorText } from "./api";

export function DishModal({
  open,
  onClose,
  onSaved,
  menuId,
  dish,
  category,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  menuId: string;
  dish?: MenuDish;
  category?: MenuDishCategory;
}) {
  const tr = useTr();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // A ref, not state: the button click and the submit run in the same tick.
  const again = useRef(false);
  const [formKey, setFormKey] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const nameRu = String(form.get("nameRu") ?? "").trim();
    if (name.length < 2 || nameRu.length < 2) return setError(tr("Ikkala tilda ham yozing"));
    const photo = String(form.get("photoUrl") ?? "");
    const body = {
      category: form.get("category"),
      name,
      nameRu,
      description: String(form.get("description") ?? "").trim(),
      descriptionRu: String(form.get("descriptionRu") ?? "").trim(),
      photoUrl: photo || (dish ? null : undefined),
    };

    setBusy(true);
    setError(undefined);
    try {
      if (dish) await menuApi(`/${menuId}/dishes/${dish.id}`, "PATCH", body);
      else await menuApi(`/${menuId}/dishes`, "POST", body);
      onSaved();
      // "Save & add another" keeps the dialog open on a fresh form, same course.
      if (again.current && !dish) setFormKey((k) => k + 1);
      else onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const defaultCategory = dish?.category ?? category ?? "SALAD";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={dish ? tr("Taomni tahrirlash") : tr("Taom qo'shish")}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            
            {tr("Bekor qilish")}
          </Button>
          {!dish && (
            <Button type="submit" form="dish-form" variant="outline" disabled={busy} onClick={() => (again.current = true)}>
              
              {tr("Saqlab, yana qo'shish")}
            </Button>
          )}
          <Button type="submit" form="dish-form" disabled={busy} onClick={() => (again.current = false)}>
            {busy ? tr("Saqlanmoqda...") : tr("Saqlash")}
          </Button>
        </>
      }
    >
      <form suppressHydrationWarning key={formKey} id="dish-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="sm:row-span-3">
          <UploadField name="photoUrl" label={tr("Rasm")} folder="menus" aspect="square" defaultValue={dish?.photoUrl} />
        </div>
        <div>
          <Label htmlFor="dish-category">{tr("Turkum")}</Label>
          <Select id="dish-category" name="category" defaultValue={defaultCategory}>
            {MENU_DISH_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tr(MENU_DISH_CATEGORY_LABELS_UZ[c])}
              </option>
            ))}
          </Select>
        </div>
        <BilingualField
          name="name"
          label={tr("Taom nomi")}
          defaultValue={dish?.name}
          defaultValueRu={dish?.nameRu}
          placeholder={tr("masalan: Olivye")}
          required
        />
        <BilingualField
          name="description"
          label={tr("Qisqa tavsif (ixtiyoriy)")}
          multiline
          rows={3}
          defaultValue={dish?.description}
          defaultValueRu={dish?.descriptionRu}
          placeholder={tr("masalan: Klassik olivye salati")}
        />
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  );
}
