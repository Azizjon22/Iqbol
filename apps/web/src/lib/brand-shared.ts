/** Brand type + default, safe to import from client components. */
export type HeroMediaKind = "IMAGE" | "VIDEO";

export interface Brand {
  brandName: string;
  logoUrl: string | null;
  heroMediaUrl: string | null;
  heroMediaKind: HeroMediaKind | null;
  /** "PROCESSING" while a freshly uploaded hero video is being prepared. */
  heroMediaStatus?: "READY" | "PROCESSING" | "FAILED" | null;
}

export const DEFAULT_BRAND: Brand = {
  brandName: "Iqbol",
  logoUrl: null,
  heroMediaUrl: null,
  heroMediaKind: null,
};
