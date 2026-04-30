import { useMockStore } from "@/app/mock-store";

export function useTenantModules(tenantId: string) {
  const { listTenantCapabilities } = useMockStore();
  return { data: listTenantCapabilities(tenantId) };
}
