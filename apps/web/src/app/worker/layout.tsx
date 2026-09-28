import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ChefShell } from "@/components/worker/chef/chef-shell";

export default async function WorkerLayout({ children }: LayoutProps<"/worker">) {
  const session = await getSession();
  if (!session || session.user.kind !== "WORKER") {
    redirect("/login");
  }
  if (session.user.mustChangePin) {
    redirect("/change-pin");
  }

  return (
    <ChefShell name={session.user.fullName} isChef={session.user.position === "CHEF"}>
      {children}
    </ChefShell>
  );
}
