import { publicApiFetch } from "@/lib/api";
import type { Menu } from "@/lib/types";
import { MenuShowcaseDetail } from "@/components/menus/templates/menu-showcase-detail";
import { parseGuestsParam } from "@/components/menus/showcase/guests";

export default async function MenuShowcaseDetailPage({ params, searchParams }: PageProps<"/showcase/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const menu = await publicApiFetch<Menu>(`/menus/${id}`);
  return <MenuShowcaseDetail menu={menu} initialGuests={parseGuestsParam(query.guests)} />;
}
