import type { ExplorerNavItem } from "@/shared/components/layout/sidebar-explorer";
import type { SessionContext, TenantRecord } from "@/types/platform";
import type { RoleDefinition, UserRecord, UserType } from "@/types/access";
import type { RoleAccessModule, RolePageAction } from "@/types/access";
import {
  buildDefaultRoleAccess,
  canRoleViewPage,
  getRoleAccessModules,
  getRolePageActions,
  matchTenantPageForPath,
} from "@/shared/lib/tenant-page-access";
import { buildBrdDefaultRoleTemplate } from "@/shared/lib/tenant-role-templates";
import type { RolePermission } from "@/types/access";

function mergeRoleAccess(
  templateAccess: ReturnType<typeof getRoleAccessModules>,
  storedAccess: ReturnType<typeof getRoleAccessModules>,
): RoleAccessModule[] {
  const moduleMap = new Map<
    string,
    {
      moduleCode: string;
      pages: Map<string, { pageCode: string; canView: boolean; actions: RolePageAction[] }>;
    }
  >();

  for (const source of [templateAccess, storedAccess]) {
    for (const moduleAccess of source) {
      const currentModule =
        moduleMap.get(moduleAccess.moduleCode) ??
        {
          moduleCode: moduleAccess.moduleCode,
          pages: new Map(),
        };
      moduleMap.set(moduleAccess.moduleCode, currentModule);

      for (const page of moduleAccess.pages) {
        const existingPage = currentModule.pages.get(page.pageCode);
        currentModule.pages.set(page.pageCode, {
          pageCode: page.pageCode,
          canView: page.canView || existingPage?.canView || false,
          actions: Array.from(new Set([...(existingPage?.actions ?? []), ...page.actions])),
        });
      }
    }
  }

  return Array.from(moduleMap.values()).map((moduleAccess): RoleAccessModule => ({
    moduleCode: moduleAccess.moduleCode,
    pages: Array.from(moduleAccess.pages.values()).map((page) => ({
      pageCode: page.pageCode,
      canView: page.canView,
      actions: page.actions,
    })),
  }));
}

function appendMissingRoleAccessModules(
  defaultAccess: ReturnType<typeof getRoleAccessModules>,
  storedAccess: ReturnType<typeof getRoleAccessModules>,
): RoleAccessModule[] {
  const existingModuleCodes = new Set(storedAccess.map((moduleAccess) => moduleAccess.moduleCode));
  const missingModules = defaultAccess.filter((moduleAccess) => !existingModuleCodes.has(moduleAccess.moduleCode));
  return [...storedAccess, ...missingModules];
}

function resolveEffectiveRoleAccess(params: {
  role: RoleDefinition | null;
  tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled">;
  rolePermissions: RolePermission[];
}) {
  const { role, tenant, rolePermissions } = params;
  const storedAccess = getRoleAccessModules(role, tenant, rolePermissions);
  if (!role) {
    return storedAccess;
  }
  const template = buildBrdDefaultRoleTemplate(tenant, role);
  const defaultAccess = buildDefaultRoleAccess(role, tenant, rolePermissions);
  const enrichedStoredAccess = appendMissingRoleAccessModules(defaultAccess, storedAccess);
  if (!template) {
    return enrichedStoredAccess;
  }
  const requiresDashboardRepair = !canRoleViewPage(storedAccess, "TENANT_DASHBOARD");
  const hasAnyConfiguredPages = storedAccess.some((moduleAccess) => moduleAccess.pages.some((page) => page.canView));
  if (!hasAnyConfiguredPages || requiresDashboardRepair) {
    return mergeRoleAccess(template.roleAccess, storedAccess);
  }
  return enrichedStoredAccess;
}

function hasActiveModuleAccess(
  pageCode: string,
  tenant: Pick<TenantRecord, "customerPortalEnabled" | "enabledModuleCodes">,
  role: Pick<RoleDefinition, "moduleCodes"> | null,
) {
  const tenantModules = new Set(tenant.enabledModuleCodes ?? []);
  const roleModules = new Set(role?.moduleCodes ?? []);

  switch (pageCode) {
    case "FLEET_DASHBOARD":
      return tenantModules.has("FLEET") && roleModules.has("FLEET");
    case "AUCTION_DASHBOARD":
      return tenantModules.has("AUCTION") && roleModules.has("AUCTION");
    case "VENDOR_DASHBOARD":
      return tenantModules.has("VENDOR") && roleModules.has("VENDOR");
    case "CUSTOMER_DASHBOARD":
      return tenant.customerPortalEnabled && tenantModules.has("CUSTOMER") && roleModules.has("CUSTOMER");
    case "TRACKING_DASHBOARD":
      return tenantModules.has("TRACKING") && roleModules.has("TRACKING");
    default:
      return true;
  }
}

