/** Brand type + default, safe to import from client components. */
export interface Brand {
  brandName: string;
  logoUrl: string | null;
}

export const DEFAULT_BRAND: Brand = { brandName: "Iqbol", logoUrl: null };
