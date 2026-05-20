import { apiClient } from './apiClient'

const VEHICLE_CACHE_KEY = 'fleet_control_master_vehicles'
const DRIVER_CACHE_KEY = 'fleet_control_master_drivers'

interface CachedVehicle {
  id: string
  regNumber: string | null
  model: string | null
  vehicleType: string | null
  capacityTons: number | string | null
  ownershipType: string | null
  assignedDriverId: string | null
  status: string | null
  odometerKm: number | string | null
  chassisNumber?: string | null
  engineNumber?: string | null
  make?: string | null
  manufacturingYear?: number | null
  fuelType?: string | null
  emissionStandard?: string | null
  gvwTons?: number | string | null
  bodyType?: string | null
  maintenanceTemplateId?: string | null
  axleConfiguration?: string | null
}

interface CachedDriver {
  id: string
  name: string | null
  phone: string | null
  alternatePhone?: string | null
  licenseNumber?: string | null
  licenseExpiryDate?: string | null
  status: string | null
  assignedVehicleId: string | null
  driverType?: string | null
  homeLocation?: string | null
  employmentStartDate?: string | null
}

function readCache<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeCache<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value))
}

function upsertById<T extends { id: string }>(items: T[], nextItem: T) {
  return [nextItem, ...items.filter((item) => item.id !== nextItem.id)]
}

export const masterDataCrudApi = {
  async createVehicle(data: {
    id: string
    registrationNumber: string
    vehicleType: string
    make?: string
    model?: string
    year?: number
    capacity?: number
    fuelType?: string
    status?: string
  }) {
    const cachedVehicle: CachedVehicle = {
      id: data.id,
      regNumber: data.registrationNumber,
      model: data.model ?? null,
      vehicleType: data.vehicleType ?? null,
      capacityTons: data.capacity ?? null,
      ownershipType: null,
      assignedDriverId: null,
      status: data.status ?? 'Active',
      odometerKm: null,
      make: data.make ?? null,
      manufacturingYear: data.year ?? null,
      fuelType: data.fuelType ?? null,
    }

    try {
      await apiClient.post('/api/v1/master/vehicles', data)
    } catch {
      // Local cache remains the fallback source until write endpoints are confirmed.
    }

    writeCache(VEHICLE_CACHE_KEY, upsertById(readCache<CachedVehicle>(VEHICLE_CACHE_KEY), cachedVehicle))
  },

  async updateVehicle(id: string, updates: {
    registrationNumber?: string
    vehicleType?: string
    status?: string
    make?: string
    model?: string
  }) {
    try {
      await apiClient.put(`/api/v1/master/vehicles/${id}`, updates)
    } catch {
      // Cache update below is the fallback persistence path.
    }

    const current = readCache<CachedVehicle>(VEHICLE_CACHE_KEY)
    const existing = current.find((item) => item.id === id)
    if (!existing) return
    writeCache(
      VEHICLE_CACHE_KEY,
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              regNumber: updates.registrationNumber ?? item.regNumber,
              vehicleType: updates.vehicleType ?? item.vehicleType,
              status: updates.status ?? item.status,
              make: updates.make ?? item.make,
              model: updates.model ?? item.model,
            }
          : item,
      ),
    )
  },

  async deleteVehicle(id: string) {
    try {
      await apiClient.delete(`/api/v1/master/vehicles/${id}`)
    } catch {
      // Cache delete below is the fallback persistence path.
    }
    writeCache(
      VEHICLE_CACHE_KEY,
      readCache<CachedVehicle>(VEHICLE_CACHE_KEY).filter((item) => item.id !== id),
    )
  },

  async createDriver(data: {
    id: string
    name: string
    phone?: string
    licenseNumber?: string
    licenseExpiry?: string
    status?: string
  }) {
    const cachedDriver: CachedDriver = {
      id: data.id,
      name: data.name,
      phone: data.phone ?? null,
      licenseNumber: data.licenseNumber ?? null,
      licenseExpiryDate: data.licenseExpiry ?? null,
      status: data.status ?? 'Active',
      assignedVehicleId: null,
    }

    try {
      await apiClient.post('/api/v1/master/drivers', data)
    } catch {
      // Local cache remains the fallback source until write endpoints are confirmed.
    }

    writeCache(DRIVER_CACHE_KEY, upsertById(readCache<CachedDriver>(DRIVER_CACHE_KEY), cachedDriver))
  },

  async updateDriver(id: string, updates: {
    name?: string
    phone?: string
    licenseNumber?: string
    licenseExpiry?: string
    status?: string
  }) {
    try {
      await apiClient.put(`/api/v1/master/drivers/${id}`, updates)
    } catch {
      // Cache update below is the fallback persistence path.
    }

    const current = readCache<CachedDriver>(DRIVER_CACHE_KEY)
    const existing = current.find((item) => item.id === id)
    if (!existing) return
    writeCache(
      DRIVER_CACHE_KEY,
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              name: updates.name ?? item.name,
              phone: updates.phone ?? item.phone,
              licenseNumber: updates.licenseNumber ?? item.licenseNumber,
              licenseExpiryDate: updates.licenseExpiry ?? item.licenseExpiryDate,
              status: updates.status ?? item.status,
            }
          : item,
      ),
    )
  },

  async deleteDriver(id: string) {
    try {
      await apiClient.delete(`/api/v1/master/drivers/${id}`)
    } catch {
      // Cache delete below is the fallback persistence path.
    }
    writeCache(
      DRIVER_CACHE_KEY,
      readCache<CachedDriver>(DRIVER_CACHE_KEY).filter((item) => item.id !== id),
    )
  },
}