export function resolveSessionRoleContext(params: {
  tenant: Pick<TenantRecord, "id" | "tenantType" | "customerPortalEnabled">;
  session: SessionContext;
  users: UserRecord[];
  roles: RoleDefinition[];
  rolePermissions: RolePermission[];
}) {
  const { tenant, session, users, roles, rolePermissions } = params;
  const currentTenantUser =
    users.find((user) => user.name === session.actorName || user.email === session.actorName) ?? null;
  const currentRole = currentTenantUser ? roles.find((role) => role.id === currentTenantUser.roleId) ?? null : null;
  const previewRole =
    session.previewTenantRoleId && session.tenantId === tenant.id
      ? roles.find((role) => role.id === session.previewTenantRoleId) ?? null
      : null;
  const activeRole = previewRole ?? currentRole;
  const roleAccess = resolveEffectiveRoleAccess({
    role: activeRole,
    tenant,
    rolePermissions,
  });

  return {
    currentTenantUser,
    currentRole,
    previewRole,
    activeRole,
    roleAccess,
    isPreviewMode: Boolean(previewRole),
  };
}

export function canAccessTenantPath(params: {
  tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled" | "enabledModuleCodes">;
  pathname: string;
  role: RoleDefinition | null;
  rolePermissions: RolePermission[];
}) {
  const matchedPage = matchTenantPageForPath(params.tenant, params.pathname);
  if (!matchedPage) {
    return { allowed: true, matchedPage: null };
  }
  if (!hasActiveModuleAccess(matchedPage.pageCode, params.tenant, params.role)) {
    return { allowed: false, matchedPage };
  }
  const roleAccess = resolveEffectiveRoleAccess({
    role: params.role,
    tenant: params.tenant,
    rolePermissions: params.rolePermissions,
  });
  return {
    allowed: canRoleViewPage(roleAccess, matchedPage.pageCode),
    matchedPage,
  };
}

export function filterTenantNavItems(items: ExplorerNavItem[], canViewPage: (pageCode?: string) => boolean): ExplorerNavItem[] {
  return items.reduce<ExplorerNavItem[]>((accumulator, item) => {
    const filteredChildren = item.children ? filterTenantNavItems(item.children, canViewPage) : undefined;
    const visibleSelf = canViewPage(item.pageCode);

    if (filteredChildren?.length) {
      accumulator.push({ ...item, children: filteredChildren });
      return accumulator;
    }

    if (item.children?.length) {
      return accumulator;
    }

    if (visibleSelf) {
      accumulator.push(item);
    }

    return accumulator;
  }, []);
}

export function sortRolesForUserType(roles: RoleDefinition[], userType: UserType) {
  return [...roles].sort((left, right) => getRoleSuggestionScore(right, userType) - getRoleSuggestionScore(left, userType));
}

export function getRoleSuggestionLabel(role: RoleDefinition, userType: UserType) {
  return getRoleSuggestionScore(role, userType) > 0 ? "Suggested" : "";
}

export function getAllowedActionsForPath(params: {
  tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled" | "enabledModuleCodes">;
  pathname: string;
  role: RoleDefinition | null;
  rolePermissions: RolePermission[];
}) {
  const matchedPage = matchTenantPageForPath(params.tenant, params.pathname);
  if (!matchedPage) {
    return [];
  }
  if (!hasActiveModuleAccess(matchedPage.pageCode, params.tenant, params.role)) {
    return [];
  }
  const roleAccess = resolveEffectiveRoleAccess({
    role: params.role,
    tenant: params.tenant,
    rolePermissions: params.rolePermissions,
  });
  return getRolePageActions(roleAccess, matchedPage.pageCode);
}

function getRoleSuggestionScore(role: RoleDefinition, userType: UserType) {
  const name = `${role.name} ${role.description}`.toLowerCase();
  if (userType === "CUSTOMER") {
    return Number(name.includes("customer")) * 4 + Number(name.includes("portal")) * 3;
  }
  if (userType === "VENDOR") {
    return Number(name.includes("vendor")) * 4 + Number(name.includes("procurement")) * 2;
  }
  if (userType === "DRIVER") {
    return Number(name.includes("driver")) * 5 + Number(name.includes("trip")) * 2;
  }
  return Number(name.includes("admin")) * 4 + Number(name.includes("manager")) * 2 + Number(name.includes("ops")) * 2;
}
