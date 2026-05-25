import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useSessionContext } from "@/shared/auth/session-context";
import { useTenantRolePermissions } from "@/modules/tenant-admin/hooks/useTenantRolePermissions";
import { useTenantRoles } from "@/modules/tenant-admin/hooks/useTenantRoles";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import { hasPermission, usePermissionMatrixVersion } from "@/modules/tenant-admin/lib/tenant-permissions";
import {
  findTenantPageByCode,
  getRolePageActions,
  matchTenantPageForPath,
  type TenantPageDefinition,
} from "@/shared/lib/tenant-page-access";
import { resolveSessionRoleContext } from "@/shared/lib/tenant-rbac";
import type { RolePageAction } from "@/types/access";

export function useTenantAccess(pathnameOverride?: string) {
  const location = useLocation();
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
  const { data: users } = useTenantUsers(tenant.id);
  const { data: roles } = useTenantRoles(tenant.id);
  const { data: rolePermissions } = useTenantRolePermissions(tenant.id);
  const pathname = pathnameOverride ?? location.pathname;

  const roleContext = useMemo(
    () =>
      resolveSessionRoleContext({
        tenant,
        session,
        users,
        roles,
        rolePermissions,
      }),
    [rolePermissions, roles, session, tenant, users],
  );

  const matchedPage = useMemo(
    () => matchTenantPageForPath(tenant, pathname),
    [pathname, tenant],
  );
  const allowedActions = useMemo(
    () => (matchedPage ? getRolePageActions(roleContext.roleAccess, matchedPage.pageCode) : []),
    [matchedPage, roleContext.roleAccess],
  );

  function canViewPage(pageCode?: string | null) {
    if (!pageCode) {
      return true;
    }
    return roleContext.roleAccess.some((moduleAccess) =>
      moduleAccess.pages.some((page) => page.pageCode === pageCode && page.canView),
    );
  }

  function can(pathOrAction: RolePageAction | string, maybeAction?: RolePageAction) {
    if (maybeAction) {
      return getActionsForPage(pathOrAction).includes(maybeAction);
    }
    return allowedActions.includes(pathOrAction as RolePageAction);
  }

  function getActionsForPage(pageCodeOrPath?: string | null) {
    if (!pageCodeOrPath) {
      return allowedActions;
    }
    const targetPage = pageCodeOrPath.includes("/")
      ? matchTenantPageForPath(tenant, pageCodeOrPath)
      : findPageByCode(pageCodeOrPath);
    return targetPage ? getRolePageActions(roleContext.roleAccess, targetPage.pageCode) : [];
  }

  function getMatchedPage(pageCodeOrPath?: string | null): TenantPageDefinition | null {
    if (!pageCodeOrPath) {
      return matchedPage;
    }
    return pageCodeOrPath.includes("/")
      ? matchTenantPageForPath(tenant, pageCodeOrPath)
      : findPageByCode(pageCodeOrPath);
  }

  function findPageByCode(pageCode: string) {
    return findTenantPageByCode(tenant, pageCode);
  }

  const matrixVersion = usePermissionMatrixVersion();
  function hasFeaturePermission(
    moduleCode: string,
    featureCode: string,
    action: "view" | "create" | "edit" | "delete" | "approve" | "export" = "view",
  ): boolean {
    void matrixVersion;
    return hasPermission(roleContext.activeRole, moduleCode, featureCode, action);
  }

  return {
    ...roleContext,
    matchedPage,
    allowedActions,
    can,
    canViewPage,
    canViewMargin: can("VIEW_MARGIN"),
    dataScope: roleContext.activeRole?.dataScope ?? "OWN_RECORDS",
    getActionsForPage,
    getMatchedPage,
    hasFeaturePermission,
  };
}
