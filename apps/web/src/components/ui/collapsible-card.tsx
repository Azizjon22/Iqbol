"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "./card";
import { cn } from "@/lib/utils";

export function CollapsibleCard({
  icon,
  title,
  meta,
  defaultOpen = false,
  children,
}: {
  icon?: ReactNode;
  title: string;
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50 sm:p-5"
      >
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </span>
        )}
        <span className="flex-1 font-semibold">{title}</span>
        {meta}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-3 border-t border-border p-4 pt-4 sm:p-5 sm:pt-4">{children}</div>}
    </Card>
  );
}
