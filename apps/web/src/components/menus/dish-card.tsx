import { UtensilsCrossed } from "lucide-react";
import type { MenuDish } from "@/lib/types";
import { MediaPlaceholder } from "./media-placeholder";

export function DishCard({ dish }: { dish: MenuDish }) {
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-square w-full overflow-hidden">
        {dish.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dish.photoUrl}
            alt={dish.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <MediaPlaceholder icon={<UtensilsCrossed className="h-7 w-7 opacity-60" />} />
        )}
      </div>
      <div className="space-y-0.5 p-3">
        <p className="text-sm font-semibold leading-tight">{dish.name}</p>
        {dish.description && <p className="line-clamp-2 text-xs text-muted-foreground">{dish.description}</p>}
      </div>
    </div>
  );
}
