"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Portal } from "@/components/ui/portal";

export function VideoThumbnail({
  url,
  caption,
  className,
}: {
  url: string;
  caption?: string | null;
  className?: string;
}) {
  const tr = useTr();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/30 via-accent/15 to-background",
          className,
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-110">
          <Play className="h-6 w-6 translate-x-0.5 fill-current" />
        </span>
        {caption && (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-xs font-medium text-white">
            {caption}
          </span>
        )}
      </button>

      {open && (
        <Portal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
            onClick={() => setOpen(false)}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label={tr("Yopish")}
            >
              <X className="h-5 w-5" />
            </button>
            <video
              src={url}
              controls
              autoPlay
              className="max-h-[85vh] w-full max-w-4xl rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </Portal>
      )}
    </>
  );
}
