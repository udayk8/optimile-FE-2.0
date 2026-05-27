import type { GeofencePayload, TrackingGeofence } from '../types/geofence.types'

let mockGeofenceDb: TrackingGeofence[] = [
  {
    id: 'GF-1',
    tenantId: 'tenant-optimile',
    name: 'Delhi Pickup Dock',
    type: 'Pickup',
    latitude: 28.6139,
    longitude: 77.209,
    radiusMeters: 250,
    shape: 'Circle',
    linkedEntityType: 'TRIP',
    linkedEntityId: 'TRIP-1001',
    isActive: true,
    createdAt: '2026-05-01T10:00:00+05:30',
    updatedAt: '2026-05-05T10:30:00+05:30',
  },
  {
    id: 'GF-2',
    tenantId: 'tenant-optimile',
    name: 'Nellore Transit Checkpoint',
    type: 'Checkpoint',
    latitude: 14.4426,
    longitude: 79.9865,
    radiusMeters: 400,
    shape: 'Circle',
    linkedEntityType: 'CHECKPOINT',
    linkedEntityId: 'TRIP-1002-CP2',
    isActive: true,
    createdAt: '2026-05-02T11:20:00+05:30',
    updatedAt: '2026-05-05T12:10:00+05:30',
  },
  {
    id: 'GF-3',
    tenantId: 'tenant-optimile',
    name: 'Raipur Restricted Yard',
    type: 'Restricted Zone',
    latitude: 21.2514,
    longitude: 81.6296,
    radiusMeters: 600,
    shape: 'Circle',
    linkedEntityType: 'YARD',
    linkedEntityId: 'yard-raipur-01',
    isActive: false,
    createdAt: '2026-05-03T09:45:00+05:30',
    updatedAt: '2026-05-06T09:45:00+05:30',
  },
]

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function resolveAfter<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(clone(value)), ms)
  })
}

function validatePayload(payload: GeofencePayload) {
  if (!payload.name.trim()) throw new Error('Geofence name is required.')
  if (!payload.type) throw new Error('Geofence type is required.')
  if (Number.isNaN(payload.latitude)) throw new Error('Latitude is required.')
  if (Number.isNaN(payload.longitude)) throw new Error('Longitude is required.')
  if (payload.radiusMeters <= 0) throw new Error('Radius must be greater than 0.')
  if (payload.radiusMeters > 5000) throw new Error('Radius should stay within a sensible operational maximum.')
}

function nextGeofenceId() {
  const highestExistingId = mockGeofenceDb.reduce((highest, item) => {
    const numericId = Number(item.id.replace('GF-', ''))
    return Number.isFinite(numericId) ? Math.max(highest, numericId) : highest
  }, 0)

  return `GF-${highestExistingId + 1}`
}

export async function getGeofences(): Promise<TrackingGeofence[]> {
  return resolveAfter(mockGeofenceDb)
}

export async function getGeofenceById(id: string): Promise<TrackingGeofence | undefined> {
  return resolveAfter(mockGeofenceDb.find((item) => item.id === id))
}

export async function createGeofence(payload: GeofencePayload): Promise<TrackingGeofence> {
  validatePayload(payload)
  const timestamp = new Date().toISOString()
  const next: TrackingGeofence = {
    id: nextGeofenceId(),
    shape: 'Circle',
    isActive: payload.isActive ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...payload,
  }
  mockGeofenceDb = [next, ...mockGeofenceDb]
  return resolveAfter(next)
}

export async function updateGeofence(id: string, payload: GeofencePayload): Promise<TrackingGeofence> {
  validatePayload(payload)
  const current = mockGeofenceDb.find((item) => item.id === id)
  if (!current) throw new Error('Geofence not found.')
  const updated: TrackingGeofence = {
    ...current,
    ...payload,
    isActive: payload.isActive ?? current.isActive,
    updatedAt: new Date().toISOString(),
  }
  mockGeofenceDb = mockGeofenceDb.map((item) => (item.id === id ? updated : item))
  return resolveAfter(updated)
}

export async function deleteGeofence(id: string) {
  mockGeofenceDb = mockGeofenceDb.filter((item) => item.id !== id)
  return resolveAfter({ success: true })
}

export async function toggleGeofenceStatus(id: string, isActive: boolean): Promise<TrackingGeofence> {
  const current = mockGeofenceDb.find((item) => item.id === id)
  if (!current) throw new Error('Geofence not found.')
  const updated = {
    ...current,
    isActive,
    updatedAt: new Date().toISOString(),
  }
  mockGeofenceDb = mockGeofenceDb.map((item) => (item.id === id ? updated : item))
  return resolveAfter(updated)
}
