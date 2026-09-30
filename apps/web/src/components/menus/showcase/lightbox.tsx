"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lock = useRef(false);
  const jumped = useRef(false);
  const settle = useRef<number | undefined>(undefined);

  function scrollToIndex(next: number, behavior: ScrollBehavior) {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.clientWidth === 0) return;
    lock.current = true;
    scroller.scrollTo({ left: next * scroller.clientWidth, behavior });
    window.setTimeout(() => {
      lock.current = false;
    }, behavior === "smooth" ? 480 : 40);
  }

  const go = (delta: number) => {
    const next = (index + delta + items.length) % items.length;
    onIndex(next);
    scrollToIndex(next, "smooth");
  };

  useLayoutEffect(() => {
    if (lock.current) return;
    scrollToIndex(index, jumped.current ? "smooth" : "auto");
    jumped.current = true;
  }, [index]);

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
      window.clearTimeout(settle.current);
    };
  }, [index, items.length, many, onClose, onIndex]);

  if (!item) return null;

  function onScroll() {
    if (lock.current) return;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const scroller = scrollerRef.current;
      if (!scroller || scroller.clientWidth === 0) return;
      const next = Math.round(scroller.scrollLeft / scroller.clientWidth);
      if (next !== index && next >= 0 && next < items.length) onIndex(next);
    }, 70);
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-soft-scale"
        role="dialog"
        aria-modal="true"
        aria-label={item.caption ?? undefined}
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <p className="min-w-0 truncate font-display text-lg text-white sm:text-xl">
            {item.caption}
            {many && <span className="ml-2 text-sm tabular-nums text-white/50">{index + 1} / {items.length}</span>}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-[#1a221c] text-white"
            aria-label={t("presentation.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain"
        >
          {items.map((slide, i) => (
            <div key={`${slide.url}-${i}`} className="h-full w-full shrink-0 snap-center overflow-y-auto overscroll-y-contain">
              <div className="flex min-h-full items-center justify-center px-3 py-3 sm:px-8">
                {slide.kind === "VIDEO" ? (
                  <video
                    key={slide.url}
                    src={slide.url}
                    controls
                    autoPlay={i === index}
                    className="w-full rounded-lg xl:max-h-[70vh]"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.url}
                    alt={slide.caption ?? ""}
                    draggable={false}
                    className="w-full max-w-5xl rounded-lg object-contain shadow-2xl xl:max-h-[75vh] xl:w-auto"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {many && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-white/70 sm:left-6"
              aria-label={t("presentation.prev")}
            >
              <ChevronLeft className="h-7 w-7" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-white/70 sm:right-6"
              aria-label={t("presentation.next")}
            >
              <ChevronRight className="h-7 w-7" strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>
    </Portal>
  );
}
