"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { useT } from "@/components/i18n/locale-provider";

export interface LightboxItem {
  url: string;
  caption?: string | null;
  kind: "PHOTO" | "VIDEO";
  id?: string;
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
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const indexRef = useRef(index);
  const fromSwipe = useRef(false);
  const programmatic = useRef(false);
  const settle = useRef<number | undefined>(undefined);
  // Kept in a ref for the scroll handlers; written after render, not during it.
  useLayoutEffect(() => {
    indexRef.current = index;
  }, [index]);

  function slideWidth(scroller: HTMLDivElement) {
    const slide = scroller.firstElementChild as HTMLElement | null;
    return slide?.offsetWidth || scroller.clientWidth;
  }

  function alignTo(next: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const width = slideWidth(scroller);
    if (width === 0) return;
    const left = next * width;
    if (Math.abs(scroller.scrollLeft - left) < 2) return;
    programmatic.current = true;
    scroller.scrollTo({ left, behavior: "auto" });
  }

  const commitSettled = useCallback(() => {
    const wasProgrammatic = programmatic.current;
    programmatic.current = false;
    if (wasProgrammatic) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const width = slideWidth(scroller);
    if (width === 0) return;
    const offset = scroller.scrollLeft % width;
    const settled = offset < 8 || width - offset < 8;
    if (!settled) return;
    const next = Math.min(items.length - 1, Math.max(0, Math.round(scroller.scrollLeft / width)));
    if (next !== indexRef.current) {
      fromSwipe.current = true;
      onIndex(next);
    }
  }, [items.length, onIndex]);

  const go = (delta: number) => {
    onIndex((index + delta + items.length) % items.length);
  };

  // Portal mounts the scroller after the first render, so align when the
  // node appears. A swipe that already landed must not be scrolled again —
  // that second jump is what skipped from the first dish to the third.
  const setScroller = useCallback((node: HTMLDivElement | null) => {
    scrollerRef.current = node;
    if (!node) return;
    const width = node.firstElementChild instanceof HTMLElement ? node.firstElementChild.offsetWidth : node.clientWidth;
    if (width === 0) return;
    const left = indexRef.current * width;
    if (Math.abs(node.scrollLeft - left) < 2) return;
    programmatic.current = true;
    node.scrollLeft = left;
  }, []);

  useLayoutEffect(() => {
    if (fromSwipe.current) {
      fromSwipe.current = false;
      return;
    }
    alignTo(index);
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
    if (programmatic.current) return;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(commitSettled, 80);
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black/95 animate-soft-scale"
        role="dialog"
        aria-modal="true"
        aria-label={item.caption ?? undefined}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-ink-soft text-white"
          aria-label={t("presentation.close")}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 pb-8 pt-16">
          <h2 className="max-w-3xl text-center font-display text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-tight text-white">
            {item.caption}
            {many && <span className="ml-3 text-base font-sans tabular-nums text-white/50">{index + 1} / {items.length}</span>}
          </h2>

        <div
          ref={setScroller}
          onScroll={onScroll}
          onScrollEnd={commitSettled}
          onPointerDown={() => {
            programmatic.current = false;
          }}
          className="flex w-full min-w-0 max-h-[68vh] snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((slide, i) => (
            <div key={slide.id ?? `${slide.url}-${i}`} className="flex min-w-full max-w-full shrink-0 grow-0 basis-full snap-start snap-always items-center justify-center px-3 sm:px-8">
              {slide.kind === "VIDEO" ? (
                <video
                  key={slide.url}
                  src={slide.url}
                  controls
                  // Only the slide in front downloads and plays; its neighbours wait.
                  autoPlay={i === index}
                  preload={i === index ? "auto" : "none"}
                  playsInline
                  className="max-h-[62vh] max-w-full rounded-lg"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.url}
                  alt={slide.caption ?? ""}
                  draggable={false}
                  className="max-h-[62vh] max-w-full rounded-lg object-contain shadow-2xl"
                />
              )}
            </div>
          ))}
        </div>
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
