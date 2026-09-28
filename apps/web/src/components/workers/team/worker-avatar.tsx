import { ChefHat } from "lucide-react";
import type { WorkerPosition } from "@shodiyora/shared";
import { cn } from "@/lib/utils";
import { initials } from "./types";

const RING: Record<WorkerPosition, string> = {
  WAITER_MALE: "ring-primary/40",
  WAITER_FEMALE: "ring-accent/50",
  CHEF: "ring-success/50",
  OTHER: "ring-border",
};

const FILL: Record<WorkerPosition, string> = {
  WAITER_MALE: "bg-primary/10 text-primary",
  WAITER_FEMALE: "bg-accent/15 text-accent",
  CHEF: "bg-success/15 text-success",
  OTHER: "bg-muted text-foreground",
};

export function WorkerAvatar({
  name,
  photoUrl,
  position,
  size = "md",
}: {
  name: string;
  photoUrl: string | null;
  position: WorkerPosition;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "h-16 w-16 text-lg" : size === "md" ? "h-12 w-12 text-sm" : "h-9 w-9 text-xs";
  return (
    <span className={cn("relative shrink-0 rounded-2xl ring-2 ring-offset-2 ring-offset-card", RING[position], box)}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="h-full w-full rounded-2xl object-cover" />
      ) : (
        <span className={cn("flex h-full w-full items-center justify-center rounded-2xl font-semibold", FILL[position])}>
          {initials(name)}
        </span>
      )}
      {position === "CHEF" && (
        <span className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground ring-2 ring-card">
          <ChefHat className="h-3 w-3" />
        </span>
      )}
    </span>
  );
}
