"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MediaPlaceholder } from "@/components/menus/media-placeholder";

/**
 * <img> that walks through `fallbacks` if a URL is dead, ending on the
 * ornamental placeholder — a broken link never shows a torn-image icon in
 * front of a client.
 */
export function SafeImage({
  src,
  fallbacks = [],
  alt,
  className,
  fallbackIcon,
  onBroken,
}: {
  src: string | null | undefined;
  fallbacks?: string[];
  alt: string;
  className?: string;
  fallbackIcon?: ReactNode;
  onBroken?: () => void;
}) {
  const candidates = [src, ...fallbacks].filter((u): u is string => !!u);
  const [attempt, setAttempt] = useState(0);
  const ref = useRef<HTMLImageElement>(null);
  const current = candidates[attempt];

  function fail() {
    if (attempt === 0) onBroken?.();
    setAttempt((a) => a + 1);
  }

  // An image that failed before hydration never fires React's onError.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) fail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) return <MediaPlaceholder icon={fallbackIcon} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} key={current} src={current} alt={alt} className={className} onError={fail} />
  );
}
