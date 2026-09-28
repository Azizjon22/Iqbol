import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import { ChefAgenda } from "@/components/worker/chef/chef-agenda";
import type { ChefEvent } from "@/components/worker/chef/types";

export default async function WorkerEventsPage() {
  const session = await getSession();
  if (session?.user.kind !== "WORKER" || session.user.position !== "CHEF") {
    redirect("/worker");
  }
  const agenda = await apiFetch<ChefEvent[]>("/events/chef-agenda");
  return <ChefAgenda events={agenda} />;
}
