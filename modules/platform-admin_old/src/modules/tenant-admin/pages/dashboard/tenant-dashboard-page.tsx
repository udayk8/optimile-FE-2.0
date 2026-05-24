import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { GitBranchPlus, ShieldCheck, Users, Waypoints } from "lucide-react";
import { MetricCard } from "@/shared/components/common/metric-card";
import { PageHeader } from "@/shared/components/common/page-header";
import { PlatformTimeline } from "@/modules/platform-admin/components/platform-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { TenantPanel } from "@/modules/tenant-admin/components/tenant-primitives";
import { useTenantAuditLogs } from "@/modules/tenant-admin/hooks/useTenantAuditLogs";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { useTenantLRConfigs } from "@/modules/tenant-admin/hooks/useTenantMasterData";
import { useTenantModules } from "@/modules/tenant-admin/hooks/useTenantModules";
import { useTenantOrgTypes } from "@/modules/tenant-admin/hooks/useTenantOrgTypes";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { usePlatformModules } from "@/modules/platform-admin/hooks/usePlatformModules";
import { useTenantRoles } from "@/modules/tenant-admin/hooks/useTenantRoles";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import { useSessionContext } from "@/shared/auth/session-context";
import { getAccessibleModuleCodes } from "@/shared/lib/tenant-admin";
import { buildManualLrPreview } from "@/modules/tenant-admin/lib/manual-lr";
import {
  getAssignmentModeLabel,
  getCommercialModeLabel,
  getTenantTypeLabel,
  isHybridTenant,
} from "@/shared/lib/tenant-config";

