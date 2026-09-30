import { getTr } from "@/i18n/server-tr";
import { apiFetch } from "@/lib/api";
import type { AuditLogEntry } from "@/lib/types";
import { AuditLogFeed } from "@/components/audit-log/audit-log-feed";

export default async function AuditLogPage() {
  const tr = await getTr();

  const entries = await apiFetch<AuditLogEntry[]>("/audit-logs?limit=300");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{tr("Faoliyat tarixi")}</h1>
        <p className="text-sm text-muted-foreground">
          
          {tr("Barcha xodimlar tizimda nimani o'zgartirgani — sana va vaqti bilan")}
        </p>
      </div>

      <AuditLogFeed initialEntries={entries} />
    </div>
  );
}
