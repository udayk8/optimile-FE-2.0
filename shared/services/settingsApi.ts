const STORAGE_KEYS = {
  vehicleTypes: 'fleet_control_settings_vehicle_types',
  tyreBrands: 'fleet_control_settings_tyre_brands',
  batteryModels: 'fleet_control_settings_battery_models',
  inventoryCategories: 'fleet_control_settings_inventory_categories',
} as const

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeList<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value))
}

function createCrudStore(key: string) {
  return {
    async list<T>(): Promise<T[]> {
      return readList<T>(key)
    },
    async create<T extends { id: string }>(item: T): Promise<T> {
      writeList(key, [item, ...readList<T>(key).filter((entry) => entry.id !== item.id)])
      return item
    },
    async update<T extends { id: string }>(id: string, nextItem: T): Promise<T> {
      writeList(
        key,
        readList<T>(key).map((entry) => (entry.id === id ? nextItem : entry)),
      )
      return nextItem
    },
    async remove(id: string): Promise<void> {
      writeList(
        key,
        readList<{ id: string }>(key).filter((entry) => entry.id !== id),
      )
    },
  }
}

export const fleetSettingsApi = {
  vehicleTypes: createCrudStore(STORAGE_KEYS.vehicleTypes),
  tyreBrands: createCrudStore(STORAGE_KEYS.tyreBrands),
  batteryModels: createCrudStore(STORAGE_KEYS.batteryModels),
  inventoryCategories: createCrudStore(STORAGE_KEYS.inventoryCategories),
}
