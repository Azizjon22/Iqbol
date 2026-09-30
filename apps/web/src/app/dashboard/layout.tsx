import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { apiFetch } from "@/lib/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";

interface OverviewNotifications {
  pendingShoppingLists?: number;
}

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await getSession();
  if (!session || session.user.kind !== "STAFF") {
    redirect("/login");
  }
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  const overview = await apiFetch<OverviewNotifications>("/dashboard/overview").catch(
    (): OverviewNotifications => ({}),
  );

  return (
    <DashboardShell
      fullName={session.user.fullName}
      role={session.user.role}
      pendingShoppingListsCount={overview.pendingShoppingLists ?? 0}
    >
      {children}
    </DashboardShell>
  );
}
