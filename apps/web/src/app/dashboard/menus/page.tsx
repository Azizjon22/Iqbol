import { apiFetch } from "@/lib/api";
import type { Menu } from "@/lib/types";
import { MenusStudioList } from "@/components/menus/studio/menus-studio-list";

export default async function MenusPage() {
  const [menus, usage] = await Promise.all([
    apiFetch<Menu[]>("/menus"),
    apiFetch<Record<string, number>>("/menus/usage").catch(() => ({})),
  ]);
  return <MenusStudioList menus={menus} usage={usage} />;
}
