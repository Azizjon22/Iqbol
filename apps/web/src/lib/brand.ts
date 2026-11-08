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
    // A video still transcoding (or one that failed) isn't playable yet —
    // fall back to the default backdrop rather than show a blank/broken one.
    const usable = !!b.heroMediaUrl && (kind !== "VIDEO" || b.heroMediaStatus === "READY");
    return {
      brandName: b.brandName || DEFAULT_BRAND.brandName,
      logoUrl: b.logoUrl ?? null,
      heroMediaUrl: usable ? b.heroMediaUrl : null,
      heroMediaKind: usable ? kind : null,
      heroMediaStatus: b.heroMediaStatus ?? null,
    };
  } catch {
    return DEFAULT_BRAND;
  }
});
