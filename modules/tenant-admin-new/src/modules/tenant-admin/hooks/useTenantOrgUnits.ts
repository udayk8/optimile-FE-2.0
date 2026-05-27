import { useMockStore } from "@/shared/store/mock-store";
import type { OrgUnit } from "@/types/access";

export function useTenantOrgUnits(tenantId: string) {
  const { listTenantOrgUnits, createTenantOrgUnit, updateTenantOrgUnit, deleteTenantOrgUnit } =
    useMockStore();
  return {
    data: listTenantOrgUnits(tenantId),
    createOrgUnit: (input: Omit<OrgUnit, "id">) => createTenantOrgUnit(input),
    updateOrgUnit: (
      orgUnitId: string,
      updates: Partial<
        Pick<OrgUnit, "name" | "hierarchyLevelId" | "parentOrgUnitId" | "status">
      >,
    ) => updateTenantOrgUnit(orgUnitId, updates),
    deleteOrgUnit: (orgUnitId: string) => deleteTenantOrgUnit(orgUnitId),
  };
}
