import { useMockStore } from "@/app/mock-store";
import type { RoleDefinition } from "@/types/access";

export function useTenantRoles(tenantId: string) {
  const { listTenantRoles, createTenantRole, updateTenantRole } = useMockStore();
  return {
    data: listTenantRoles(tenantId),
    createRole: (input: Omit<RoleDefinition, "id">) => createTenantRole(input),
    updateRole: (
      roleId: string,
      updates: Partial<Pick<RoleDefinition, "name" | "description" | "hierarchyLevelId" | "moduleCodes" | "active">>,
    ) => updateTenantRole(roleId, updates),
  };
}
