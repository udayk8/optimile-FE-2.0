import { useAppStore } from "@/shared/store/useAppStore";

export function useBookingAdminSources(tenantId: string) {
  const appStore = useAppStore(tenantId);

  return {
    customers: appStore.customers,
    bookings: appStore.bookings,
    invoices: appStore.invoices,
    users: appStore.users,
    customerAddressMap: appStore.customerAddressMap,
    customerMap: appStore.customerMap,
    customerRateCardMap: appStore.customerRateCardMap,
    vendorRateCards: appStore.vendorRateCards,
    vendorRateCardMap: appStore.vendorRateCardMap,
    addresses: appStore.addresses,
    rateCards: appStore.rateCards,
    materials: appStore.materials,
    uomDefinitions: appStore.uomDefinitions,
    uomMappings: appStore.uomMappings,
    lrConfigs: appStore.lrConfigs,
    lrPools: appStore.lrPools,
    vehicleTypes: appStore.vehicleTypes,
    vehicles: appStore.vehicles,
    drivers: appStore.drivers,
    vendors: appStore.vendors,
  };
}
