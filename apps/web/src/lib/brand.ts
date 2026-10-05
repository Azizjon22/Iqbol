import "server-only";
import { cache } from "react";
import { publicApiFetch } from "@/lib/api";
import { DEFAULT_BRAND, type Brand } from "@/lib/brand-shared";

export type { Brand };

/** App-wide brand (name + logo). Deduped per request; never throws. */
export const getBrand = cache(async (): Promise<Brand> => {
  try {
    const b = await publicApiFetch<Brand>("/settings/brand");
    const kind = b.heroMediaKind === "VIDEO" || b.heroMediaKind === "IMAGE" ? b.heroMediaKind : null;
    // A hero video is only shown once it is ready to play everywhere; until
    // then the presentation falls back to its default backdrop.
    const pending = kind === "VIDEO" && !!b.heroMediaStatus && b.heroMediaStatus !== "READY";
    return {
      brandName: b.brandName || DEFAULT_BRAND.brandName,
      logoUrl: b.logoUrl ?? null,
      heroMediaUrl: pending ? null : (b.heroMediaUrl ?? null),
      heroMediaKind: b.heroMediaUrl && !pending ? kind : null,
      heroMediaStatus: b.heroMediaStatus ?? null,
    };
  } catch {
    return DEFAULT_BRAND;
  }
});
