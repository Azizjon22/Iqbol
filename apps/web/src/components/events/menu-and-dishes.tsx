"use client";

import { useState } from "react";
import { Check, PenLine, Soup, UtensilsCrossed } from "lucide-react";
import type { MenuDishCategory } from "@shodiyora/shared";
import type { Menu } from "@/lib/types";
import { Input, Label, Select } from "@/components/ui/input";
import { formatSom, cn } from "@/lib/utils";

function DishChoice({
  name,
  label,
  icon,
  options,
  value,
  onChange,
}: {
  name: "firstDish" | "secondDish";
  label: string;
  icon: React.ReactNode;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const custom = value !== "" && !options.includes(value);
  const [typing, setTyping] = useState(custom || options.length === 0);

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <input type="hidden" name={name} value={value} />
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon} {label} <span className="text-destructive">*</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(o);
                setTyping(false);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40",
              )}
            >
              {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              {o}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setTyping(true);
            if (options.includes(value)) onChange("");
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-sm transition",
            typing ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <PenLine className="h-3.5 w-3.5" /> Boshqa
        </button>
      </div>
      {typing && (
        <Input
          value={custom ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Taom nomini yozing"
          className="mt-2"
          autoFocus={options.length > 0}
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
  defaultSecond = "",
  canSetDishes,
}: {
  menus: Menu[];
  defaultMenuId?: string;
  defaultFirst?: string | null;
  defaultSecond?: string | null;
  canSetDishes: boolean;
}) {
  const [menuId, setMenuId] = useState(defaultMenuId);
  const [first, setFirst] = useState(defaultFirst ?? "");
  const [second, setSecond] = useState(defaultSecond ?? "");
  const menu = menus.find((m) => m.id === menuId);
  const optionsFor = (c: MenuDishCategory) => (menu?.dishes ?? []).filter((d) => d.category === c).map((d) => d.name);

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="menuId">Menyu</Label>
        <Select id="menuId" name="menuId" value={menuId} onChange={(e) => setMenuId(e.target.value)} required>
          <option value="">Tanlang</option>
          {menus.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {formatSom(m.pricePerPerson)} / kishi
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
                onChange={setFirst}
              />
              <DishChoice
                key={`second-${menuId}`}
                name="secondDish"
                label="2-ovqat"
                icon={<UtensilsCrossed className="h-4 w-4 text-accent" />}
                options={optionsFor("SECOND_DISH")}
                value={second}
                onChange={setSecond}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
              Menyuni tanlang — keyin 1-ovqat va 2-ovqatni belgilaysiz.
            </p>
          )}
          <p className="text-xs text-muted-foreground">Oshpaz bozorlikni shu taomlar va mehmonlar soniga qarab yozadi.</p>
        </>
      )}
    </div>
  );
}
