import { useMockStore } from "@/shared/store/mock-store";
import type { TenantHierarchyConfig } from "@/types/tenant-workspace";

export function useTenantHierarchy(tenantId: string) {
  const { getTenantHierarchyState, saveTenantHierarchy } = useMockStore();
  return {
    data: getTenantHierarchyState(tenantId),
    saveHierarchy: (hierarchy: TenantHierarchyConfig) => saveTenantHierarchy(tenantId, hierarchy),
  };
}
