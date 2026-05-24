import { useMockStore } from "@/shared/store/mock-store";
import type { TenantVendorInput, TenantVendorRateCardInput } from "@/types/vendor";

export function useTenantVendors(tenantId: string) {
  const {
    listTenantVendors,
    getTenantVendorById,
    createTenantVendor,
    updateTenantVendor,
    listTenantVendorRateCards,
    createTenantVendorRateCard,
    updateTenantVendorRateCard,
  } = useMockStore();

  return {
    data: listTenantVendors(tenantId),
    getTenantVendorById,
    createVendor: (input: TenantVendorInput) =>
      createTenantVendor({
        tenantId,
        ...input,
      }),
    updateTenantVendor: (
      tenantVendorId: string,
      updates: Partial<TenantVendorInput>,
    ) => updateTenantVendor(tenantVendorId, updates),
    listRateCards: (tenantVendorId: string) => listTenantVendorRateCards(tenantVendorId),
    createRateCard: (tenantVendorId: string, input: TenantVendorRateCardInput) =>
      createTenantVendorRateCard({
        tenantId,
        tenantVendorId,
        ...input,
      }),
    updateRateCard: (rateCardId: string, updates: Partial<TenantVendorRateCardInput>) =>
      updateTenantVendorRateCard(rateCardId, updates),
  };
}
