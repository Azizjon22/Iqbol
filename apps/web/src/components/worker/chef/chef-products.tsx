"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, Pencil, Plus, Search } from "lucide-react";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS_UZ,
  UNITS,
  UNIT_LABELS_UZ,
  type ProductCategory,
  type Unit,
} from "@iqbol/shared";
import type { ProductCatalogItem } from "@/lib/types";
import { useTr } from "@/components/i18n/locale-provider";
import { usePick } from "@/components/i18n/use-pick";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { UploadField } from "@/components/uploads/upload-field";
import { cn } from "@/lib/utils";

const categoryCover = (c: ProductCategory) => `/categories/${c.toLowerCase()}.jpg`;

type Draft = {
  id?: string;
  name: string;
  nameRu: string;
  unit: Unit;
  productCategory: ProductCategory;
  photoUrl: string;
};

const EMPTY: Draft = { name: "", nameRu: "", unit: "KG", productCategory: "VEGETABLE", photoUrl: "" };

/**
 * The shopping catalog from the kitchen's side: the chef adds products with a
 * name and a photo, and fixes them. They show up at once in the shopping list
 * builder. Stock and prices stay with the office.
 */
export function ChefProducts({ products }: { products: ProductCatalogItem[] }) {
  const tr = useTr();
  const pick = usePick();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<ProductCategory | "ALL" | "NO_PHOTO">("ALL");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const withoutPhoto = products.filter((p) => !p.photoUrl).length;
  const sections = PRODUCT_CATEGORIES.filter((c) => products.some((p) => (p.productCategory ?? "OTHER") === c));
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (section === "ALL" ||
          (section === "NO_PHOTO" ? !p.photoUrl : (p.productCategory ?? "OTHER") === section)) &&
        (!q || p.name.toLowerCase().includes(q) || (p.nameRu ?? "").toLowerCase().includes(q)),
    );
  }, [products, query, section]);

  function open(p?: ProductCatalogItem) {
    setError(undefined);
    setDraft(
      p
        ? {
            id: p.id,
            name: p.name,
            nameRu: p.nameRu && p.nameRu !== p.name ? p.nameRu : "",
            unit: p.unit,
            productCategory: p.productCategory ?? "OTHER",
            photoUrl: p.photoUrl ?? "",
          }
        : { ...EMPTY, name: query.trim() },
    );
  }

  async function save() {
    if (!draft) return;
    if (draft.name.trim().length < 2) {
      setError(tr("Mahsulot nomini yozing"));
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const body = {
        name: draft.name.trim(),
        nameRu: draft.nameRu.trim(),
        unit: draft.unit,
        productCategory: draft.productCategory,
        photoUrl: draft.id ? draft.photoUrl : draft.photoUrl || undefined,
      };
      const res = await fetch(`/api/proxy/inventory/chef-products${draft.id ? `/${draft.id}` : ""}`, {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((Array.isArray(data?.message) ? data.message[0] : data?.message) ?? tr("Saqlab bo'lmadi"));
      }
      setDraft(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Saqlab bo'lmadi"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{tr("Mahsulotlar")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr("Bozorlik yozganda shu mahsulotlar chiqadi. Yangisini qo'shing yoki rasmini qo'ying.")}
          </p>
        </div>
        <Button type="button" onClick={() => open()}>
          <Plus className="h-4 w-4" /> {tr("Yangi mahsulot")}
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Mahsulot qidirish")} className="pl-9" />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {(["ALL", ...sections, ...(withoutPhoto > 0 ? ["NO_PHOTO" as const] : [])] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition",
              section === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "ALL"
              ? `${tr("Hammasi")} (${products.length})`
              : s === "NO_PHOTO"
                ? `${tr("Rasmsiz")} (${withoutPhoto})`
                : tr(PRODUCT_CATEGORY_LABELS_UZ[s])}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">{tr("Bunday mahsulot yo'q.")}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => open()}>
            <Plus className="h-4 w-4" /> {query.trim() ? `${tr("Qo'shish")}: ${query.trim()}` : tr("Yangi mahsulot")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 min-[480px]:grid-cols-3 lg:grid-cols-4">
          {shown.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => open(p)}
              className="group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted text-left transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg hover:shadow-primary/15"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.photoUrl ?? categoryCover(p.productCategory ?? "OTHER")}
                alt=""
                loading="lazy"
                className={cn("h-full w-full object-cover transition duration-700 group-hover:scale-110", !p.photoUrl && "opacity-60 grayscale")}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              {!p.photoUrl && (
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                  <ImageOff className="h-3 w-3" /> {tr("Rasm yo'q")}
                </span>
              )}
              <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                <Pencil className="h-3.5 w-3.5" />
              </span>
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1.5 p-2">
                <span className="min-w-0 truncate text-sm font-semibold text-white drop-shadow">{pick(p.name, p.nameRu)}</span>
                <span className="shrink-0 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
                  {tr(UNIT_LABELS_UZ[p.unit])}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={draft !== null}
        onClose={() => !saving && setDraft(null)}
        title={draft?.id ? tr("Mahsulotni tahrirlash") : tr("Yangi mahsulot")}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              {tr("Bekor qilish")}
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? tr("Saqlanmoqda...") : tr("Saqlash")}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <UploadField
              key={draft.id ?? "new"}
              name="photoUrl"
              label={tr("Mahsulot rasmi")}
              folder="inventory"
              aspect="video"
              defaultValue={draft.photoUrl || null}
              onChange={(url) => setDraft((d) => (d ? { ...d, photoUrl: url } : d))}
              formats="JPG, PNG, WebP"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="product-name">{tr("Nomi")}</Label>
                <Input
                  id="product-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder={tr("Masalan: Kartoshka")}
                  maxLength={80}
                  autoFocus={!draft.id}
                />
              </div>
              <div>
                <Label htmlFor="product-name-ru">{tr("Ruscha nomi (ixtiyoriy)")}</Label>
                <Input
                  id="product-name-ru"
                  value={draft.nameRu}
                  onChange={(e) => setDraft({ ...draft, nameRu: e.target.value })}
                  placeholder="Картофель"
                  maxLength={80}
                />
              </div>
              <div>
                <Label htmlFor="product-unit">{tr("O'lchov birligi")}</Label>
                <Select id="product-unit" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as Unit })}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {tr(UNIT_LABELS_UZ[u])}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="product-section">{tr("Bo'lim")}</Label>
                <Select
                  id="product-section"
                  value={draft.productCategory}
                  onChange={(e) => setDraft({ ...draft, productCategory: e.target.value as ProductCategory })}
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {tr(PRODUCT_CATEGORY_LABELS_UZ[c])}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
