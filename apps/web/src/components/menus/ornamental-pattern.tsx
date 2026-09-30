import { cn } from "@/lib/utils";

/**
 * A subtle tiled eight-point-star motif (common in Central Asian
 * ornamentation) used as background texture on the public menu showcase.
 * Pure CSS/SVG — no photo asset required.
 */
export function OrnamentalPattern({ className, id = "ornament" }: { className?: string; id?: string }) {
  return (
    <svg className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden="true">
      <defs>
        <pattern id={id} width="64" height="64" patternUnits="userSpaceOnUse">
          <path d="M32 4 L39 26 L61 32 L39 38 L32 60 L25 38 L3 32 L25 26 Z" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
