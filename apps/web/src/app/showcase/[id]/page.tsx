import { publicApiFetch } from "@/lib/api";
import type { Menu } from "@/lib/types";
import { MenuShowcaseDetail } from "@/components/menus/templates/menu-showcase-detail";

export default async function MenuShowcaseDetailPage({ params }: PageProps<"/showcase/[id]">) {
  const { id } = await params;
  const menu = await publicApiFetch<Menu>(`/menus/${id}`);
  return <MenuShowcaseDetail menu={menu} />;
}
