import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { AuditLogEntry } from "@/lib/types";
import { AuditLogFeed } from "@/components/audit-log/audit-log-feed";

export default async function AuditLogPage() {
  const session = await getSession();
  if (session?.user.kind !== "STAFF" || session.user.role !== "SUPER_ADMIN") redirect("/dashboard");
  const entries = await apiFetch<AuditLogEntry[]>("/audit-logs?limit=300");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Faoliyat tarixi</h1>
        <p className="text-sm text-muted-foreground">
          Barcha xodimlar tizimda nimani o&apos;zgartirgani — sana va vaqti bilan
        </p>
      </div>

      <AuditLogFeed initialEntries={entries} />
    </div>
  );
}
