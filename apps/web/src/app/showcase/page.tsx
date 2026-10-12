import { getTr } from "@/i18n/server-tr";
import { publicApiFetch } from "@/lib/api";
import type { Menu } from "@/lib/types";
import { MenuShowcaseList } from "@/components/menus/templates/menu-showcase-list";
import { getBrand } from "@/lib/brand";
import { getLocale } from "@/i18n/locale";
import { pickLang } from "@/i18n/pick";

export async function generateMetadata() {
  const tr = await getTr();
  const locale = await getLocale();
  const { brandName, brandNameRu } = await getBrand();
  const titleName = pickLang(locale, brandName, brandNameRu);
  return {
    title: tr(`Menyular | ${titleName}`),
    description: tr(`${titleName} to'yxonasining to'y menyu paketlari.`),
  };
}

export default async function MenuShowcasePage() {
  const [menus, brand] = await Promise.all([publicApiFetch<Menu[]>("/menus"), getBrand()]);
  return <MenuShowcaseList menus={menus} hero={{ url: brand.heroMediaUrl, kind: brand.heroMediaKind }} />;
}
