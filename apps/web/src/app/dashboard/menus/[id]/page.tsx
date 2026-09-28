import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Menu } from "@/lib/types";
import { MenuStudio } from "@/components/menus/studio/menu-studio";

export default async function MenuDetailPage({ params }: PageProps<"/dashboard/menus/[id]">) {
  const { id } = await params;
  const [menu, usage, session] = await Promise.all([
    apiFetch<Menu>(`/menus/${id}`),
    apiFetch<Record<string, number>>("/menus/usage").catch(() => ({}) as Record<string, number>),
    getSession(),
  ]);
  const canDelete = session?.user.kind === "STAFF" && session.user.role === "SUPER_ADMIN";
  return <MenuStudio menu={menu} usedInEvents={usage[menu.id] ?? 0} canDelete={canDelete} />;
}
