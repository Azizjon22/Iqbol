"use client";
import { useLocale, useTr } from "@/components/i18n/locale-provider";


import { useState } from "react";
import { Check, PenLine, Soup, UtensilsCrossed } from "lucide-react";
import type { MenuDishCategory } from "@iqbol/shared";
import type { Menu } from "@/lib/types";
import { Label, Select } from "@/components/ui/input";
import { BilingualField } from "@/components/i18n/bilingual-field";
import { usePick } from "@/components/i18n/use-pick";
import { formatSom, cn } from "@/lib/utils";

function DishChoice({
  name,
  label,
  icon,
  options,
  value,
  valueRu,
  onChange,
}: {
  name: "firstDish" | "secondDish";
  label: string;
  icon: React.ReactNode;
  options: { uz: string; ru: string | null }[];
  value: string;
  valueRu: string;
  onChange: (uz: string, ru: string) => void;
}) {
  const tr = useTr();
  const pick = usePick();
  const names = options.map((o) => o.uz);
  const custom = value !== "" && !names.includes(value);
  const [typing, setTyping] = useState(custom || options.length === 0);

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <input type="hidden" name={name} value={value} />
      <input type="hidden" name={`${name}Ru`} value={valueRu} />
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon} {tr(label)} <span className="text-destructive">*</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value === o.uz;
          return (
            <button
              key={o.uz}
              type="button"
              onClick={() => {
                onChange(o.uz, o.ru?.trim() || o.uz);
                setTyping(false);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40",
              )}
            >
              {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              {pick(o.uz, o.ru)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setTyping(true);
            if (names.includes(value)) onChange("", "");
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-sm transition",
            typing ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <PenLine className="h-3.5 w-3.5" /> {tr("Boshqa")}
        </button>
      </div>
      {typing && (
        <BilingualField
          name={`${name}-draft`}
          submit={false}
          className="mt-2"
          placeholder={tr("Taom nomini yozing")}
          defaultValue={custom ? value : ""}
          defaultValueRu={custom ? valueRu : ""}
          onValues={onChange}
        />
      )}
    </div>
  );
}

/**
 * Menu package select plus — for SUPER_ADMIN — the couple's 1st and 2nd dish,
 * offered from that menu's options. Chefs shop by these and the guest count.
 */
export function MenuAndDishes({
  menus,
  defaultMenuId = "",
  defaultFirst = "",
  defaultFirstRu = "",
  defaultSecond = "",
  defaultSecondRu = "",
  canSetDishes,
}: {
  menus: Menu[];
  defaultMenuId?: string;
  defaultFirst?: string | null;
  defaultFirstRu?: string | null;
  defaultSecond?: string | null;
  defaultSecondRu?: string | null;
  canSetDishes: boolean;
}) {
  const tr = useTr();
  const pick = usePick();
  const locale = useLocale().locale;

  const [menuId, setMenuId] = useState(defaultMenuId);
  const [first, setFirst] = useState(defaultFirst ?? "");
  const [firstRu, setFirstRu] = useState(defaultFirstRu ?? "");
  const [second, setSecond] = useState(defaultSecond ?? "");
  const [secondRu, setSecondRu] = useState(defaultSecondRu ?? "");
  const menu = menus.find((m) => m.id === menuId);
  const optionsFor = (c: MenuDishCategory) =>
    (menu?.dishes ?? []).filter((d) => d.category === c).map((d) => ({ uz: d.name, ru: d.nameRu ?? null }));

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="menuId">{tr("Menyu")}</Label>
        <Select id="menuId" name="menuId" value={menuId} onChange={(e) => setMenuId(e.target.value)} required>
          <option value="">{tr("Tanlang")}</option>
          {menus.map((m) => (
            <option key={m.id} value={m.id}>
              {pick(m.name, m.nameRu)} — {formatSom(m.pricePerPerson, locale)} {tr("/ kishi")}
            </option>
          ))}
        </Select>
      </div>

      {canSetDishes && (
        <>
          <input type="hidden" name="canSetDishes" value="1" />
          {menu ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <DishChoice
                key={`first-${menuId}`}
                name="firstDish"
                label="1-ovqat"
                icon={<Soup className="h-4 w-4 text-accent" />}
                options={optionsFor("FIRST_DISH")}
                value={first}
                valueRu={firstRu}
                onChange={(uz, ru) => {
                  setFirst(uz);
                  setFirstRu(ru);
                }}
              />
              <DishChoice
                key={`second-${menuId}`}
                name="secondDish"
                label="2-ovqat"
                icon={<UtensilsCrossed className="h-4 w-4 text-accent" />}
                options={optionsFor("SECOND_DISH")}
                value={second}
                valueRu={secondRu}
                onChange={(uz, ru) => {
                  setSecond(uz);
                  setSecondRu(ru);
                }}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
              
              {tr("Menyuni tanlang — keyin 1-ovqat va 2-ovqatni belgilaysiz.")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{tr("Oshpaz bozorlikni shu taomlar va mehmonlar soniga qarab yozadi.")}</p>
        </>
      )}
    </div>
  );
}
