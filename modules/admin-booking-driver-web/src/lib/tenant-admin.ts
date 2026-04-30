import type { Capability } from "@/types/abac";
import type { RoleDefinition, RolePermission, UserType } from "@/types/access";
import type { PlatformModule } from "@/types/platform";

export const MODULE_CODE_TO_KEY: Record<string, string> = {
  BK001: "TMS",
  AMS01: "AMS",
  FLT01: "FLEET",
  FIN01: "FINANCE",
};

export function normalizeModuleKey(moduleCode: string) {
  return MODULE_CODE_TO_KEY[moduleCode] || moduleCode;
}

export function normalizeModuleKeys(moduleCodes: string[]) {
  return Array.from(new Set(moduleCodes.map((moduleCode) => normalizeModuleKey(moduleCode))));
}

export function getAccessibleModuleCodes(
  enabledModuleCodes: string[],
  modules: Array<Pick<PlatformModule, "code" | "status">>,
) {
  const activeModuleSet = new Set(
    modules
      .filter((module) => module.status === "active")
      .map((module) => normalizeModuleKey(module.code)),
  );
  return normalizeModuleKeys(enabledModuleCodes).filter((moduleCode) => activeModuleSet.has(moduleCode));
}

export function getUserTypeLabel(userType: UserType) {
  return userType;
}

export function getUserTypeScopeLabel(userType: UserType) {
  if (userType === "VENDOR") {
    return "Scoped: Own Data";
  }
  if (userType === "DRIVER") {
    return "Scoped: Assigned Trips";
  }
  return null;
}

export function getUserTypeHelper(userType: UserType) {
  switch (userType) {
    case "INTERNAL":
      return "Internal users follow role-based access plus org-unit assignment.";
    case "VENDOR":
      return "Vendor users remain scoped to their own bookings, confirmations, and related portal data.";
    case "DRIVER":
      return "Driver users remain scoped to assigned trips and trip-side documents.";
    case "CUSTOMER":
      return "Customer users are future-ready and can be linked to customer-owned portal access.";
    default:
      return "";
  }
}

export function getUserTypeBadgeVariant(userType: UserType) {
  switch (userType) {
    case "INTERNAL":
      return "accent";
    case "VENDOR":
      return "warning";
    case "DRIVER":
      return "info";
    case "CUSTOMER":
      return "secondary";
    default:
      return "outline";
  }
}

export function resolveEffectiveAccess(params: {
  role: RoleDefinition | null;
  tenantEnabledModuleCodes: string[];
  modules: PlatformModule[];
  moduleFeatures: Capability[];
  rolePermissions: RolePermission[];
}) {
  const { role, tenantEnabledModuleCodes, modules, moduleFeatures, rolePermissions } = params;
  const accessibleModules = getAccessibleModuleCodes(tenantEnabledModuleCodes, modules);
  const accessibleModuleSet = new Set(accessibleModules);
  const moduleMap = new Map(modules.map((module) => [module.code, module]));
  const enabledModules = accessibleModules.map((moduleCode) => moduleMap.get(moduleCode) ?? {
    id: moduleCode,
    code: moduleCode,
    name: moduleCode,
    category: "",
    description: "",
    status: "active" as const,
  });

  const roleModules = normalizeModuleKeys(role?.moduleCodes ?? []);
  const effectiveModules = roleModules.filter((moduleCode) => accessibleModuleSet.has(moduleCode));
  const restrictedModules = roleModules.filter((moduleCode) => !accessibleModuleSet.has(moduleCode));
  const applicablePermissions = role
    ? rolePermissions.filter(
        (permission) =>
          permission.roleId === role.id && effectiveModules.includes(permission.moduleCode),
      )
    : [];

  const moduleFeatureMap = new Map(
    moduleFeatures.map((moduleFeature) => [`${moduleFeature.moduleCode}::${moduleFeature.code}`, moduleFeature]),
  );
  const permissionCount = applicablePermissions.reduce((count, permission) => {
    return (
      count +
      Number(permission.canView) +
      Number(permission.canCreate) +
      Number(permission.canEdit) +
      Number(permission.canDelete) +
      Number(permission.canApprove)
    );
  }, 0);

  const permissionSummaries = [
    {
      label: "View",
      value: applicablePermissions.filter((permission) => permission.canView).length,
    },
    {
      label: "Create",
      value: applicablePermissions.filter((permission) => permission.canCreate).length,
    },
    {
      label: "Edit",
      value: applicablePermissions.filter((permission) => permission.canEdit).length,
    },
    {
      label: "Delete",
      value: applicablePermissions.filter((permission) => permission.canDelete).length,
    },
    {
      label: "Approve",
      value: applicablePermissions.filter((permission) => permission.canApprove).length,
    },
  ];

  const featureSummaries = applicablePermissions.map((permission) => ({
    id: permission.id,
    moduleCode: permission.moduleCode,
    featureCode: permission.featureCode,
    label:
      moduleFeatureMap.get(`${permission.moduleCode}::${permission.featureCode}`)?.name ??
      permission.featureCode,
    enabledActions: [
      permission.canView ? "View" : null,
      permission.canCreate ? "Create" : null,
      permission.canEdit ? "Edit" : null,
      permission.canDelete ? "Delete" : null,
      permission.canApprove ? "Approve" : null,
    ].filter(Boolean) as string[],
  }));

  return {
    enabledModules,
    roleModules,
    effectiveModules,
    restrictedModules,
    permissionCount,
    permissionSummaries,
    featureSummaries,
  };
}

export const hierarchyLabelSuggestions = ["Region", "Country", "Branch", "Factory", "Hub"] as const;
