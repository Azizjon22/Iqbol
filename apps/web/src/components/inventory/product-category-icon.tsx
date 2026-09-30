import { Apple, Beef, Carrot, CupSoda, Droplet, FlaskConical, Leaf, Milk, Package, Wheat } from "lucide-react";
import type { ProductCategory } from "@iqbol/shared";

const ICONS: Record<ProductCategory, typeof Carrot> = {
  VEGETABLE: Carrot,
  FRUIT: Apple,
  MEAT: Beef,
  DAIRY: Milk,
  GREENS: Leaf,
  GRAIN: Wheat,
  OIL: Droplet,
  SPICE: FlaskConical,
  DRINK: CupSoda,
  OTHER: Package,
};

export function ProductCategoryIcon({ category, className }: { category: ProductCategory; className?: string }) {
  const Icon = ICONS[category];
  return <Icon className={className} />;
}