export function TenantDashboardPage() {
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
  const { data: orgUnits } = useTenantOrgUnits(tenant.id);
  const { data: users } = useTenantUsers(tenant.id);
  const { data: roles } = useTenantRoles(tenant.id);
  const { data: lrConfigs } = useTenantLRConfigs(tenant.id);
  const { data: tenantModules } = useTenantModules(tenant.id);
  const { data: levels } = useTenantOrgTypes(tenant.id);
  const { data: auditLogs } = useTenantAuditLogs(tenant.id);
  const { data: modules } = usePlatformModules();
  const access = useTenantAccess();

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
  const manualConfig =
    lrConfigs.find((config) => config.lrType === "MANUAL" && config.status === "active") ??
    lrConfigs.find((config) => config.lrType === "MANUAL") ??
    null;
  const roleMap = new Map(roles.map((role) => [role.id, role]));
  const levelMap = new Map(levels.map((level) => [level.id, level]));
  const currentUser =
    users.find((user) => user.name === session.actorName || user.email === session.actorName) ?? null;
  const currentRole = currentUser ? roleMap.get(currentUser.roleId) ?? null : null;
  const activeOrgUnit =
    currentUser?.orgUnitIds?.length
      ? orgUnits.find((orgUnit) => orgUnit.id === session.activeTenantOrgUnitId && currentUser.orgUnitIds.includes(orgUnit.id)) ??
        orgUnits.find((orgUnit) => currentUser.orgUnitIds.includes(orgUnit.id)) ??
        null
      : null;
  const currentLevel = currentRole?.hierarchyLevelId ? levelMap.get(currentRole.hierarchyLevelId) ?? null : null;
  const nextLevel =
    currentLevel
      ? levels.filter((level) => level.active && level.order > currentLevel.order).sort((a, b) => a.order - b.order)[0] ?? null
      : levels.filter((level) => level.active).sort((a, b) => a.order - b.order)[0] ?? null;
  const currentLevelLabel = currentLevel?.name ?? "Tenant / Company Level";
  const childLevelLabel = nextLevel?.name ?? "No lower level";
  const childRule =
    nextLevel && manualConfig?.childGovernanceRules?.length
      ? manualConfig.childGovernanceRules.find((rule) => rule.childLevelId === nextLevel.id) ?? null
      : null;
  const authorityPreview = manualConfig
    ? buildManualLrPreview({
        prefix: manualConfig.prefix,
        yearFormat: manualConfig.yearFormat ?? "YYYY",
        numberSeparator: manualConfig.numberSeparator ?? "-",
        zeroPaddingLength: manualConfig.zeroPaddingLength ?? 6,
      })
    : "Not configured";
  const ownAuthoritySummary = buildOwnAuthoritySummary({
    currentLevelLabel,
    currentRoleName: currentRole?.name ?? null,
    activeOrgUnitName: activeOrgUnit?.name ?? null,
    authorityPreview,
  });
  const childAuthoritySummary = buildChildAuthoritySummary({
    childLevelLabel,
    childRule,
  });

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
        {access.canViewPage("HIERARCHY") ? (
          <MetricCard
            label="Hierarchy levels"
            value={levels.length}
            icon={GitBranchPlus}
            note={levels.map((level) => level.name).join(" -> ")}
          />
        ) : null}
        {access.canViewPage("ORG_UNITS") ? (
          <MetricCard
            label="Org units"
            value={orgUnits.length}
            icon={GitBranchPlus}
            note="Tenant business structure and data scope"
          />
        ) : null}
        {access.canViewPage("USERS") ? (
          <MetricCard
            label="Active users"
            value={activeUsers.length}
            icon={Users}
            note={`${users.length} total users across assigned org units`}
          />
        ) : null}
        {access.canViewPage("ROLES") ? (
          <MetricCard
            label="Valid roles"
            value={validRoles.length}
            icon={ShieldCheck}
            note={`${enabledModuleNames.length} enabled modules, ${tenantModules.length} module features`}
          />
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <TenantPanel
          title="Priority actions"
          description="Core setup actions that keep the tenant workspace operational and aligned."
        >
          <div className="grid gap-3">
            {access.canViewPage("HIERARCHY") ? (
              <ActionRow
                title="Hierarchy structure"
                description="Maintain ordered levels before adding or moving org units."
                action={<Button asChild variant="outline" size="sm"><Link to={`/tenant/${tenant.id}/hierarchy`}>Open</Link></Button>}
              />
            ) : null}
            {access.canViewPage("ORG_UNITS") ? (
              <ActionRow
                title="Org units"
                description="Create business nodes and maintain the operating tree."
                action={<Button asChild variant="outline" size="sm"><Link to={`/tenant/${tenant.id}/org-units`}>Open</Link></Button>}
              />
            ) : null}
            {access.canViewPage("USERS") ? (
              <ActionRow
                title="Users"
                description="Assign roles and valid org-unit scope to tenant users."
                action={<Button asChild variant="outline" size="sm"><Link to={`/tenant/${tenant.id}/users`}>Open</Link></Button>}
              />
            ) : null}
            {access.canViewPage("ROLES") || access.canViewPage("ROLE_PERMISSIONS") ? (
              <ActionRow
                title="Access Control System"
                description="Review users, roles, permissions, page access, actions, and role-to-level assignment rules."
                action={<Button asChild variant="outline" size="sm"><Link to={`/tenant/${tenant.id}/roles`}>Open</Link></Button>}
              />
            ) : null}
            {access.canViewPage("MATERIALS") ? (
              <ActionRow
                title="Master data"
                description="Maintain vehicle types, materials, LR configuration, and customer-material mapping."
                action={<Button asChild variant="outline" size="sm"><Link to={`/tenant/${tenant.id}/materials`}>Open</Link></Button>}
              />
            ) : null}
            {!access.canViewPage("HIERARCHY") && !access.canViewPage("ORG_UNITS") && !access.canViewPage("USERS") && !access.canViewPage("ROLES") && !access.canViewPage("ROLE_PERMISSIONS") && !access.canViewPage("MATERIALS") ? (
              <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                No dashboard admin actions are available for the active role.
              </div>
            ) : null}
          </div>
        </TenantPanel>

        <TenantPanel
          title="Tenant snapshot"
          description="Current structure, access coverage, and enabled operational scope."
        >
          <div className="space-y-3">
            <SnapshotRow label="Current hierarchy" value={levels.map((level) => level.name).join(" -> ") || "No levels defined"} />
            <SnapshotRow label="Tenant type" value={getTenantTypeLabel(tenant.tenantType)} />
            <SnapshotRow label="Assignment mode" value={getAssignmentModeLabel(tenant.assignmentMode)} />
            <SnapshotRow label="Commercial mode" value={getCommercialModeLabel(tenant.commercialMode)} />
            <SnapshotRow
              label="Customer portal"
              value={
                isHybridTenant(tenant)
                  ? "Enabled for linked customer users under the same tenant"
                  : tenant.customerPortalEnabled
                    ? "Enabled"
                    : "Disabled"
              }
            />
            <SnapshotRow label="Enabled modules" value={enabledModuleNames.join(", ") || "No modules enabled"} />
            <SnapshotRow label="Role coverage" value={`${roles.length} roles, ${validRoles.length} currently valid`} />
            <SnapshotRow label="User coverage" value={`${users.length} users, ${activeUsers.length} active`} />
            <SnapshotRow label="Module deactivation" value="Access removed immediately; data retained." />
          </div>
        </TenantPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <TenantPanel title="LR authority" description="Current level and one level below only.">
          <div className="space-y-3">
            <SnapshotRow label="Tenant" value={tenant.name} />
            <SnapshotRow label="Your level" value={ownAuthoritySummary.level} />
            <SnapshotRow label="You can do" value={ownAuthoritySummary.canDo} />
            <SnapshotRow label={`${childLevelLabel} can do`} value={childAuthoritySummary} />
          </div>
        </TenantPanel>

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
            <SnapshotRow label="User types" value="Internal User, Customer Portal User, Vendor User, and Driver User are managed in one user system." />
            <SnapshotRow label="Operational ownership" value={tenant.tenantType === "DIRECT_CUSTOMER" ? "Tenant operates its own transportation workflows directly." : "Tenant can operate bookings and execution for multiple linked customers using the same modules."} />
            <SnapshotRow label="Vendor notification rule" value={tenant.assignmentMode === "AUTO_VENDOR_FLOW" ? "Direct vendor notification is allowed after fast assignment." : "Vendor receives booking only after 3PL validation, commercial review, and assignment confirmation."} />
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

function buildOwnAuthoritySummary(params: {
  currentLevelLabel: string;
  currentRoleName: string | null;
  activeOrgUnitName: string | null;
  authorityPreview: string;
}) {
  const { currentLevelLabel, currentRoleName, activeOrgUnitName, authorityPreview } = params;
  return {
    level: activeOrgUnitName ? `${currentLevelLabel} - ${activeOrgUnitName}` : currentLevelLabel,
    canDo: [currentRoleName, `manage ${currentLevelLabel} LR format`, authorityPreview]
      .filter(Boolean)
      .join(" | "),
  };
}

function buildChildAuthoritySummary(params: {
  childLevelLabel: string;
  childRule:
    | {
        formatMode?: "GLOBAL_PARENT_FORMAT" | "PARENT_PREFIX_CHILD_SUFFIX" | "FULL_CHILD_FORMAT";
        canDelegateChildGovernance?: boolean;
      }
    | null;
}) {
  const { childLevelLabel, childRule } = params;
  if (childLevelLabel === "No lower level") {
    return "No lower level";
  }
  if (!childRule) {
    return "Not configured yet";
  }
  const formatSummary =
    childRule.formatMode === "FULL_CHILD_FORMAT"
      ? `${childLevelLabel} own format`
      : childRule.formatMode === "PARENT_PREFIX_CHILD_SUFFIX"
        ? `${childLevelLabel} uses parent prefix + child code`
        : `${childLevelLabel} uses parent format`;
  const nextSummary = childRule.canDelegateChildGovernance ? "can configure next lower level" : "consume only";
  return `${formatSummary} | ${nextSummary}`;
}

