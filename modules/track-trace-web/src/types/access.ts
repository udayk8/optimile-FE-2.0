export type TrackTraceRole =
  | 'platform-admin'
  | 'tenant-admin'
  | 'customer'
  | 'vendor'
  | 'fleet-operator'
  | 'control-tower'

export type TrackTracePageKey =
  | 'dashboard'
  | 'shipments'
  | 'shipment-detail'
  | 'replay'
  | 'customer-preview'
  | 'analytics'
  | 'route-performance'
  | 'driver-behavior'
  | 'vehicles'
  | 'vehicle-detail'
  | 'live-map'
  | 'route-progress'
  | 'exceptions'
  | 'alerts'
  | 'pod'
  | 'control-tower'
  | 'geofences'

export type TrackTracePlan = 'Basic' | 'Professional' | 'Enterprise'

export type TrackTracePermission =
  | 'track_trace:read'
  | 'track_trace:write'
  | 'track_trace:alerts:manage'
  | 'track_trace:geofence:manage'
  | 'track_trace:replay:view'
  | 'track_trace:customer_link:view'
  | 'track_trace:analytics:view'
  | 'track_trace:prediction:view'

export type TrackTraceFeatureKey =
  | 'tracking.analytics'
  | 'tracking.routePerformance'
  | 'tracking.driverBehavior'
  | 'tracking.prediction'
  | 'tracking.geofences'
  | 'tracking.replay'
  | 'tracking.customerPreview'

export interface TrackTraceRoleOption {
  label: string
  value: TrackTraceRole
  description: string
}
