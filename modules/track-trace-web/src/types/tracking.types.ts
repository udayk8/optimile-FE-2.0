export type TrackingStatus =
  | 'Scheduled'
  | 'Assigned'
  | 'At Pickup'
  | 'Loading'
  | 'In Transit'
  | 'At Checkpoint'
  | 'Near Destination'
  | 'At Destination'
  | 'Unloading'
  | 'Completed'
  | 'Delayed'
  | 'Idle'
  | 'Stopped'
  | 'Offline'
  | 'Route Deviated'
  | 'Cancelled'

export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical'
export type AlertStatus = 'Open' | 'Acknowledged' | 'Resolved'
export type TrackingSource = 'DRIVER_APP' | 'GPS_DEVICE' | 'FASTAG' | 'ANPR' | 'MANUAL'
export type CheckpointStatus = 'Pending' | 'Reached' | 'Missed'
export type EtaConfidence = 'Low' | 'Medium' | 'High'
export type TrackingDeviceRole = 'PRIMARY' | 'SECONDARY' | 'DRIVER_APP'
export type TrackingDeviceStatus = 'Active' | 'Standby' | 'Unavailable' | 'Faulted'
export type DelayReason =
  | 'Traffic'
  | 'Vehicle Idle'
  | 'Route Deviation'
  | 'Checkpoint Delay'
  | 'Loading Delay'
  | 'Unloading Delay'
  | 'GPS Missing'
  | 'Unknown'

export interface TrackingLocation {
  latitude: number
  longitude: number
  speed?: number
  heading?: number
  accuracy?: number
  recordedAt: string
  source: TrackingSource
}

export interface TrackingDeviceReading {
  recordedAt: string
  latitude: number
  longitude: number
  speed?: number
  heading?: number
  accuracy?: number
}

export interface TrackingDevice {
  id: string
  bookingId: string
  vehicleId?: string
  label: string
  role: TrackingDeviceRole
  source: TrackingSource
  provider?: string
  imei?: string
  phoneNumber?: string
  isAssigned: boolean
  status: TrackingDeviceStatus
  lastSeenAt?: string
  lastReading?: TrackingDeviceReading
  staleAfterMinutes?: number
  priorityRank?: number
  healthNote?: string
}

export interface TrackingSourceSwitchAuditEntry {
  id: string
  tripId: string
  switchedBy: string
  switchedAt: string
  fromDeviceId?: string
  fromSource?: TrackingSource
  toDeviceId: string
  toSource: TrackingSource
  reason: 'Manual Override' | 'Auto Fallback'
  note?: string
}

export interface TrackingCheckpoint {
  id: string
  name: string
  city: string
  plannedAt: string
  actualAt?: string
  status: CheckpointStatus
  location: TrackingLocation
}

export interface TrackingTrip {
  id: string
  tenantId?: string
  bookingId: string
  vehicleId?: string
  customerName: string
  vehicleNumber: string
  driverName: string
  driverMobile: string
  origin: string
  destination: string
  status: TrackingStatus
  scheduledPickupTime: string
  actualPickupTime?: string
  scheduledDeliveryTime: string
  eta: string
  plannedEta?: string
  currentEta?: string
  delayMinutes: number
  lastRecalculatedAt?: string
  etaConfidence?: EtaConfidence
  delayReason?: DelayReason
  lastUpdatedAt: string
  distanceCoveredKm: number
  remainingDistanceKm: number
  currentLocation: TrackingLocation
  lastLocationLabel: string
  vehicleType: string
  primarySource?: TrackingSource
  activeSource?: TrackingSource
  sourceHealth?: 'Healthy' | 'Stale' | 'Fallback' | 'Offline'
  trackingDevices?: TrackingDevice[]
  activeTrackingDeviceId?: string
  manualOverrideSource?: TrackingSource
  lastSourceSwitchedAt?: string
  lastSourceSwitchedBy?: string
  sourceSwitchAuditTrail?: TrackingSourceSwitchAuditEntry[]
  trackingDeviceLabel?: string
  trackingDeviceId?: string
  isOffline: boolean
  routeDeviationKm: number
  idleMinutes?: number
  plannedRoute: TrackingLocation[]
  actualRoute: TrackingLocation[]
  checkpoints: TrackingCheckpoint[]
  customerSafeStatus: string
}

export interface TrackingEvent {
  id: string
  tripId: string
  type: string
  title: string
  description: string
  eventTime: string
  location?: string
  metadata?: Record<string, string | number | boolean | null>
}

export interface TrackingAlert {
  id: string
  tripId: string
  vehicleNumber: string
  type: string
  severity: AlertSeverity
  status: AlertStatus
  message: string
  location: string
  createdAt: string
  assignedTo?: string
  remarks?: string[]
  acknowledgedBy?: string
  resolvedBy?: string
  resolutionNote?: string
  updatedAt?: string
}

export interface TrackingDashboardSummary {
  totalActiveTrips: number
  inTransitTrips: number
  delayedTrips: number
  idleVehicles: number
  offlineVehicles: number
  openAlerts: number
  averageEtaDelay: number
  onTimePercentage: number
}

export interface RouteDeviation {
  id: string
  tripId: string
  plannedRouteId: string
  deviationDistanceKm: number
  detectedAt: string
  latitude: number
  longitude: number
  severity: AlertSeverity
  status: AlertStatus
}

export interface TripReplay {
  tripId: string
  vehicleNumber: string
  driverName: string
  startTime: string
  endTime: string
  locations: TrackingLocation[]
  events: TrackingEvent[]
  alerts: TrackingAlert[]
  totalDistanceKm: number
  totalIdleMinutes: number
  maxSpeed: number
  averageSpeed: number
}

export interface CustomerTrackingView {
  bookingId: string
  currentStatus: string
  origin: string
  destination: string
  eta: string
  delayStatus: string
  publicTimeline: Array<{
    title: string
    time: string
    location?: string
  }>
  lastUpdatedAt: string
  podStatus: 'Pending' | 'Delivered' | 'Unavailable'
  currentRegion: string
}
