import { useMockStore } from "@/app/mock-store";

export function useTenantRolePermissions(tenantId: string) {
  const { listTenantRolePermissions, saveRolePermissions } = useMockStore();
  return {
    data: listTenantRolePermissions(tenantId),
    saveRolePermissions,
  };
}
