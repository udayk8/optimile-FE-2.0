import type { TrackingAuditLog, TrackingAuditLogFilters } from '../types/audit.types'

const auditLogs: TrackingAuditLog[] = [
  {
    id: 'AUD-001',
    tenantId: 'tenant-optimile',
    userId: 'user-ct-1',
    userName: 'Aditi Sharma',
    action: 'Viewed Live Location',
    entityType: 'Trip',
    entityId: 'TRIP-1001',
    description: 'Opened live map for TRIP-1001',
    ipAddress: '10.20.40.14',
    userAgent: 'Chrome / Mac',
    createdAt: '2026-05-07T09:12:00+05:30',
    metadata: { page: 'live-map' },
  },
  {
    id: 'AUD-002',
    tenantId: 'tenant-optimile',
    userId: 'user-ct-2',
    userName: 'Rohan Mehta',
    action: 'Acknowledged Alert',
    entityType: 'Alert',
    entityId: 'ALT-1002',
    description: 'Acknowledged route deviation alert for TRIP-1002',
    ipAddress: '10.20.40.16',
    userAgent: 'Chrome / Windows',
    createdAt: '2026-05-07T09:40:00+05:30',
    metadata: { tripId: 'TRIP-1002', vehicleNumber: 'TN 18 BX 4410' },
  },
  {
    id: 'AUD-003',
    tenantId: 'tenant-optimile',
    userId: 'user-admin-1',
    userName: 'Neha Kapur',
    action: 'Changed Tracking Rule',
    entityType: 'TrackingRules',
    entityId: 'tracking-rules',
    description: 'Updated vehicle offline threshold from 8 to 10 minutes',
    ipAddress: '10.20.40.18',
    userAgent: 'Chrome / Mac',
    createdAt: '2026-05-07T10:20:00+05:30',
    metadata: { field: 'vehicleOfflineThresholdMinutes', from: 8, to: 10 },
  },
  {
    id: 'AUD-004',
    tenantId: 'tenant-optimile',
    userId: 'user-report-1',
    userName: 'Karan Pillai',
    action: 'Exported Report',
    entityType: 'Report',
    entityId: 'Delay Report',
    description: 'Triggered CSV export for Delay Report',
    ipAddress: '10.20.40.22',
    userAgent: 'Chrome / Linux',
    createdAt: '2026-05-07T11:05:00+05:30',
    metadata: { format: 'csv' },
  },
]

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function resolveAfter<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(clone(value)), ms))
}

export async function getTrackingAuditLogs(filters?: TrackingAuditLogFilters): Promise<TrackingAuditLog[]> {
  const rows = auditLogs.filter((log) => {
    if (filters?.user && !log.userName.toLowerCase().includes(filters.user.toLowerCase())) return false
    if (filters?.action && !log.action.toLowerCase().includes(filters.action.toLowerCase())) return false
    if (filters?.entityType && !log.entityType.toLowerCase().includes(filters.entityType.toLowerCase())) return false
    if (filters?.tripId && String(log.metadata?.tripId ?? '').toLowerCase() !== filters.tripId.toLowerCase()) return false
    if (filters?.vehicleNumber && String(log.metadata?.vehicleNumber ?? '').toLowerCase() !== filters.vehicleNumber.toLowerCase()) return false
    return true
  })

  return resolveAfter(rows)
}

export async function createTrackingAuditLog(payload: Omit<TrackingAuditLog, 'id' | 'createdAt'>) {
  return resolveAfter({
    ...payload,
    id: `AUD-${Math.floor(Math.random() * 900 + 100)}`,
    createdAt: new Date().toISOString(),
  })
}
