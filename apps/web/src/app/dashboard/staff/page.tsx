import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { StaffUserSummary, WorkerSummary } from "@/lib/types";
import { StaffPage } from "@/components/staff/team/staff-page";

export default async function StaffRoute() {
  const session = await getSession();
  if (!session || session.user.kind !== "STAFF") redirect("/login");
  const [staff, chefs] = await Promise.all([
    apiFetch<StaffUserSummary[]>("/staff-users"),
    apiFetch<WorkerSummary[]>("/workers?position=CHEF"),
  ]);
  return <StaffPage staff={staff} chefs={chefs} currentUserId={session.user.id} />;
}
