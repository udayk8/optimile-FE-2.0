import { useMockStore } from "../../../store/mock-store";
import type {
  TenantCustomerAddressInput,
  TenantCustomerInput,
  TenantCustomerRateCardInput,
} from "../../../types/customer";

export function useTenantCustomers(tenantId: string) {
  const {
    listTenantCustomers,
    getTenantCustomerById,
    createTenantCustomer,
    updateTenantCustomer,
    listTenantCustomerAddresses,
    createTenantCustomerAddress,
    updateTenantCustomerAddress,
    deleteTenantCustomerAddress,
    listTenantCustomerRateCards,
    createTenantCustomerRateCard,
    updateTenantCustomerRateCard,
    deleteTenantCustomerRateCard,
  } = useMockStore();

  return {
    data: listTenantCustomers(tenantId),
    getTenantCustomerById,
    createCustomer: (input: TenantCustomerInput) =>
      createTenantCustomer({
        tenantId,
        ...input,
      }),
    updateTenantCustomer: (
      tenantCustomerId: string,
      updates: Partial<TenantCustomerInput>,
    ) => updateTenantCustomer(tenantCustomerId, updates),
    listAddresses: (tenantCustomerId: string) => listTenantCustomerAddresses(tenantCustomerId),
    createAddress: (
      tenantCustomerId: string,
      input: TenantCustomerAddressInput,
    ) =>
      createTenantCustomerAddress({
        tenantId,
        tenantCustomerId,
        ...input,
      }),
    updateAddress: (addressId: string, updates: Partial<TenantCustomerAddressInput>) =>
      updateTenantCustomerAddress(addressId, updates),
    deleteAddress: (addressId: string) => deleteTenantCustomerAddress(addressId),
    listRateCards: (tenantCustomerId: string) => listTenantCustomerRateCards(tenantCustomerId),
    createRateCard: (
      tenantCustomerId: string,
      input: TenantCustomerRateCardInput,
    ) =>
      createTenantCustomerRateCard({
        tenantId,
        tenantCustomerId,
        ...input,
      }),
    updateRateCard: (rateCardId: string, updates: Partial<TenantCustomerRateCardInput>) =>
      updateTenantCustomerRateCard(rateCardId, updates),
    deleteRateCard: (rateCardId: string) => deleteTenantCustomerRateCard(rateCardId),
  };
}
