import { useMockStore } from "@tms-booking/shared/store/mock-store";

export function useTenantModules(tenantId: string) {
  const { listTenantCapabilities } = useMockStore();
  return { data: listTenantCapabilities(tenantId) };
}

