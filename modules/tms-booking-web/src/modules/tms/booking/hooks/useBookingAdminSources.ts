import { useAppStore } from "../../../../store/useAppStore";

export function useBookingAdminSources(tenantId: string) {
  const appStore = useAppStore(tenantId);

  return {
    customers: appStore.customers,
    customerAddressMap: appStore.customerAddressMap,
    customerMap: appStore.customerMap,
    customerRateCardMap: appStore.customerRateCardMap,
    addresses: appStore.addresses,
    rateCards: appStore.rateCards,
    materials: appStore.materials,
    uomDefinitions: appStore.uomDefinitions,
    uomMappings: appStore.uomMappings,
    lrConfigs: appStore.lrConfigs,
    vehicleTypes: appStore.vehicleTypes,
    vehicles: appStore.vehicles,
    drivers: appStore.drivers,
    vendors: appStore.vendors,
  };
}
