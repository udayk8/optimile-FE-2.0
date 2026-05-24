import { useMemo, useState } from "react";
import { PageHeader } from "@/shared/components/common/page-header";
import {
  PlatformEmptyState,
  PlatformFilterBar,
  PlatformPanel,
  PlatformTimeline,
} from "@/modules/platform-admin/components/platform-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Select } from "@/shared/components/ui/select";
import { usePlatformAuditLogs } from "@/modules/platform-admin/hooks/usePlatformAuditLogs";
import { useTenants } from "@/modules/platform-admin/hooks/useTenants";

export function PlatformAuditLogsPage() {
  const { data: auditLogs } = usePlatformAuditLogs();
  const { data: tenants } = useTenants();
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");

  const visibleEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return [...auditLogs]
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .filter((event) => {
        if (
          normalizedSearch &&
          !`${event.actor} ${event.action} ${event.entityName} ${event.entityType}`
            .toLowerCase()
            .includes(normalizedSearch)
        ) {
          return false;
        }
        if (tenantFilter !== "all" && (event.tenantId ?? "global") !== tenantFilter) {
          return false;
        }
        if (resultFilter !== "all" && event.result !== resultFilter) {
          return false;
        }
        return true;
      });
  }, [auditLogs, resultFilter, search, tenantFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform Audit"
        title="Platform Audit Logs"
        description="Chronological platform operations timeline for tenant provisioning, governance updates, and control-plane configuration changes."
      />

      <PlatformFilterBar
        searchValue={search}
        searchPlaceholder="Search by actor, action, entity, or tenant reference"
        onSearchChange={setSearch}
        filters={
          <>
            <Select value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)}>
              <option value="all">All tenants</option>
              <option value="global">Global only</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </Select>
            <Select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)}>
              <option value="all">All results</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="denied">Denied</option>
            </Select>
          </>
        }
        trailing={<div className="text-sm text-muted-foreground">{visibleEvents.length} events shown</div>}
      />

      {visibleEvents.length ? (
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <PlatformPanel
            title="Operations timeline"
            description="Readable event stream for recent platform actions."
          >
            <PlatformTimeline
              items={visibleEvents.slice(0, 8).map((event) => ({
                id: event.id,
                title: `${event.action} Â· ${event.entityName}`,
                description: event.tenantId
                  ? `Tenant reference: ${tenants.find((tenant) => tenant.id === event.tenantId)?.name ?? event.tenantId}`
                  : "Global platform event",
                meta: `${event.actor} Â· ${new Date(event.timestamp).toLocaleString()}`,
                badge: (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={auditActionVariant(event.action)}>{event.action}</Badge>
                    <Badge
                      variant={
                        event.result === "success"
                          ? "success"
                          : event.result === "warning"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {event.result}
                    </Badge>
                  </div>
                ),
              }))}
            />
          </PlatformPanel>

          <PlatformPanel
            title="Audit table"
            description="Operationally scannable history for platform governance."
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    {["Timestamp", "Actor", "Action", "Entity", "Tenant", "Result"].map((header) => (
                      <th key={header} className="border-b border-border/70 bg-background px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleEvents.map((event, index) => (
                    <tr key={event.id} className={`transition-colors hover:bg-primary/[0.035] ${index ? "border-t border-border/65" : ""}`}>
                      <td className="px-4 py-3.5 align-top">{new Date(event.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3.5 align-top">{event.actor}</td>
                      <td className="px-4 py-3.5 align-top">
                        <Badge variant={auditActionVariant(event.action)}>{event.action}</Badge>
                      </td>
                      <td className="px-4 py-3.5 align-top">{event.entityType} / {event.entityName}</td>
                      <td className="px-4 py-3.5 align-top">
                        {event.tenantId ? tenants.find((tenant) => tenant.id === event.tenantId)?.name ?? event.tenantId : "Global"}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <Badge
                          variant={
                            event.result === "success"
                              ? "success"
                              : event.result === "warning"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {event.result}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PlatformPanel>
        </div>
      ) : (
        <PlatformEmptyState
          title="No audit events match the current filters"
          description="Clear or relax the platform audit filters to widen the event timeline."
        />
      )}
    </div>
  );
}

function auditActionVariant(action: string) {
  const normalized = action.toLowerCase();
  if (normalized.includes("create") || normalized.includes("enable")) {
    return "success" as const;
  }
  if (normalized.includes("update") || normalized.includes("assign") || normalized.includes("simulate")) {
    return "info" as const;
  }
  if (normalized.includes("delete") || normalized.includes("disable")) {
    return "danger" as const;
  }
  return "neutral" as const;
}
