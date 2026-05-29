export interface TrackingAuditLogFilters {
  fromDate?: string
  toDate?: string
  user?: string
  action?: string
  entityType?: string
  tripId?: string
  vehicleNumber?: string
}

export interface TrackingAuditLog {
  id: string
  tenantId: string
  userId: string
  userName: string
  action: string
  entityType: string
  entityId: string
  description: string
  ipAddress: string
  userAgent: string
  createdAt: string
  metadata?: Record<string, string | number | boolean | null>
}
