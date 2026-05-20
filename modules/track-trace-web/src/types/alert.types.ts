import type { AlertSeverity, AlertStatus, TrackingAlert } from './tracking.types'

export interface TrackingAlertFilters {
  severity?: AlertSeverity | 'All'
  status?: AlertStatus | 'All'
  type?: string
  tripId?: string
  vehicleNumber?: string
}

export interface AcknowledgeAlertPayload {
  acknowledgedBy: string
  remarks?: string
}

export interface ResolveAlertPayload {
  resolvedBy: string
  resolutionNote: string
}

export interface AssignAlertPayload {
  userId: string
}

export interface TrackingAlertAuditEntry {
  id: string
  alertId: string
  action: 'Acknowledged' | 'Resolved' | 'Assigned' | 'Remark Added'
  by: string
  note?: string
  createdAt: string
}

export interface TrackingAlertRecord extends TrackingAlert {
  auditTrail?: TrackingAlertAuditEntry[]
}
