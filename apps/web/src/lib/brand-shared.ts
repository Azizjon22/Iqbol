/** Brand type + default, safe to import from client components. */
export type HeroMediaKind = "IMAGE" | "VIDEO";
export type HeroMediaStatus = "READY" | "PROCESSING" | "FAILED";

export interface Brand {
  brandName: string;
  logoUrl: string | null;
  heroMediaUrl: string | null;
  heroMediaKind: HeroMediaKind | null;
  /** Only meaningful while heroMediaKind is VIDEO — a fresh upload transcodes in the background. */
  heroMediaStatus: HeroMediaStatus | null;
}

export const DEFAULT_BRAND: Brand = {
  brandName: "Iqbol",
  logoUrl: null,
  heroMediaUrl: null,
  heroMediaKind: null,
  heroMediaStatus: null,
};

