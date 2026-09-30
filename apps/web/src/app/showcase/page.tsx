import { getTr } from "@/i18n/server-tr";
import { publicApiFetch } from "@/lib/api";
import type { Menu } from "@/lib/types";
import { MenuShowcaseList } from "@/components/menus/templates/menu-showcase-list";
import { getBrand } from "@/lib/brand";

export async function generateMetadata() {
  const tr = await getTr();

  const { brandName } = await getBrand();
  return {
    title: tr(`Menyular | ${brandName}`),
    description: tr(`${brandName} to'yxonasining to'y menyu paketlari.`),
  };
}

export default async function MenuShowcasePage() {
  const [menus, brand] = await Promise.all([publicApiFetch<Menu[]>("/menus"), getBrand()]);
  return <MenuShowcaseList menus={menus} hero={{ url: brand.heroMediaUrl, kind: brand.heroMediaKind }} />;
}
