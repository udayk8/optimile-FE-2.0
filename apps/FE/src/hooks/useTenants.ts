import { useMockStore } from "@/app/mock-store";

export function useTenants() {
  const {
    platformTenants,
    createTenant,
    createSampleTenant,
    updatePlatformTenant,
    getTenantById,
    getTenantPrimaryAdminUser,
  } = useMockStore();
  return {
    data: platformTenants,
    createTenant,
    createSampleTenant,
    updateTenant: updatePlatformTenant,
    getTenantById,
    getTenantPrimaryAdminUser,
  };
}
