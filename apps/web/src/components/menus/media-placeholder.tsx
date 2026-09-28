import { ImageIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OrnamentalPattern } from "./ornamental-pattern";

export function MediaPlaceholder({ className, icon }: { className?: string; icon?: ReactNode }) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/30 via-[#102a44] to-background",
        className,
      )}
    >
      <OrnamentalPattern id="ph-ornament" className="text-accent opacity-[0.08]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_30%,rgba(94,182,239,0.18),transparent)]" />
      <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-accent/25 bg-background/40 text-accent/80 backdrop-blur-sm">
        {icon ?? <ImageIcon className="h-5 w-5" />}
      </span>
    </div>
  );
}
