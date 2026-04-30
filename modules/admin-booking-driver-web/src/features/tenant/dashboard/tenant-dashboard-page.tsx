import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { GitBranchPlus, ShieldUser, Users, Waypoints } from "lucide-react";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { PlatformTimeline } from "@/components/platform/platform-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TenantPanel } from "@/components/tenant/tenant-primitives";
import { useTenantAuditLogs } from "@/hooks/useTenantAuditLogs";
import { useTenantModules } from "@/hooks/useTenantModules";
import { useTenantOrgTypes } from "@/hooks/useTenantOrgTypes";
import { useTenantOrgUnits } from "@/hooks/useTenantOrgUnits";
import { usePlatformModules } from "@/hooks/usePlatformModules";
import { useTenantRoles } from "@/hooks/useTenantRoles";
import { useTenantRouteContext } from "@/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { getAccessibleModuleCodes } from "@/lib/tenant-admin";

export function TenantDashboardPage() {
  const { tenant } = useTenantRouteContext();
  const { data: orgUnits } = useTenantOrgUnits(tenant.id);
  const { data: users } = useTenantUsers(tenant.id);
  const { data: roles } = useTenantRoles(tenant.id);
  const { data: tenantModules } = useTenantModules(tenant.id);
  const { data: levels } = useTenantOrgTypes(tenant.id);
  const { data: auditLogs } = useTenantAuditLogs(tenant.id);
  const { data: modules } = usePlatformModules();

  const activeUsers = users.filter((user) => user.status === "active");
  const enabledModuleCodes = getAccessibleModuleCodes(tenant.enabledModuleCodes, modules);
  const enabledActiveModuleSet = new Set(enabledModuleCodes);
  const validRoles = roles.filter(
    (role) =>
      role.active &&
      role.moduleCodes.length > 0 &&
      role.moduleCodes.every((code) => enabledActiveModuleSet.has(code)),
  );
  const enabledModuleNames = enabledModuleCodes;
  const latestAudit = auditLogs.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title="Tenant Dashboard"
        description="Operational view of tenant structure, user access, and setup progress across the admin workspace."
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to={`/tenant/${tenant.id}/org-units`}>Manage org units</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/tenant/${tenant.id}/users`}>Manage users</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Hierarchy levels"
          value={levels.length}
          icon={GitBranchPlus}
          note={levels.map((level) => level.name).join(" -> ")}
        />
        <MetricCard
          label="Org units"
          value={orgUnits.length}
          icon={GitBranchPlus}
          note="Tenant business structure and data scope"
        />
        <MetricCard
          label="Active users"
          value={activeUsers.length}
          icon={Users}
          note={`${users.length} total users across assigned org units`}
        />
        <MetricCard
          label="Valid roles"
          value={validRoles.length}
          icon={ShieldUser}
          note={`${enabledModuleNames.length} enabled modules, ${tenantModules.length} module features`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <TenantPanel
          title="Priority actions"
          description="Core setup actions that keep the tenant workspace operational and aligned."
        >
          <div className="grid gap-3">
            <ActionRow
              title="Hierarchy structure"
              description="Maintain ordered levels before adding or moving org units."
              action={<Button asChild variant="outline" size="sm"><Link to={`/tenant/${tenant.id}/hierarchy`}>Open</Link></Button>}
            />
            <ActionRow
              title="Org units"
              description="Create business nodes and maintain the operating tree."
              action={<Button asChild variant="outline" size="sm"><Link to={`/tenant/${tenant.id}/org-units`}>Open</Link></Button>}
            />
            <ActionRow
              title="Users"
              description="Assign roles and valid org-unit scope to tenant users."
              action={<Button asChild variant="outline" size="sm"><Link to={`/tenant/${tenant.id}/users`}>Open</Link></Button>}
            />
            <ActionRow
              title="Access Control System"
              description="Review users, roles, permissions, and role-to-level assignment rules."
              action={<Button asChild variant="outline" size="sm"><Link to={`/tenant/${tenant.id}/role-permissions`}>Open</Link></Button>}
            />
            <ActionRow
              title="Master data"
              description="Maintain vehicle types, materials, LR configuration, and customer-material mapping."
              action={<Button asChild variant="outline" size="sm"><Link to={`/tenant/${tenant.id}/materials`}>Open</Link></Button>}
            />
          </div>
        </TenantPanel>

        <TenantPanel
          title="Tenant snapshot"
          description="Current structure, access coverage, and enabled operational scope."
        >
          <div className="space-y-3">
            <SnapshotRow label="Current hierarchy" value={levels.map((level) => level.name).join(" -> ") || "No levels defined"} />
            <SnapshotRow label="Enabled modules" value={enabledModuleNames.join(", ") || "No modules enabled"} />
            <SnapshotRow label="Role coverage" value={`${roles.length} roles, ${validRoles.length} currently valid`} />
            <SnapshotRow label="User coverage" value={`${users.length} users, ${activeUsers.length} active`} />
            <SnapshotRow label="Module deactivation" value="Access removed immediately; data retained." />
          </div>
        </TenantPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <TenantPanel title="Recent tenant activity" description="Latest tenant-scoped operational and administrative events.">
          <PlatformTimeline
            items={latestAudit.map((event) => ({
              id: event.id,
              title: `${event.action} - ${event.entityName}`,
              description: event.summary,
              meta: `${event.actor} - ${new Date(event.timestamp).toLocaleString()}`,
              badge: (
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
              ),
            }))}
          />
        </TenantPanel>

        <TenantPanel title="Operating rules" description="Core rules that govern tenant setup and daily access control.">
          <div className="space-y-3">
            <SnapshotRow label="Data scope model" value="Roles control features. Assigned org units control operational scope." />
            <SnapshotRow label="User types" value="Internal, Vendor, Driver, and future-ready Customer users are managed in one user system." />
            <SnapshotRow label="Role mapping" value="Each role is mapped to one hierarchy level and one or more enabled modules." />
            <SnapshotRow label="Structure rule" value="Hierarchy levels define structure. Org units hold the real business values." />
          </div>
        </TenantPanel>
      </div>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-background/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function ActionRow({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-background/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium tracking-[-0.01em]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
