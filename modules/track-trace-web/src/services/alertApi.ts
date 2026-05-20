import { trackingAlerts } from '../store/trackingMockData'
import type {
  AcknowledgeAlertPayload,
  AssignAlertPayload,
  ResolveAlertPayload,
  TrackingAlertFilters,
  TrackingAlertRecord,
} from '../types/alert.types'

const USE_MOCK_TRACKING = import.meta.env.VITE_USE_MOCK_TRACKING !== 'false'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function resolveAfter<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(clone(value)), ms)
  })
}

export async function getTrackingAlerts(filters?: TrackingAlertFilters): Promise<TrackingAlertRecord[]> {
  if (!USE_MOCK_TRACKING) {
    return resolveAfter([])
  }

  const rows = trackingAlerts.filter((alert) => {
    if (filters?.severity && filters.severity !== 'All' && alert.severity !== filters.severity) return false
    if (filters?.status && filters.status !== 'All' && alert.status !== filters.status) return false
    if (filters?.type && !alert.type.toLowerCase().includes(filters.type.toLowerCase())) return false
    if (filters?.tripId && !alert.tripId.toLowerCase().includes(filters.tripId.toLowerCase())) return false
    if (filters?.vehicleNumber && !alert.vehicleNumber.toLowerCase().includes(filters.vehicleNumber.toLowerCase())) return false
    return true
  })

  return resolveAfter(rows)
}

export async function acknowledgeAlert(alertId: string, payload: AcknowledgeAlertPayload) {
  return resolveAfter({
    alertId,
    acknowledgedBy: payload.acknowledgedBy,
    remarks: payload.remarks,
    updatedAt: new Date().toISOString(),
  })
}

export async function resolveAlert(alertId: string, payload: ResolveAlertPayload) {
  return resolveAfter({
    alertId,
    resolvedBy: payload.resolvedBy,
    resolutionNote: payload.resolutionNote,
    updatedAt: new Date().toISOString(),
  })
}

export async function assignAlert(alertId: string, payload: AssignAlertPayload) {
  return resolveAfter({
    alertId,
    assignedTo: payload.userId,
    updatedAt: new Date().toISOString(),
  })
}

export async function addAlertRemark(alertId: string, remark: string) {
  return resolveAfter({
    alertId,
    remark,
    updatedAt: new Date().toISOString(),
  })
}
