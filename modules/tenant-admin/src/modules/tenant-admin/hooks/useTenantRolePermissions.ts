import { useMockStore } from "../../../store/mock-store";

export function useTenantRolePermissions(tenantId: string) {
  const { listTenantRolePermissions, saveRolePermissions } = useMockStore();
  return {
    data: listTenantRolePermissions(tenantId),
    saveRolePermissions,
  };
}
