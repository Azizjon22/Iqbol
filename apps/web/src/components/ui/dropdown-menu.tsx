"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTr } from "@/components/i18n/locale-provider";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  hidden?: boolean;
}

/** "⋯" button with a small popover of actions; closes on outside click / Esc. */
export function DropdownMenu({ items, label = "Amallar" }: { items: MenuItem[]; label?: string }) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const visible = items.filter((i) => !i.hidden);

  function place() {
    const button = ref.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const height = menuRef.current?.offsetHeight || visible.length * 40 + 12;
    const width = menuRef.current?.offsetWidth || 208;
    const gap = 6;
    const openUp = rect.bottom + gap + height > window.innerHeight - 8 && rect.top > height + gap;
    const top = openUp ? Math.max(8, rect.top - gap - height) : rect.bottom + gap;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    setPos({ top, left });
  }

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, visible.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={tr(label)}
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-50 min-w-52 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl animate-soft-scale"
          >
            {visible.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition",
                  item.tone === "danger" ? "text-destructive hover:bg-destructive/10" : "hover:bg-muted",
                )}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">{item.icon}</span>
                {tr(item.label)}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
