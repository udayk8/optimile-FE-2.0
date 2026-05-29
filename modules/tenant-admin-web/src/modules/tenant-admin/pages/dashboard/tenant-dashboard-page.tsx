import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, GitBranchPlus, ShieldAlert, Users, Waypoints } from "lucide-react";
import { MetricCard } from "../../../../components/common/metric-card";
import { PlatformTimeline } from "../../../../components/platform/platform-primitives";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { TenantPanel } from "../../../../components/tenant/tenant-primitives";
import { useTenantPaths } from "../../../../hooks/useTenantPaths";
import { useTenantAuditLogs } from "../../hooks/useTenantAuditLogs";
import { useTenantModules } from "../../hooks/useTenantModules";
import { useTenantOrgTypes } from "../../hooks/useTenantOrgTypes";
import { useTenantOrgUnits } from "../../hooks/useTenantOrgUnits";
import { usePlatformModules } from "../../hooks/usePlatformModules";
import { useTenantRoles } from "../../hooks/useTenantRoles";
import { useTenantRouteContext } from "../../hooks/useTenantRouteContext";
import { useTenantUsers } from "../../hooks/useTenantUsers";
import { getAccessibleModuleCodes } from "../../../../lib/tenant-admin";
import { PageHero } from "@shared-ui";

export function TenantDashboardPage() {
  const { tenant } = useTenantRouteContext();
  const paths = useTenantPaths();
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
      <PageHero
        eyebrow="Tenant Admin"
        title="Tenant Dashboard"
        subtitle="Operational view of tenant structure, user access, and setup progress across the admin workspace."
        icon={<BarChart3 className="h-5 w-5" />}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to={paths.orgUnits}>Manage org units</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={paths.reports}>Open reports</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={paths.users}>Manage users</Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Workspace overview</p>
              <h2 className="mt-2 text-lg font-extrabold text-text">{tenant.name}</h2>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Tenant administration, operational reporting, and scoped access controls are unified in one command center.
              </p>
            </div>
            <Badge variant="info">{enabledModuleNames.length} modules enabled</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SnapshotRow label="Primary focus" value="Tenant setup and reporting readiness" />
            <SnapshotRow label="Data visibility" value="Role features plus org-unit scope" />
            <SnapshotRow label="Next action" value="Review reports, users, and org structure" />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Quick access</p>
          <div className="mt-4 space-y-3">
            <QuickAction
              title="Reporting workspace"
              description="Open dashboard and report templates."
              to={paths.reports}
            />
            <QuickAction
              title="Org units"
              description="Maintain business nodes and scope tree."
              to={paths.orgUnits}
            />
            <QuickAction
              title="Users and roles"
              description="Manage access, assignments, and coverage."
              to={paths.users}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Hierarchy levels"
          value={levels.length}
          icon={GitBranchPlus}
          note={levels.map((level) => level.name).join(" -> ")}
          tone="info"
        />
        <MetricCard
          label="Org units"
          value={orgUnits.length}
          icon={GitBranchPlus}
          note="Tenant business structure and data scope"
          tone="neutral"
        />
        <MetricCard
          label="Active users"
          value={activeUsers.length}
          icon={Users}
          note={`${users.length} total users across assigned org units`}
          tone="success"
        />
        <MetricCard
          label="Valid roles"
          value={validRoles.length}
          icon={ShieldAlert}
          note={`${enabledModuleNames.length} enabled modules, ${tenantModules.length} module features`}
          tone={validRoles.length === roles.length ? "success" : "warning"}
        />
      </div>

      <TenantPanel
        title="Workspace command center"
        description="This dashboard follows the reporting module pattern from the design docs: quick operational summary first, reporting entry points second, and detailed admin workflows after that."
        action={<Badge variant="info">{enabledModuleNames.length} modules enabled</Badge>}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <SnapshotRow label="Reporting workspace" value="Template-driven dashboards and raw drill-down reports" />
          <SnapshotRow label="Access model" value="Role features plus org-unit scope define visible data" />
          <SnapshotRow label="Operational focus" value="Bookings, users, org structure, and module readiness" />
        </div>
      </TenantPanel>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <TenantPanel
          title="Priority actions"
          description="Core setup actions that keep the tenant workspace operational and aligned."
        >
          <div className="grid gap-3">
            <ActionRow
              title="Hierarchy structure"
              description="Maintain ordered levels before adding or moving org units."
              action={<Button asChild variant="outline" size="sm"><Link to={paths.hierarchy}>Open</Link></Button>}
            />
            <ActionRow
              title="Org units"
              description="Create business nodes and maintain the operating tree."
              action={<Button asChild variant="outline" size="sm"><Link to={paths.orgUnits}>Open</Link></Button>}
            />
            <ActionRow
              title="Users"
              description="Assign roles and valid org-unit scope to tenant users."
              action={<Button asChild variant="outline" size="sm"><Link to={paths.users}>Open</Link></Button>}
            />
            <ActionRow
              title="Access Control System"
              description="Review users, roles, permissions, and role-to-level assignment rules."
              action={<Button asChild variant="outline" size="sm"><Link to={paths.rolePermissions}>Open</Link></Button>}
            />
            <ActionRow
              title="Master data"
              description="Maintain vehicle types, materials, LR configuration, and customer-material mapping."
              action={<Button asChild variant="outline" size="sm"><Link to={paths.materials}>Open</Link></Button>}
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

      <TenantPanel
        title="Dashboards and reports engine"
        description="Fast dashboards should read from summary datasets first, while report drill-downs can route to raw records when users ask for detailed booking fields, search, or operational context."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to={paths.reports}>View reporting workspace</Link>
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <SnapshotRow label="Summary source" value="KPI cards, monthly trends, status rollups" />
          <SnapshotRow label="Raw source" value="Booking rows, vendor-level drill-down, search-heavy reports" />
          <SnapshotRow label="Scope control" value="Tenant, role, and enabled module visibility stay enforced" />
        </div>
      </TenantPanel>

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
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-text">{value}</span>
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
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-bold text-text">{title}</p>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function QuickAction({
  title,
  description,
  to,
}: {
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 transition hover:border-primary/20 hover:bg-white"
    >
      <div>
        <p className="font-bold text-text">{title}</p>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-400" />
    </Link>
  );
}
