import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { DataTable } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import {
  TenantEmptyState,
  TenantPanel,
  TenantSummaryCard,
} from "@/components/tenant/tenant-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantCustomers } from "@/hooks/useTenantCustomers";
import { useTenantModules } from "@/hooks/useTenantModules";
import { useTenantOrgTypes } from "@/hooks/useTenantOrgTypes";
import { useTenantOrgUnits } from "@/hooks/useTenantOrgUnits";
import { usePlatformModules } from "@/hooks/usePlatformModules";
import { useTenantRolePermissions } from "@/hooks/useTenantRolePermissions";
import { useTenantRoles } from "@/hooks/useTenantRoles";
import { useTenantRouteContext } from "@/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { useTenantVendors } from "@/hooks/useTenantVendors";
import {
  getUserTypeBadgeVariant,
  getUserTypeHelper,
  getUserTypeLabel,
  getUserTypeScopeLabel,
  resolveEffectiveAccess,
} from "@/lib/tenant-admin";
import type { RoleDefinition, UserRecord } from "@/types/access";

export function TenantUserDetailPage() {
  const { tenantId, tenant } = useTenantRouteContext();
  const { userId = "" } = useParams();
  const { data: users } = useTenantUsers(tenantId);
  const { data: roles } = useTenantRoles(tenantId);
  const { data: orgUnits } = useTenantOrgUnits(tenantId);
  const { data: levels } = useTenantOrgTypes(tenantId);
  const { data: modules } = usePlatformModules();
  const { data: tenantModules } = useTenantModules(tenantId);
  const { data: rolePermissions } = useTenantRolePermissions(tenantId);
  const { data: customers } = useTenantCustomers(tenantId);
  const { data: vendors } = useTenantVendors(tenantId);

  const user = users.find((item) => item.id === userId) ?? null;
  const role = roles.find((item) => item.id === user?.roleId) ?? null;
  const levelMap = new Map(levels.map((level) => [level.id, level.name]));
  const vendorMap = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Tenant Admin"
          title="User Detail"
          description="This user record is not available for the current tenant."
          action={
            <Button asChild variant="outline">
              <Link to={`/tenant/${tenant.id}/users`}>Back to users</Link>
            </Button>
          }
        />
        <TenantEmptyState title="User not found" description="The selected tenant user could not be loaded from local storage." />
      </div>
    );
  }

  const effectiveAccess = resolveEffectiveAccess({
    role,
    tenantEnabledModuleCodes: tenant.enabledModuleCodes,
    modules,
    moduleFeatures: tenantModules,
    rolePermissions,
  });
  const scopeLabel = getUserTypeScopeLabel(user.userType);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title={user.name}
        description="User detail with resolved role, scope, and effective access visibility."
        action={
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link to={`/tenant/${tenant.id}/users`}>Back to users</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <TenantSummaryCard label="User type" value={getUserTypeLabel(user.userType)} helper="Single user system in the IAM layer" />
        <TenantSummaryCard label="Role" value={role?.name ?? "Unassigned"} helper="Single role currently supported (multi-role ready)" />
        <TenantSummaryCard label="Status" value={user.status} helper="Tenant-side account state" />
        <TenantSummaryCard label="Last active" value={new Date(user.lastActive).toLocaleString()} helper="Most recent activity snapshot" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <TenantPanel title="Identity and scope" description="User type drives the scoped access note, while role and modules drive effective access.">
          <div className="space-y-3">
            <InfoRow label="Email" value={user.email} />
            <InfoRow
              label="User type"
              valueNode={
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getUserTypeBadgeVariant(user.userType)}>{getUserTypeLabel(user.userType)}</Badge>
                  {scopeLabel ? <Badge variant="warning">{scopeLabel}</Badge> : null}
                </div>
              }
            />
            <InfoRow label="Role" value={role?.name ?? "Role missing"} />
            <InfoRow
              label="Role level"
              value={role ? levelMap.get(role.hierarchyLevelId) ?? role.hierarchyLevelId : "No mapped level"}
            />
            <InfoRow label="Access note" value={getUserTypeHelper(user.userType)} />
            {user.userType === "VENDOR" ? (
              <InfoRow label="Linked vendor" value={vendorMap.get(user.linkedVendorId ?? "")?.name ?? "No vendor linked"} />
            ) : null}
            {user.userType === "CUSTOMER" ? (
              <InfoRow label="Linked customer" value={customerMap.get(user.linkedCustomerId ?? "")?.name ?? "No customer linked"} />
            ) : null}
            {user.userType === "DRIVER" ? (
              <InfoRow label="Driver reference" value={`${user.driverName || "No driver name"}${user.driverCode ? ` (${user.driverCode})` : ""}`} />
            ) : null}
            <InfoRow
              label="Assigned org units"
              value={
                user.orgUnitIds.length
                  ? user.orgUnitIds.map((orgUnitId) => orgUnits.find((item) => item.id === orgUnitId)?.name ?? orgUnitId).join(", ")
                  : "Not required for scoped external users"
              }
            />
          </div>
        </TenantPanel>

        <EffectiveAccessPanel
          title="Effective Access"
          description="User access resolves from tenant enabled modules, role modules, and role permissions."
          role={role}
          effectiveAccess={effectiveAccess}
        />
      </div>
    </div>
  );
}

