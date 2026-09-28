"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { useT } from "@/components/i18n/locale-provider";

export interface LightboxItem {
  url: string;
  caption?: string | null;
  kind: "PHOTO" | "VIDEO";
}

export function Lightbox({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onIndex: (index: number) => void;
}) {
  const t = useT();
  const item = items[index];
  const many = items.length > 1;
  const go = (delta: number) => onIndex((index + delta + items.length) % items.length);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (many && e.key === "ArrowRight") onIndex((index + 1) % items.length);
      if (many && e.key === "ArrowLeft") onIndex((index - 1 + items.length) % items.length);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [index, items.length, many, onClose, onIndex]);

  if (!item) return null;

  const navButton =
    "absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md transition hover:bg-white/15";

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-soft-scale sm:p-10"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={item.caption ?? undefined}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white hover:bg-white/15"
          aria-label={t("presentation.close")}
        >
          <X className="h-5 w-5" />
        </button>

        {many && (
          <>
            <button
              type="button"
              className={`${navButton} left-3 sm:left-6`}
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label={t("presentation.prev")}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              className={`${navButton} right-3 sm:right-6`}
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label={t("presentation.next")}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <div className="flex max-h-full w-full max-w-6xl flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {item.kind === "VIDEO" ? (
            <video key={item.url} src={item.url} controls autoPlay className="max-h-[80vh] w-full rounded-lg" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={item.url} src={item.url} alt={item.caption ?? ""} className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain shadow-2xl animate-soft-scale" />
          )}
        </div>

        <div className="mt-4 flex items-center gap-3 text-sm text-white/80" onClick={(e) => e.stopPropagation()}>
          {item.caption && <span className="font-display text-xl text-white">{item.caption}</span>}
          {many && (
            <span className="tabular-nums text-white/50">
              {index + 1} / {items.length}
            </span>
          )}
        </div>
      </div>
    </Portal>
  );
}
