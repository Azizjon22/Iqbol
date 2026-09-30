"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_BRAND, type Brand } from "@/lib/brand-shared";

const BrandContext = createContext<Brand>(DEFAULT_BRAND);

export function BrandProvider({ brand, children }: { brand: Brand; children: ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext);
}
