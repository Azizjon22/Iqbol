"use client";

import { useEffect, useState } from "react";

/**
 * Probes each image URL in the browser and reports the ones that fail to
 * load, so dead links can be flagged to staff before a client sees them.
 */
export function useBrokenImages(urls: string[]) {
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const key = [...new Set(urls)].sort().join("|");

  useEffect(() => {
    let cancelled = false;
    const unique = key ? key.split("|") : [];
    for (const url of unique) {
      const img = new Image();
      img.onerror = () => {
        if (!cancelled) setBroken((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
      };
      img.onload = () => {
        if (!cancelled) setBroken((prev) => {
          if (!prev.has(url)) return prev;
          const next = new Set(prev);
          next.delete(url);
          return next;
        });
      };
      img.src = url;
    }
    return () => {
      cancelled = true;
    };
  }, [key]);

  return broken;
}
