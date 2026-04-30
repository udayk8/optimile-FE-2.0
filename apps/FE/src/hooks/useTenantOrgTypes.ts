import { useMemo } from "react";
import { useMockStore } from "@/app/mock-store";

export function useTenantOrgTypes(tenantId: string) {
  const { getTenantHierarchyState } = useMockStore();
  const data = useMemo(
    () =>
      [...getTenantHierarchyState(tenantId).hierarchy.levels]
        .sort((a, b) => a.order - b.order)
        .map((item) => ({
          id: item.id,
          name: item.name,
          active: item.active,
          order: item.order,
        })),
    [getTenantHierarchyState, tenantId],
  );
  return { data };
}
