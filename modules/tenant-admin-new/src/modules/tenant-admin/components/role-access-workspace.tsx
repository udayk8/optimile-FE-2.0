import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Save } from "lucide-react";
import { TenantEmptyState, TenantPanel, TenantSummaryCard } from "@/modules/tenant-admin/components/tenant-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Tabs } from "@/shared/components/ui/tabs";
import { useSessionContext } from "@/shared/auth/session-context";
import {
  getRoleAccessModules,
  getRolePageActionLabel,
  getRolePageActions,
  getTenantPageCatalog,
  groupTenantPagesByModule,
  type TenantPageDefinition,
  type TenantPageModuleCode,
} from "@/shared/lib/tenant-page-access";
import {
  buildBrdDefaultRoleTemplate,
  getRolePreviewStartPath,
  hasBrdDefaultTemplate,
} from "@/shared/lib/tenant-role-templates";
import { formatRoleUserPlaceSummary } from "@/shared/lib/role-user-summary";
import type { PlatformModule, TenantRecord } from "@/types/platform";
import type {
  OrgUnit,
  RoleAccessModule,
  RoleAccessPage,
  RoleDefinition,
  RolePageAction,
  RolePermission,
  UserRecord,
} from "@/types/access";

const permissionTabs = [
  "Role Details",
  "Module Access",
  "Feature Access",
  "Action Permissions",
  "Data Scope",
  "Assigned Users",
  "Role Preview",
];

const dataScopeOptions: Array<RoleDefinition["dataScope"]> = [
  "ALL_TENANT",
  "REGION",
  "BRANCH",
  "CUSTOMER",
  "VENDOR",
  "DRIVER",
  "OWN_RECORDS",
];

