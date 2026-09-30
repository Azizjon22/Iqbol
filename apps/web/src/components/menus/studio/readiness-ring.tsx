import { cn } from "@/lib/utils";

/** Circular % meter — red → amber → green as a menu gets presentation-ready. */
export function ReadinessRing({ percent, size = 56, className }: { percent: number; size?: number; className?: string }) {
  const stroke = size >= 72 ? 6 : 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = percent >= 85 ? "text-success" : percent >= 60 ? "text-accent" : "text-destructive";

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          className={cn("transition-[stroke-dashoffset] duration-700", tone)}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold tabular-nums",
          size >= 72 ? "text-lg" : "text-xs",
        )}
      >
        {percent}%
      </span>
    </div>
  );
}
