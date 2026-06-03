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

  // Embedded → MERGE the vendor's real onboarded fleet (bridge) with the local
  // mock demo fleet, so both show and either can be picked when assigning a demo
  // trip. Real records come first. New fleet persists to the tenant (bridge) so
  // it also appears under administration; updates route to whichever source owns
  // the id.
  if (bridge) {
    const bridgeVehicleIds = new Set(bridge.vehicles.map((v) => v.id))
    const bridgeDriverIds = new Set(bridge.drivers.map((d) => d.id))
    // Tag each record with its origin so the UI can shade rows (real vs demo).
    const realVehicles = bridge.vehicles.map((v) => ({ ...v, _source: 'CROSS_MODULE' as const }))
    const realDrivers = bridge.drivers.map((d) => ({ ...d, _source: 'CROSS_MODULE' as const }))
    const demoVehicles = vehicles.filter((v) => !bridgeVehicleIds.has(v.id)).map((v) => ({ ...v, _source: 'MOCK' as const }))
    const demoDrivers = drivers.filter((d) => !bridgeDriverIds.has(d.id)).map((d) => ({ ...d, _source: 'MOCK' as const }))
    return {
      vehicles: [...realVehicles, ...demoVehicles],
      drivers: [...realDrivers, ...demoDrivers],
      addVehicle: bridge.addVehicle,
      updateVehicle: (vehicle) => (bridgeVehicleIds.has(vehicle.id) ? bridge.updateVehicle(vehicle) : updateVehicle(vehicle)),
      addDriver: bridge.addDriver,
      updateDriver: (driver) => (bridgeDriverIds.has(driver.id) ? bridge.updateDriver(driver) : updateDriver(driver)),
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
