import type { RoleDefinition } from "@/types/access";

export function isTenantLevelRole(role: Pick<RoleDefinition, "dataScope"> | null | undefined) {
  return role?.dataScope === "ALL_TENANT";
}

export function getRoleScopeLevelLabel(
  role: Pick<RoleDefinition, "hierarchyLevelId" | "dataScope"> | null | undefined,
  levelMap: Map<string, string>,
) {
  if (!role) {
    return "No mapped level";
  }
  if (isTenantLevelRole(role)) {
    return "Tenant Level / Company Level";
  }
  return levelMap.get(role.hierarchyLevelId) ?? role.hierarchyLevelId;
}
