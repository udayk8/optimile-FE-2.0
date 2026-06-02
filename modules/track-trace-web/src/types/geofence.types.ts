export type GeofenceType =
  | 'Pickup'
  | 'Drop'
  | 'Warehouse'
  | 'Yard'
  | 'Customer Site'
  | 'Checkpoint'
  | 'Restricted Zone'
  | 'Custom'

export type GeofenceShape = 'Circle'
export type LinkedEntityType = 'TRIP' | 'BOOKING' | 'CUSTOMER' | 'WAREHOUSE' | 'CHECKPOINT' | 'YARD' | 'CUSTOM'

export interface TrackingGeofence {
  id: string
  tenantId: string
  name: string
  type: GeofenceType
  latitude: number
  longitude: number
  radiusMeters: number
  shape: GeofenceShape
  linkedEntityType: LinkedEntityType
  linkedEntityId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  dwellAlertMinutes?: number
  entryAlertEnabled?: boolean
  group?: string
}

export interface GeofenceEvent {
  id: string
  tripId: string
  geofenceId: string
  geofenceName: string
  eventType: 'GeofenceEntered' | 'GeofenceExited'
  eventTime: string
  latitude: number
  longitude: number
}

export interface GeofencePayload {
  tenantId: string
  name: string
  type: GeofenceType
  latitude: number
  longitude: number
  radiusMeters: number
  linkedEntityType: LinkedEntityType
  linkedEntityId: string
  isActive?: boolean
  dwellAlertMinutes?: number
  entryAlertEnabled?: boolean
  group?: string
}
