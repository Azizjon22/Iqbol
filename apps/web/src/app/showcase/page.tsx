import { publicApiFetch } from "@/lib/api";
import type { Menu } from "@/lib/types";
import { MenuShowcaseList } from "@/components/menus/templates/menu-showcase-list";
import { getBrand } from "@/lib/brand";

export async function generateMetadata() {
  const { brandName } = await getBrand();
  return {
    title: `Menyular | ${brandName}`,
    description: `${brandName} to'yxonasining to'y menyu paketlari.`,
  };
}

export default async function MenuShowcasePage() {
  const menus = await publicApiFetch<Menu[]>("/menus");
  return <MenuShowcaseList menus={menus} />;
}
