import { useMockStore } from "@/app/mock-store";
import type { TenantDriverInput, TenantVehicleInput } from "@/types/fleet";

export function useTenantVehicles(tenantId: string) {
  const {
    listTenantVehicles,
    getTenantVehicleById,
    createTenantVehicle,
    updateTenantVehicle,
  } = useMockStore();

  return {
    data: listTenantVehicles(tenantId),
    getTenantVehicleById,
    createVehicle: (input: TenantVehicleInput) =>
      createTenantVehicle({
        tenantId,
        ...input,
      }),
    updateVehicle: (vehicleId: string, updates: Partial<TenantVehicleInput>) =>
      updateTenantVehicle(vehicleId, updates),
  };
}

export function useTenantDrivers(tenantId: string) {
  const {
    listTenantDrivers,
    getTenantDriverById,
    createTenantDriver,
    updateTenantDriver,
  } = useMockStore();

  return {
    data: listTenantDrivers(tenantId),
    getTenantDriverById,
    createDriver: (input: TenantDriverInput) =>
      createTenantDriver({
        tenantId,
        ...input,
      }),
    updateDriver: (driverId: string, updates: Partial<TenantDriverInput>) =>
      updateTenantDriver(driverId, updates),
  };
}
