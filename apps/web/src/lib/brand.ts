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
    return {
      brandName: b.brandName || DEFAULT_BRAND.brandName,
      logoUrl: b.logoUrl ?? null,
      heroMediaUrl: b.heroMediaUrl ?? null,
      heroMediaKind: b.heroMediaUrl ? kind : null,
    };
  } catch {
    return DEFAULT_BRAND;
  }
});
