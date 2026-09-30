import { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent } from "./card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  tone = "default",
  href,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "primary" | "accent" | "destructive";
  href?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: "bg-muted text-foreground",
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent",
    destructive: "bg-destructive/10 text-destructive",
  };

  const content = (
    <Card
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-[0_4px_20px_rgba(122,31,61,0.08)]",
        href && "transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
      )}
    >
      <CardContent className="relative flex items-center justify-between gap-4 p-4 sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--surface-glow),transparent_55%)]" />
        <div className="relative min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        {icon && (
          <div
            className={cn(
              "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              toneClasses[tone],
            )}
          >
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