export function RoleAccessWorkspace({
  tenant,
  role,
  assignedUsers,
  orgUnits,
  levelLabel,
  hierarchyEnabled = true,
  modules,
  rolePermissions,
  onSaveRole,
}: {
  tenant: TenantRecord;
  role: RoleDefinition;
  assignedUsers: UserRecord[];
  orgUnits: OrgUnit[];
  levelLabel: string;
  // When false (Company Root Only), hierarchy-level data scopes (Region/Branch)
  // are hidden — only tenant-wide / entity scopes apply.
  hierarchyEnabled?: boolean;
  modules: PlatformModule[];
  rolePermissions: RolePermission[];
  onSaveRole: (updates: Partial<Pick<RoleDefinition, "moduleCodes" | "dataScope" | "roleAccess">>) => void;
}) {
  // Region/Branch scopes require a hierarchy; drop them in Company Root Only mode.
  const availableDataScopes = hierarchyEnabled
    ? dataScopeOptions
    : dataScopeOptions.filter((scope) => scope !== "REGION" && scope !== "BRANCH");
  const navigate = useNavigate();
  const { session, setSession } = useSessionContext();
  const [activeTab, setActiveTab] = useState("Module Access");
  const [pageSearch, setPageSearch] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "warning">("success");
  const [moduleDraft, setModuleDraft] = useState<string[]>(role.moduleCodes);
  const [dataScopeDraft, setDataScopeDraft] = useState<RoleDefinition["dataScope"]>(role.dataScope ?? "OWN_RECORDS");
  const [roleAccessDraft, setRoleAccessDraft] = useState<RoleAccessModule[]>(
    getRoleAccessModules(role, tenant, rolePermissions),
  );

  useEffect(() => {
    setModuleDraft(role.moduleCodes);
    setDataScopeDraft(role.dataScope ?? "OWN_RECORDS");
    setRoleAccessDraft(getRoleAccessModules(role, tenant, rolePermissions));
  }, [role, rolePermissions, tenant]);

  const enabledPlatformModules = useMemo(
    () => modules.filter((module) => tenant.enabledModuleCodes.includes(module.code) && module.status === "active"),
    [modules, tenant.enabledModuleCodes],
  );
  const groupedPages = useMemo(() => groupTenantPagesByModule(tenant), [tenant]);
  const pageCatalog = useMemo(() => getTenantPageCatalog(tenant), [tenant]);
  const allowedPages = pageCatalog.filter((page) => canView(roleAccessDraft, page.pageCode));
  const restrictedPages = pageCatalog.filter((page) => !canView(roleAccessDraft, page.pageCode));
  const enabledActionsCount = allowedPages.reduce(
    (count, page) => count + getRolePageActions(roleAccessDraft, page.pageCode).length,
    0,
  );
  const template = useMemo(() => buildBrdDefaultRoleTemplate(tenant, role), [role, tenant]);
  const canApplyTemplate = hasBrdDefaultTemplate(role.name);
  const hasConfiguredFeatureAccess = allowedPages.length > 0;
  const featureCount = allowedPages.length;

  function saveModules() {
    const sanitizedRoleAccess = pruneRoleAccessForModules(roleAccessDraft, moduleDraft, pageCatalog, tenant.customerPortalEnabled);
    setRoleAccessDraft(sanitizedRoleAccess);
    onSaveRole({ moduleCodes: moduleDraft, roleAccess: sanitizedRoleAccess });
    setMessage("Module access saved successfully.");
    setMessageTone("success");
  }

  function savePages() {
    onSaveRole({ roleAccess: roleAccessDraft });
    setMessage("Feature and action access saved successfully.");
    setMessageTone("success");
  }

  function saveDataScope() {
    onSaveRole({ dataScope: dataScopeDraft });
    setMessage("Data scope saved successfully.");
    setMessageTone("success");
  }

  function applyTemplate() {
    if (!template) {
      setMessage("No BRD template is defined for this role.");
      setMessageTone("warning");
      return;
    }
    setModuleDraft(template.moduleCodes);
    setDataScopeDraft(template.dataScope ?? "OWN_RECORDS");
    setRoleAccessDraft(template.roleAccess);
    onSaveRole({
      moduleCodes: template.moduleCodes,
      dataScope: template.dataScope,
      roleAccess: template.roleAccess,
    });
    setMessage("BRD default template applied to this role.");
    setMessageTone("success");
  }

  function resetRoleAccess() {
    setModuleDraft([]);
    setDataScopeDraft(role.dataScope ?? "OWN_RECORDS");
    setRoleAccessDraft([]);
    onSaveRole({
      moduleCodes: [],
      roleAccess: [],
    });
    setMessage("Role access reset. This role now has no feature access configured.");
    setMessageTone("warning");
  }

  function toggleModuleCode(moduleCode: string) {
    setModuleDraft((current) =>
      current.includes(moduleCode) ? current.filter((code) => code !== moduleCode) : [...current, moduleCode],
    );
  }

  function updatePage(pageCode: string, updater: (page: RoleAccessPage) => RoleAccessPage) {
    const definition = pageCatalog.find((page) => page.pageCode === pageCode);
    if (!definition) {
      return;
    }
    setRoleAccessDraft((current) => {
      const next = ensurePageDraft(current, definition.moduleCode, pageCode, definition.availableActions);
      return next.map((moduleAccess) =>
        moduleAccess.moduleCode === definition.moduleCode
          ? {
              ...moduleAccess,
              pages: moduleAccess.pages.map((page) => (page.pageCode === pageCode ? (updater(page) as RoleAccessPage) : page)),
            } as RoleAccessModule
          : moduleAccess,
      );
    });
  }

  function togglePageView(pageCode: string, checked: boolean) {
    updatePage(pageCode, (page) => ({
      ...page,
      canView: checked,
      actions: checked
        ? (Array.from(new Set<RolePageAction>(["VIEW", ...page.actions])) as RolePageAction[])
        : ([] as RolePageAction[]),
    }));
  }

  function toggleAction(pageCode: string, action: RolePageAction, checked: boolean) {
    updatePage(pageCode, (page) => ({
      ...page,
      canView: true,
      actions: checked
        ? Array.from(new Set<RolePageAction>(["VIEW", ...page.actions, action]))
        : page.actions.filter((item) => item !== action),
    }));
  }

  function selectAllPages(moduleCode: TenantPageModuleCode, checked: boolean) {
    const modulePages = groupedPages.find(([code]) => code === moduleCode)?.[1] ?? [];
    setRoleAccessDraft((current) => {
      let next = current;
      for (const page of modulePages) {
        next = ensurePageDraft(next, moduleCode, page.pageCode, page.availableActions);
      }
      return next.map((moduleAccess) =>
        moduleAccess.moduleCode === moduleCode
          ? {
              ...moduleAccess,
              pages: moduleAccess.pages.map((page) =>
                modulePages.some((item) => item.pageCode === page.pageCode)
                  ? {
                      ...page,
                      canView: checked,
                      actions: checked
                        ? (Array.from(new Set<RolePageAction>(["VIEW", ...page.actions])) as RolePageAction[])
                        : ([] as RolePageAction[]),
                    } as RoleAccessPage
                  : page,
              ),
            } as RoleAccessModule
          : moduleAccess,
      );
    });
  }

  function selectAllActions(pageCode: string, checked: boolean) {
    const definition = pageCatalog.find((page) => page.pageCode === pageCode);
    if (!definition) {
      return;
    }
    updatePage(pageCode, (page) => ({
      ...page,
      canView: true,
      actions: checked
        ? (Array.from(new Set<RolePageAction>(["VIEW", ...definition.availableActions])) as RolePageAction[])
        : (["VIEW"] as RolePageAction[]),
    }));
  }

  function startPreview() {
    const previewUser =
      assignedUsers.find((user) => user.status === "active") ??
      assignedUsers[0] ??
      null;
    setSession({
      ...session,
      actorType: "tenant_admin",
      tenantId: tenant.id,
      actorName: previewUser?.name ?? role.name,
      previewTenantRoleId: role.id,
      activeTenantOrgUnitId: previewUser?.orgUnitIds[0] ?? session.activeTenantOrgUnitId ?? null,
    });
    navigate(getRolePreviewStartPath(tenant, role));
  }

  function clearPreview() {
    setSession({
      ...session,
      previewTenantRoleId: null,
    });
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${messageTone === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <TenantSummaryCard label="Modules Accessible" value={String(moduleDraft.length)} helper="Tenant-enabled modules mapped to this role" />
        <TenantSummaryCard label="Features Enabled" value={String(featureCount)} helper="Sidebar and route-visible features/pages" />
        <TenantSummaryCard label="Actions Enabled" value={String(enabledActionsCount)} helper="Buttons and page actions controlled by role" />
        <TenantSummaryCard label="Assigned Users" value={String(assignedUsers.length)} helper={`${dataScopeDraft ?? "OWN_RECORDS"} data scope on this role`} />
      </div>

      <Tabs tabs={permissionTabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "Role Details" ? (
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <TenantPanel title="Role Details" description="Role-level access remains the source of truth for users assigned to this role.">
              <div className="space-y-3">
                <InfoRow label="Role name" value={role.name} />
                <InfoRow label="Hierarchy level" value={levelLabel} />
                <InfoRow label="Description" value={role.description || "No description"} />
                <InfoRow label="Data scope" value={dataScopeDraft ?? "OWN_RECORDS"} />
              </div>
            </TenantPanel>

            <TenantPanel title="Role Controls" description="Apply a BRD template or reset access before refining modules, features, and actions manually.">
              <div className="space-y-3">
                <InfoRow label="Current model" value="Final access is tenant enabled modules intersected with role modules, feature access, and action permissions." />
                <InfoRow label="Legacy compatibility" value="Existing Role Permissions matrix remains available and continues to work alongside the new module-feature-action layer." />
                <div className="flex flex-wrap gap-3">
                  <Button onClick={applyTemplate} disabled={!canApplyTemplate}>
                    Apply BRD Default Template
                  </Button>
                  <Button variant="outline" onClick={resetRoleAccess}>
                    Reset Role Access
                  </Button>
                  <Button asChild variant="outline">
                    <a href={`/tenant/${tenant.id}/role-permissions`}>
                      <ExternalLink className="size-4" />
                      Open Role Permissions Matrix
                    </a>
                  </Button>
                </div>
                {!hasConfiguredFeatureAccess ? (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    This role has no feature access configured. Apply a BRD template or enable features manually.
                  </div>
                ) : null}
              </div>
            </TenantPanel>
          </div>
        </div>
      ) : null}

      {activeTab === "Module Access" ? (
        <TenantPanel
          title="Module Access"
          description="Tenant-enabled modules define the outer boundary. Page Access then controls the exact sidebar and route visibility within those modules."
          action={
            <Button onClick={saveModules}>
              <Save className="size-4" />
              Save Module Access
            </Button>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {enabledPlatformModules.map((module) => {
              const checked = moduleDraft.includes(module.code);
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => toggleModuleCode(module.code)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${checked ? "border-primary/40 bg-primary/8" : "bg-muted/30"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{module.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                    </div>
                    <Badge variant={checked ? "accent" : "outline"}>{module.code}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </TenantPanel>
      ) : null}

      {activeTab === "Feature Access" ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Input
              value={pageSearch}
              onChange={(event) => setPageSearch(event.target.value)}
              placeholder="Search features by name or module"
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={applyTemplate} disabled={!canApplyTemplate}>
                Apply BRD Default Template
              </Button>
              <Button onClick={savePages}>
              <Save className="size-4" />
                Save Feature Access
              </Button>
            </div>
          </div>

          {!hasConfiguredFeatureAccess ? (
            <TenantEmptyState
              title="No feature access configured"
              description="This role has no feature access configured. Apply a BRD template or enable features manually."
              action={canApplyTemplate ? <Button onClick={applyTemplate}>Apply BRD Default Template</Button> : null}
            />
          ) : null}

          {groupedPages.map(([moduleCode, pages]) => {
            const filteredPages = pages.filter((page) =>
              `${page.label} ${moduleCode}`.toLowerCase().includes(pageSearch.trim().toLowerCase()),
            );
            if (!filteredPages.length) {
              return null;
            }
            const enabledCount = filteredPages.filter((page) => canView(roleAccessDraft, page.pageCode)).length;
            return (
              <TenantPanel
                key={moduleCode}
                title={moduleCode.replace(/_/g, " ")}
                description={`${enabledCount} of ${filteredPages.length} features enabled`}
                action={
                  <Button size="sm" variant="outline" onClick={() => selectAllPages(moduleCode, enabledCount !== filteredPages.length)}>
                    {enabledCount === filteredPages.length ? "Clear Module" : "Enable All"}
                  </Button>
                }
              >
                <div className="grid gap-3">
                  {filteredPages.map((page) => (
                    <label key={page.pageCode} className="flex items-start justify-between gap-4 rounded-2xl border bg-background/85 px-4 py-4">
                      <div className="min-w-0">
                        <p className="font-medium">{page.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{page.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{page.availableActions.length} actions available</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={canView(roleAccessDraft, page.pageCode)}
                        onChange={(event) => togglePageView(page.pageCode, event.target.checked)}
                        className="mt-1"
                      />
                    </label>
                  ))}
                </div>
              </TenantPanel>
            );
          })}
        </div>
      ) : null}

      {activeTab === "Action Permissions" ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={savePages}>
              <Save className="size-4" />
              Save Action Permissions
            </Button>
          </div>

          {!hasConfiguredFeatureAccess ? (
            <TenantEmptyState
              title="No feature access configured"
              description="Enable features first. Action permissions are shown only for enabled features."
              action={canApplyTemplate ? <Button onClick={applyTemplate}>Apply BRD Default Template</Button> : null}
            />
          ) : null}

          {groupedPages.map(([moduleCode, pages]) => {
            const visiblePages = pages.filter((page) => canView(roleAccessDraft, page.pageCode));
            if (!visiblePages.length) {
              return null;
            }
            return (
              <TenantPanel key={moduleCode} title={moduleCode.replace(/_/g, " ")} description="Actions are configurable only for enabled pages.">
                <div className="grid gap-4">
                  {visiblePages.map((page) => {
                    const actions = getRolePageActions(roleAccessDraft, page.pageCode);
                    const fullActionCount = new Set<RolePageAction>(["VIEW", ...page.availableActions]).size;
                    return (
                      <div key={page.pageCode} className="rounded-2xl border bg-background/85 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{page.label}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{actions.length} actions enabled</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => selectAllActions(page.pageCode, actions.length !== fullActionCount)}>
                            {actions.length === fullActionCount ? "Clear Actions" : "Select All Actions"}
                          </Button>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {page.availableActions.map((action) => {
                            const checked = actions.includes(action);
                            return (
                              <label
                                key={`${page.pageCode}-${action}`}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${checked ? "border-primary/35 bg-primary/8" : "bg-muted/20"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => toggleAction(page.pageCode, action, event.target.checked)}
                                />
                                {getRolePageActionLabel(action)}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TenantPanel>
            );
          })}
        </div>
      ) : null}

      {activeTab === "Data Scope" ? (
        <TenantPanel
          title="Data Scope"
          description="This controls the frontend data-visibility simulation layer for the assigned role."
          action={
            <Button onClick={saveDataScope}>
              <Save className="size-4" />
              Save Data Scope
            </Button>
          }
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {availableDataScopes.map((scope) => {
              const checked = dataScopeDraft === scope;
              return (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setDataScopeDraft(scope)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${checked ? "border-primary/40 bg-primary/8" : "bg-muted/25"}`}
                >
                  <p className="font-medium">{scope?.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{getDataScopeDescription(scope)}</p>
                </button>
              );
            })}
          </div>
        </TenantPanel>
      ) : null}

      {activeTab === "Assigned Users" ? (
        <TenantPanel title="Assigned Users" description="Users inherit access from this role. Direct user-level permission override stays disabled for now.">
          <p className="text-sm text-muted-foreground">
            {formatRoleUserPlaceSummary(assignedUsers, orgUnits, { maxUsers: 4, maxPlacesPerUser: 2 })}
          </p>
          {assignedUsers.length ? (
            <div className="grid gap-3">
              {assignedUsers.map((user) => (
                <div key={user.id} className="flex flex-col gap-3 rounded-2xl border bg-background/85 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRoleUserPlaceSummary([user], orgUnits, { maxUsers: 1, maxPlacesPerUser: 3 })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{user.userType}</Badge>
                    <Badge variant={user.status === "active" ? "success" : user.status === "invited" ? "secondary" : "warning"}>
                      {user.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <TenantEmptyState title="No users assigned yet" description="Assign users from the Users page to test navigation, pages, and actions for this role." />
          )}
        </TenantPanel>
      ) : null}

      {activeTab === "Role Preview" ? (
        <div className="space-y-6">
          <TenantPanel
            title="Role Preview"
            description="Temporary frontend-only permission simulation until backend login and API authorization are integrated."
            action={
              <div className="flex gap-3">
                <Button onClick={startPreview}>Preview Workspace as this Role</Button>
                {session.previewTenantRoleId ? (
                  <Button variant="outline" onClick={clearPreview}>
                    Exit Preview
                  </Button>
                ) : null}
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-4">
              <TenantSummaryCard label="Allowed Modules" value={String(new Set(allowedPages.map((page) => page.moduleCode)).size)} helper="Page groups visible to the role" />
              <TenantSummaryCard label="Allowed Pages" value={String(allowedPages.length)} helper="Pages visible in current tenant context" />
              <TenantSummaryCard label="Restricted Pages" value={String(restrictedPages.length)} helper="Pages hidden from the role" />
              <TenantSummaryCard label="Allowed Actions" value={String(enabledActionsCount)} helper="Actions enabled across visible pages" />
            </div>
          </TenantPanel>

          {!hasConfiguredFeatureAccess ? (
            <TenantEmptyState
              title="No feature access configured"
              description="This role has no feature access configured. Apply a BRD template or enable features manually before previewing."
              action={canApplyTemplate ? <Button onClick={applyTemplate}>Apply BRD Default Template</Button> : null}
            />
          ) : null}

          <TenantPanel title="Allowed pages" description="Visible pages grouped from the current role access definition.">
            <div className="flex flex-wrap gap-2">
              {allowedPages.map((page) => (
                <Badge key={page.pageCode} variant="accent">
                  {page.label}
                </Badge>
              ))}
            </div>
          </TenantPanel>

          <TenantPanel title="Restricted pages" description="Pages hidden from navigation and blocked on direct route access.">
            <div className="flex flex-wrap gap-2">
              {restrictedPages.map((page) => (
                <Badge key={page.pageCode} variant="warning">
                  {page.label}
                </Badge>
              ))}
            </div>
          </TenantPanel>
        </div>
      ) : null}
    </div>
  );
}

function ensurePageDraft(
  current: RoleAccessModule[],
  moduleCode: string,
  pageCode: string,
  availableActions: RolePageAction[],
): RoleAccessModule[] {
  const hasModule = current.some((moduleAccess) => moduleAccess.moduleCode === moduleCode);
  const next = hasModule ? [...current] : [...current, { moduleCode, pages: [] }];
  return next.map((moduleAccess) =>
    moduleAccess.moduleCode === moduleCode && !moduleAccess.pages.some((page) => page.pageCode === pageCode)
      ? {
          ...moduleAccess,
          pages: [
            ...moduleAccess.pages,
            {
              pageCode,
              canView: false,
              actions: availableActions.includes("VIEW") ? (["VIEW"] as RolePageAction[]) : ([] as RolePageAction[]),
            } as RoleAccessPage,
          ],
        } as RoleAccessModule
      : moduleAccess,
  );
}

function canView(roleAccess: RoleAccessModule[], pageCode: string) {
  return roleAccess.some((moduleAccess) => moduleAccess.pages.some((page) => page.pageCode === pageCode && page.canView));
}

function pruneRoleAccessForModules(
  roleAccess: RoleAccessModule[],
  moduleCodes: string[],
  pageCatalog: TenantPageDefinition[],
  customerPortalEnabled: boolean,
) {
  const selectedModules = new Set(moduleCodes);
  const pageByCode = new Map(pageCatalog.map((page) => [page.pageCode, page]));

  return roleAccess
    .map((moduleAccess) => ({
      ...moduleAccess,
      pages: moduleAccess.pages.filter((page) => {
        const definition = pageByCode.get(page.pageCode);
        if (!definition) {
          return false;
        }
        if (page.pageCode === "TENANT_DASHBOARD") {
          return true;
        }
        if (definition.requiresCustomerPortal && !customerPortalEnabled) {
          return false;
        }
        if (definition.requiredPlatformModules?.length) {
          return definition.requiredPlatformModules.every((moduleCode) => selectedModules.has(moduleCode));
        }
        if (definition.moduleCode === "ADMINISTRATION") {
          return selectedModules.has("ADMIN");
        }
        return true;
      }),
    }))
    .filter((moduleAccess) => moduleAccess.pages.length > 0);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/80 px-4 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}

function getDataScopeDescription(scope: RoleDefinition["dataScope"]) {
  switch (scope) {
    case "ALL_TENANT":
      return "Full tenant-wide visibility.";
    case "REGION":
      return "Scoped to assigned regional operations.";
    case "BRANCH":
      return "Scoped to branch-level visibility.";
    case "CUSTOMER":
      return "Scoped to one linked customer.";
    case "VENDOR":
      return "Scoped to one linked vendor.";
    case "DRIVER":
      return "Scoped to one linked driver.";
    default:
      return "Scoped to own records or assigned work only.";
  }
}
