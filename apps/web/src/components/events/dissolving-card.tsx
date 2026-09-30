"use client";

import { useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const PARTICLE_COUNT = 36;
const DURATION_MS = 1300;

interface Particle {
  left: number;
  top: number;
  dx: number;
  dy: number;
  delay: number;
  size: number;
}

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    dx: (Math.random() - 0.5) * 140,
    dy: -40 - Math.random() * 120,
    delay: Math.random() * 260,
    size: 3 + Math.random() * 4,
  }));
}

/**
 * Wraps a card and, when `dissolving` flips true, plays a one-shot
 * "turn to ash and drift away" transition (a to'y falling off the
 * calendar into the archive at midnight) before calling `onDone`, at
 * which point the caller removes it from the list.
 */
export function DissolvingCard({
  dissolving,
  onDone,
  children,
}: {
  dissolving: boolean;
  onDone: () => void;
  children: ReactNode;
}) {
  const particles = useMemo(() => (dissolving ? makeParticles() : []), [dissolving]);

  useEffect(() => {
    if (!dissolving) return;
    const timer = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDone identity churn shouldn't restart the timer
  }, [dissolving]);

  return (
    <div className="relative">
      <div className={cn(dissolving && "pointer-events-none animate-dissolve-fade")}>{children}</div>
      {particles.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute animate-dissolve-particle rounded-sm bg-primary/70"
          style={
            {
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}ms`,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
