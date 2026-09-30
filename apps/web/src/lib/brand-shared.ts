/** Brand type + default, safe to import from client components. */
export type HeroMediaKind = "IMAGE" | "VIDEO";

export interface Brand {
  brandName: string;
  logoUrl: string | null;
  heroMediaUrl: string | null;
  heroMediaKind: HeroMediaKind | null;
}

export const DEFAULT_BRAND: Brand = {
  brandName: "Iqbol",
  logoUrl: null,
  heroMediaUrl: null,
  heroMediaKind: null,
};
