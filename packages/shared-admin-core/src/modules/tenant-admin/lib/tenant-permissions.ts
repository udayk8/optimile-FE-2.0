import { useEffect, useState } from "react";
import type { RoleDefinition } from "@/types/access";
import { TENANT_ADMIN_MODULE_CODE, isTenantAdminRole } from "@/modules/tenant-admin/lib/tenant-modules";

export const PERMISSION_MATRIX_EVENT = "optimile-permission-matrix-changed";

export function dispatchPermissionMatrixChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PERMISSION_MATRIX_EVENT));
  }
}

// Subscribes to permission-matrix saves (same tab via dispatched event,
// other tabs via the native storage event) and returns a version number
// that increments on every change. Components reading the matrix via
// hasPermission can call this hook to trigger a re-render when the
// administrator toggles a permission.
export function usePermissionMatrixVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener("storage", bump);
    window.addEventListener(PERMISSION_MATRIX_EVENT, bump);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener(PERMISSION_MATRIX_EVENT, bump);
    };
  }, []);
  return version;
}

// Permission matrix is keyed: { [roleId]: { [moduleCode]: { [featureCode]: { view, create, edit, delete, approve, export } } } }
export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve" | "export";

type ActionMap = Partial<Record<PermissionAction, boolean>>;
type FeatureMap = Record<string, ActionMap>;
type ModuleMap = Record<string, FeatureMap>;
type MatrixMap = Record<string, ModuleMap>;

const PERMISSION_STORAGE_KEY = "optimile.tenant.rolePermissionMatrix";

export function loadAllPermissionMatrices(): MatrixMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PERMISSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MatrixMap) : {};
  } catch {
    return {};
  }
}

export function loadRolePermissions(roleId: string): ModuleMap {
  if (!roleId) return {};
  return loadAllPermissionMatrices()[roleId] ?? {};
}

// Permission implications: granting one cell logically grants another.
// Used so runtime checks honour workflow prerequisites even when the
// persisted matrix is incomplete (e.g. CREATE_BOOKING.create granted but
// BOOKING_DASHBOARD.view never explicitly ticked).
export const PERMISSION_GRANT_IMPLIES: Array<{
  granted: { moduleCode: string; featureCode: string; action: PermissionAction };
  implies: { moduleCode: string; featureCode: string; action: PermissionAction };
}> = [
  {
    granted: { moduleCode: "TMS", featureCode: "CREATE_BOOKING", action: "create" },
    implies: { moduleCode: "TMS", featureCode: "BOOKING_DASHBOARD", action: "view" },
  },
];

function isDirectlyGranted(
  role: RoleDefinition,
  moduleCode: string,
  featureCode: string,
  action: PermissionAction,
): boolean {
  const roleModules = role.moduleCodes ?? [];
  if (moduleCode === TENANT_ADMIN_MODULE_CODE) {
    if (!roleModules.includes(TENANT_ADMIN_MODULE_CODE)) return false;
  } else if (!roleModules.includes(moduleCode)) {
    return false;
  }
  const matrix = loadRolePermissions(role.id);
  return Boolean(matrix[moduleCode]?.[featureCode]?.[action]);
}

// The single source of truth for whether the current actor can see a
// feature. Tenant Admin (system owner) always passes; everyone else must
// have an explicit grant in the role's permission matrix, OR a grant that
// transitively implies this one.
export function hasPermission(
  role: RoleDefinition | null | undefined,
  moduleCode: string,
  featureCode: string,
  action: PermissionAction = "view",
): boolean {
  if (!role) return false;
  if (isTenantAdminRole(role)) return true;
  if (isDirectlyGranted(role, moduleCode, featureCode, action)) return true;
  // Check transitive implications: if any other granted permission implies
  // this one, treat it as granted.
  for (const rule of PERMISSION_GRANT_IMPLIES) {
    if (
      rule.implies.moduleCode === moduleCode &&
      rule.implies.featureCode === featureCode &&
      rule.implies.action === action &&
      isDirectlyGranted(role, rule.granted.moduleCode, rule.granted.featureCode, rule.granted.action)
    ) {
      return true;
    }
  }
  return false;
}

// Returns true if the role can view at least one of the listed features
// inside a module. Used to decide whether to even render the parent group
// in navigation.
export function hasAnyFeaturePermission(
  role: RoleDefinition | null | undefined,
  moduleCode: string,
  featureCodes: string[],
): boolean {
  if (!role) return false;
  if (isTenantAdminRole(role)) return true;
  return featureCodes.some((code) => hasPermission(role, moduleCode, code, "view"));
}
