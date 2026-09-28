"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, UtensilsCrossed } from "lucide-react";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS_UZ, UNITS, UNIT_LABELS_UZ, type InventoryCategory } from "@iqbol/shared";
import type { InventoryItem } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { UploadField } from "@/components/uploads/upload-field";
import { cn } from "@/lib/utils";
import { inventoryApi } from "./helpers";

/** Create a store item, or edit its details (never its quantity — that moves via kirim/chiqim). */
export function ItemModal({
  item,
  defaultCategory = "PRODUCT",
  onClose,
}: {
  item?: InventoryItem;
  defaultCategory?: InventoryCategory;
  onClose: () => void;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<InventoryCategory>(item?.category ?? defaultCategory);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const hasStock = !!item && Number(item.quantity) > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (name.length < 2) return setError("Nomini kiriting");
    const min = String(form.get("minThreshold") ?? "").trim();
    const photo = String(form.get("photoUrl") ?? "");
    const body: Record<string, unknown> = {
      name,
      category,
      unit: form.get("unit"),
      // null clears an existing threshold on edit; omitted on create.
      minThreshold: min === "" ? (item ? null : undefined) : Number(min.replace(",", ".")),
      ...(category === "PRODUCT" ? { productCategory: form.get("productCategory") } : {}),
      ...(photo ? { photoUrl: photo } : {}),
    };
    if (!item) {
      const start = String(form.get("quantity") ?? "").trim();
      if (start) body.quantity = Number(start.replace(",", "."));
    }

    setBusy(true);
    setError(undefined);
    try {
      if (item) await inventoryApi(`/${item.id}`, "PATCH", body);
      else await inventoryApi("", "POST", body);
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
      title={item ? "Mahsulotni tahrirlash" : "Omborga yangi qo'shish"}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Bekor qilish
          </Button>
          <Button type="submit" form="item-form" disabled={busy}>
            {busy ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            ["PRODUCT", "Oziq-ovqat mahsuloti", <Package key="p" className="h-4 w-4" />],
            ["DISHWARE", "Idish-tovoq", <UtensilsCrossed key="d" className="h-4 w-4" />],
          ] as const
        ).map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition",
              category === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      <form id="item-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="sm:row-span-4">
          <UploadField name="photoUrl" label="Rasm" folder="inventory" aspect="square" defaultValue={item?.photoUrl} />
          {category === "PRODUCT" && <p className="mt-1.5 text-xs text-muted-foreground">Oshpaz bozorlik yozishda shu rasmni ko&apos;radi</p>}
        </div>
        <div>
          <Label htmlFor="inv-name">Nomi</Label>
          <Input id="inv-name" name="name" defaultValue={item?.name} placeholder={category === "DISHWARE" ? "masalan: Tarelka (katta)" : "masalan: Guruch"} required />
        </div>
        {category === "PRODUCT" && (
          <div>
            <Label htmlFor="inv-pcat">Bo&apos;lim</Label>
            <Select id="inv-pcat" name="productCategory" defaultValue={item?.productCategory ?? "VEGETABLE"}>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {PRODUCT_CATEGORY_LABELS_UZ[c]}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="grid gap-4 min-[420px]:grid-cols-2">
          <div>
            <Label htmlFor="inv-unit">O&apos;lchov birligi</Label>
            <Select id="inv-unit" name="unit" defaultValue={item?.unit ?? (category === "DISHWARE" ? "DONA" : "KG")} disabled={hasStock}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS_UZ[u]}
                </option>
              ))}
            </Select>
            {hasStock && (
              <>
                <input type="hidden" name="unit" value={item!.unit} />
                <p className="mt-1 text-xs text-muted-foreground">Qoldiq bor paytda birlik o&apos;zgarmaydi</p>
              </>
            )}
          </div>
          <div>
            <Label htmlFor="inv-min">Minimal qoldiq</Label>
            <Input
              id="inv-min"
              name="minThreshold"
              inputMode="decimal"
              defaultValue={item?.minThreshold != null ? String(Number(item.minThreshold)) : ""}
              placeholder="ogohlantirish chegarasi"
            />
          </div>
        </div>
        {!item && (
          <div>
            <Label htmlFor="inv-qty">Boshlang&apos;ich qoldiq (ixtiyoriy)</Label>
            <Input id="inv-qty" name="quantity" inputMode="decimal" placeholder="0" />
          </div>
        )}
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  );
}
