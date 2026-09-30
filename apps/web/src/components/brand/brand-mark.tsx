"use client";

import { cn } from "@/lib/utils";
import { useBrand } from "./brand-provider";

/**
 * The project's logo: the uploaded image when there is one, otherwise the
 * brand name's first letter on the primary circle. Size comes from className.
 */
export function BrandMark({
  className,
  logoUrl,
  name,
}: {
  className?: string;
  /** Override for previews (e.g. the Profil page before saving). */
  logoUrl?: string | null;
  name?: string;
}) {
  const brand = useBrand();
  const src = logoUrl === undefined ? brand.logoUrl : logoUrl;
  const label = name ?? brand.brandName;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={label} className={cn("block shrink-0 rounded-full bg-card object-cover", className)} />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "font-display flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
        className,
      )}
    >
      {(label.trim()[0] ?? "I").toUpperCase()}
    </span>
  );
}
