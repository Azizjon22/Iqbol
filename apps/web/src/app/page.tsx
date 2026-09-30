import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (session?.user.kind === "STAFF") redirect("/dashboard");
  if (session?.user.kind === "WORKER") redirect("/worker");
  redirect("/login");
}
