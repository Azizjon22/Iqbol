"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into document.body instead of in place. A `fixed`
 * overlay nested under any ancestor with a CSS transform (e.g. our
 * .animate-fade-up page-entry animation, which ends on transform:
 * translateY(0) and so still counts) gets that ancestor as its
 * containing block instead of the viewport — the overlay then covers
 * and centers within that ancestor's box, not the real screen. A
 * portal sidesteps this entirely.
 */
export function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // document.body doesn't exist during SSR, so this can only run client-side.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
