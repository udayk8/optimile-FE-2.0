import { useAppStore } from '@vendor/stores/app.store'
import { useTenantBridge } from '@vendor/integration/tenant-data-bridge'
import type { Driver, Vehicle } from '@vendor/types'

export interface FleetData {
  vehicles: Vehicle[]
  drivers: Driver[]
  addVehicle: (vehicle: Vehicle) => void
  updateVehicle: (vehicle: Vehicle) => void
  addDriver: (driver: Driver) => void
  updateDriver: (driver: Driver) => void
  /**
   * Tenant vehicle-type labels when embedded (so new vehicles map to a real
   * tenant vehicle type), or `null` standalone (use the local default list).
   */
  vehicleTypeOptions: string[] | null
}

/**
 * Fleet data source for the Vendor Portal. When embedded in the tenant
 * workspace the bridge routes reads/writes to the SHARED tenant master data
 * (vendor-scoped); standalone it falls back to the local app.store.
 */
export function useFleetData(): FleetData {
  const bridge = useTenantBridge()
  const vehicles = useAppStore((state) => state.vehicles)
  const drivers = useAppStore((state) => state.drivers)
  const addVehicle = useAppStore((state) => state.addVehicle)
  const updateVehicle = useAppStore((state) => state.updateVehicle)
  const addDriver = useAppStore((state) => state.addDriver)
  const updateDriver = useAppStore((state) => state.updateDriver)

  // Embedded → ONLY the vendor's real onboarded fleet (bridge / shared tenant
  // master data). No local mock fleet is mixed in. New fleet persists to the
  // tenant so it also appears under administration.
  if (bridge) {
    return {
      vehicles: bridge.vehicles,
      drivers: bridge.drivers,
      addVehicle: bridge.addVehicle,
      updateVehicle: bridge.updateVehicle,
      addDriver: bridge.addDriver,
      updateDriver: bridge.updateDriver,
      vehicleTypeOptions: bridge.vehicleTypeOptions,
    }
  }

  // Standalone (no bridge): local mock demo fleet only, with the local
  // vehicle-type list.
  return {
    vehicles,
    drivers,
    addVehicle,
    updateVehicle,
    addDriver,
    updateDriver,
    vehicleTypeOptions: null,
  }
}
