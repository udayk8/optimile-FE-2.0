import { useEffect as useReactEffect, useMemo, useState as useReactState } from "react";
import { useLocation } from "react-router-dom";
import { useSessionContext } from "@tms-booking/shared/auth/session-context";
import { useTenantRolePermissions } from "@tms-booking/modules/tenant-admin/hooks/useTenantRolePermissions";
import { useTenantRoles } from "@tms-booking/modules/tenant-admin/hooks/useTenantRoles";
import { useTenantRouteContext } from "@tms-booking/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantUsers } from "@tms-booking/modules/tenant-admin/hooks/useTenantUsers";
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

  const [matrixVersion, setMatrixVersion] = useReactState(0);
  useReactEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setMatrixVersion((v) => v + 1);
    window.addEventListener("storage", bump);
    window.addEventListener("optimile-permission-matrix-changed", bump);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener("optimile-permission-matrix-changed", bump);
    };
  }, []);

  type PermAction = "view" | "create" | "edit" | "delete" | "approve" | "export";
  // Mirror of PERMISSION_GRANT_IMPLIES in platform-admin's tenant-permissions.
  const GRANT_IMPLIES: Array<{
    granted: { moduleCode: string; featureCode: string; action: PermAction };
    implies: { moduleCode: string; featureCode: string; action: PermAction };
  }> = [
    {
      granted: { moduleCode: "TMS", featureCode: "CREATE_BOOKING", action: "create" },
      implies: { moduleCode: "TMS", featureCode: "BOOKING_DASHBOARD", action: "view" },
    },
  ];

  function isDirectlyGranted(roleId: string, roleModules: string[], moduleCode: string, featureCode: string, action: PermAction): boolean {
    if (moduleCode === "ADMIN") {
      if (!roleModules.includes("ADMIN")) return false;
    } else if (!roleModules.includes(moduleCode)) {
      return false;
    }
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem("optimile.tenant.rolePermissionMatrix");
      if (!raw) return false;
      const store = JSON.parse(raw) as Record<string, Record<string, Record<string, Record<string, boolean>>>>;
      return Boolean(store[roleId]?.[moduleCode]?.[featureCode]?.[action]);
    } catch {
      return false;
    }
  }

  function hasFeaturePermission(
    moduleCode: string,
    featureCode: string,
    action: PermAction = "view",
  ): boolean {
    void matrixVersion;
    const role = roleContext.activeRole;
    if (!role) return false;
    const roleName = (role.name ?? "").toLowerCase();
    if (roleName === "tenant admin" || role.id?.endsWith?.("-tenant-admin")) return true;
    const roleModules = role.moduleCodes ?? [];
    if (isDirectlyGranted(role.id, roleModules, moduleCode, featureCode, action)) return true;
    for (const rule of GRANT_IMPLIES) {
      if (
        rule.implies.moduleCode === moduleCode &&
        rule.implies.featureCode === featureCode &&
        rule.implies.action === action &&
        isDirectlyGranted(role.id, roleModules, rule.granted.moduleCode, rule.granted.featureCode, rule.granted.action)
      ) {
        return true;
      }
    }
    return false;
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