export function TenantRoleDetailPage() {
  const { tenantId, tenant } = useTenantRouteContext();
  const { roleId = "" } = useParams();
  const { data: roles } = useTenantRoles(tenantId);
  const { data: users } = useTenantUsers(tenantId);
  const { data: levels } = useTenantOrgTypes(tenantId);
  const { data: modules } = usePlatformModules();
  const { data: tenantModules } = useTenantModules(tenantId);
  const { data: rolePermissions } = useTenantRolePermissions(tenantId);

  const role = roles.find((item) => item.id === roleId) ?? null;
  const assignedUsers = users.filter((user) => user.roleId === roleId);
  const levelMap = new Map(levels.map((level) => [level.id, level.name]));

  if (!role) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Tenant Admin"
          title="Role Detail"
          description="This role record is not available for the current tenant."
          action={
            <Button asChild variant="outline">
              <Link to={`/tenant/${tenant.id}/roles`}>Back to roles</Link>
            </Button>
          }
        />
        <TenantEmptyState title="Role not found" description="The selected tenant role could not be loaded from local storage." />
      </div>
    );
  }

  const effectiveAccess = resolveEffectiveAccess({
    role,
    tenantEnabledModuleCodes: tenant.enabledModuleCodes,
    modules,
    moduleFeatures: tenantModules,
    rolePermissions,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title={role.name}
        description="Role detail with mapped hierarchy level, module awareness, and effective access visibility."
        action={
          <Button asChild variant="outline">
            <Link to={`/tenant/${tenant.id}/roles`}>Back to roles</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <TenantSummaryCard label="Status" value={role.active ? "Active" : "Inactive"} helper="Assignment availability" />
        <TenantSummaryCard label="Mapped level" value={levelMap.get(role.hierarchyLevelId) ?? role.hierarchyLevelId} helper="User org-unit assignment level" />
        <TenantSummaryCard label="Modules" value={String(role.moduleCodes.length)} helper="Role-module mapping count" />
        <TenantSummaryCard label="Assigned users" value={String(assignedUsers.length)} helper="Single role currently supported (multi-role ready)" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <TenantPanel title="Role definition" description="Tenant-defined role structure remains flexible while module validation stays strict.">
          <div className="space-y-3">
            <InfoRow label="Description" value={role.description || "No description"} />
            <InfoRow label="Mapped level" value={levelMap.get(role.hierarchyLevelId) ?? role.hierarchyLevelId} />
            <InfoRow
              label="Mapped modules"
              valueNode={
                <div className="flex flex-wrap gap-2">
                  {role.moduleCodes.map((moduleCode) => (
                    <Badge key={moduleCode} variant={effectiveAccess.restrictedModules.includes(moduleCode) ? "warning" : "accent"}>
                      {moduleCode}
                    </Badge>
                  ))}
                </div>
              }
            />
            <InfoRow
              label="Role note"
              value="Roles cannot reference disabled modules, and users continue to be assigned to exactly one role."
            />
          </div>
        </TenantPanel>

        <EffectiveAccessPanel
          title="Effective Access"
          description="Resolved access view for this role based on enabled modules and saved permissions."
          role={role}
          effectiveAccess={effectiveAccess}
        />
      </div>

      <TenantPanel title="Assigned users" description="Users currently linked to this role in the tenant workspace.">
        {assignedUsers.length ? (
          <DataTable
            title="Role assignments"
            description="User types stay in the same user module, with scoped access notes shown where relevant."
            headers={["User", "Type", "Scope", "Status"]}
            rows={assignedUsers.map((user) => [
              <div key={`${user.id}-name`} className="min-w-[180px]">
                <p className="font-medium">{user.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
              </div>,
              <Badge key={`${user.id}-type`} variant={getUserTypeBadgeVariant(user.userType)}>
                {getUserTypeLabel(user.userType)}
              </Badge>,
              getUserTypeScopeLabel(user.userType) ? (
                <Badge key={`${user.id}-scope`} variant="warning">
                  {getUserTypeScopeLabel(user.userType)}
                </Badge>
              ) : (
                "RBAC"
              ),
              <Badge key={`${user.id}-status`} variant={user.status === "active" ? "success" : user.status === "invited" ? "secondary" : "warning"}>
                {user.status}
              </Badge>,
            ])}
          />
        ) : (
          <TenantEmptyState title="No users assigned yet" description="Assign a tenant user to this role from the Users page to see it here." />
        )}
      </TenantPanel>
    </div>
  );
}

function EffectiveAccessPanel({
  title,
  description,
  role,
  effectiveAccess,
}: {
  title: string;
  description: string;
  role: RoleDefinition | null;
  effectiveAccess: ReturnType<typeof resolveEffectiveAccess>;
}) {
  return (
    <TenantPanel title={title} description={description}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium">Enabled Modules</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {effectiveAccess.enabledModules.length ? (
              effectiveAccess.enabledModules.map((module) => (
                <Badge key={module.code} variant="accent">
                  {module.name}
                </Badge>
              ))
            ) : (
              <Badge variant="warning">No enabled modules</Badge>
            )}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Role Modules</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {role?.moduleCodes.length ? (
              role.moduleCodes.map((moduleCode) => (
                <Badge key={moduleCode} variant={effectiveAccess.restrictedModules.includes(moduleCode) ? "warning" : "info"}>
                  {moduleCode}
                </Badge>
              ))
            ) : (
              <Badge variant="warning">No role modules</Badge>
            )}
          </div>
          {effectiveAccess.restrictedModules.length ? (
            <p className="mt-2 text-sm text-amber-800">
              Warning: this access definition still references disabled modules: {effectiveAccess.restrictedModules.join(", ")}.
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-medium">Permissions Summary</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {effectiveAccess.permissionSummaries.map((item) => (
              <Badge key={item.label} variant={item.value ? "success" : "secondary"}>
                {item.label}: {item.value}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{effectiveAccess.permissionCount} enabled action grants across the current effective scope.</p>
        </div>
        <div className="rounded-2xl border bg-muted/20 p-4">
          <p className="text-sm font-medium">Feature-level effective access</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {effectiveAccess.featureSummaries.length ? (
              effectiveAccess.featureSummaries.map((feature) => (
                <Badge key={feature.id} variant="outline">
                  {feature.label}: {feature.enabledActions.join(", ") || "No actions"}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No effective permissions configured.</span>
            )}
          </div>
        </div>
      </div>
    </TenantPanel>
  );
}

function InfoRow({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string;
  valueNode?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-background/80 px-4 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      {valueNode ? <div className="mt-2">{valueNode}</div> : <p className="mt-2 font-medium">{value}</p>}
    </div>
  );
}
