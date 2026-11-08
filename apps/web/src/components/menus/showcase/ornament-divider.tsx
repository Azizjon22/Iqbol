import { cn } from "@/lib/utils";

/**
 * Hairline — eight-point star — hairline, in the current text colour.
 * `align="start"` drops the leading line for a compact left-anchored
 * "signature" mark under a heading, instead of the centred divider.
 */
export function OrnamentDivider({
  className,
  align = "center",
}: {
  className?: string;
  align?: "center" | "start";
}) {
  return (
    <div className={cn("flex items-center gap-3", align === "center" ? "justify-center" : "justify-start", className)} aria-hidden="true">
      {align === "center" && <span className="h-px w-12 bg-gradient-to-r from-transparent to-current opacity-60 sm:w-20" />}
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
        <path d="M12 1 L14.6 9.4 L23 12 L14.6 14.6 L12 23 L9.4 14.6 L1 12 L9.4 9.4 Z" fill="currentColor" />
      </svg>
      <span className={cn("h-px bg-gradient-to-l from-transparent to-current opacity-60", align === "center" ? "w-12 sm:w-20" : "w-16")} />
    </div>
  );
}

/** Small filigree corner for the menu card frame. */
export function CornerFlourish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("pointer-events-none absolute h-10 w-10", className)} aria-hidden="true">
      <path d="M2 46 V14 Q2 2 14 2 H46" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M8 46 V18 Q8 8 18 8 H46" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      <path d="M14 14 L16 10 L18 14 L22 16 L18 18 L16 22 L14 18 L10 16 Z" fill="currentColor" />
    </svg>
  );
}
