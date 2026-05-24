import type { RoleDefinition } from "@/types/access";
import { TENANT_ADMIN_MODULE_CODE, isTenantAdminRole } from "@/modules/tenant-admin/lib/tenant-modules";

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

// The single source of truth for whether the current actor can see a
// feature. Tenant Admin (system owner) always passes; everyone else must
// have an explicit grant in the role's permission matrix.
export function hasPermission(
  role: RoleDefinition | null | undefined,
  moduleCode: string,
  featureCode: string,
  action: PermissionAction = "view",
): boolean {
  if (!role) return false;
  if (isTenantAdminRole(role)) return true;

  // The role must even be assigned the module before any feature inside it
  // can be checked. ADMIN is the virtual governance module — only granted
  // when the role's moduleCodes includes it explicitly.
  const roleModules = role.moduleCodes ?? [];
  if (moduleCode === TENANT_ADMIN_MODULE_CODE) {
    if (!roleModules.includes(TENANT_ADMIN_MODULE_CODE)) return false;
  } else if (!roleModules.includes(moduleCode)) {
    return false;
  }

  const matrix = loadRolePermissions(role.id);
  return Boolean(matrix[moduleCode]?.[featureCode]?.[action]);
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
