import { useMockStore } from "../../../store/mock-store";

export function useTenantModules(tenantId: string) {
  const { listTenantCapabilities } = useMockStore();
  return { data: listTenantCapabilities(tenantId) };
}
