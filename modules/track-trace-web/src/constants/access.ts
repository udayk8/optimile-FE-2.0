import type {
  TrackTraceFeatureKey,
  TrackTracePageKey,
  TrackTracePermission,
  TrackTracePlan,
  TrackTraceRole,
  TrackTraceRoleOption,
} from '../types/access'

export const TRACK_TRACE_ROLE_OPTIONS: TrackTraceRoleOption[] = [
  { value: 'control-tower', label: 'Control Tower', description: 'Full operational visibility across exceptions, alerts, routes, and POD workflows.' },
  { value: 'tenant-admin', label: 'Tenant Admin', description: 'Tenant-wide access to shipment visibility, vehicles, exceptions, and POD review.' },
  { value: 'platform-admin', label: 'Platform Admin', description: 'Cross-tenant oversight with emphasis on high-level operational visibility.' },
  { value: 'fleet-operator', label: 'Fleet Operator', description: 'Vehicle, route, and live map focused operations access.' },
  { value: 'vendor', label: 'Vendor', description: 'Assigned shipment and vehicle visibility with limited workflow access.' },
  { value: 'customer', label: 'Customer', description: 'Customer-safe shipment and POD visibility with limited operational controls.' },
]

export const TRACK_TRACE_ROLE_PAGE_ACCESS: Record<TrackTraceRole, TrackTracePageKey[]> = {
  'control-tower': ['dashboard', 'shipments', 'shipment-detail', 'replay', 'customer-preview', 'analytics', 'route-performance', 'driver-behavior', 'vehicles', 'vehicle-detail', 'live-map', 'route-progress', 'exceptions', 'alerts', 'pod', 'control-tower', 'geofences'],
  'tenant-admin': ['dashboard', 'shipments', 'shipment-detail', 'replay', 'customer-preview', 'analytics', 'route-performance', 'driver-behavior', 'vehicles', 'vehicle-detail', 'live-map', 'route-progress', 'exceptions', 'alerts', 'pod', 'control-tower', 'geofences'],
  'platform-admin': ['dashboard', 'shipments', 'shipment-detail', 'replay', 'customer-preview', 'analytics', 'route-performance', 'driver-behavior', 'vehicles', 'vehicle-detail', 'live-map', 'route-progress', 'exceptions', 'alerts', 'pod', 'control-tower', 'geofences'],
  'fleet-operator': ['dashboard', 'shipments', 'shipment-detail', 'replay', 'analytics', 'route-performance', 'driver-behavior', 'vehicles', 'vehicle-detail', 'live-map', 'route-progress', 'exceptions', 'alerts', 'control-tower', 'geofences'],
  vendor: ['dashboard', 'shipments', 'shipment-detail', 'customer-preview', 'vehicles', 'vehicle-detail', 'route-progress', 'alerts'],
  customer: ['dashboard', 'shipments', 'shipment-detail', 'customer-preview', 'pod'],
}

export const TRACK_TRACE_ROLE_PLAN_ACCESS: Record<TrackTraceRole, TrackTracePlan> = {
  'control-tower': 'Enterprise',
  'tenant-admin': 'Enterprise',
  'platform-admin': 'Enterprise',
  'fleet-operator': 'Professional',
  vendor: 'Professional',
  customer: 'Basic',
}

export const TRACK_TRACE_ROLE_PERMISSION_ACCESS: Record<TrackTraceRole, TrackTracePermission[]> = {
  'control-tower': [
    'track_trace:read',
    'track_trace:write',
    'track_trace:alerts:manage',
    'track_trace:geofence:manage',
    'track_trace:replay:view',
    'track_trace:customer_link:view',
    'track_trace:analytics:view',
    'track_trace:prediction:view',
  ],
  'tenant-admin': [
    'track_trace:read',
    'track_trace:write',
    'track_trace:alerts:manage',
    'track_trace:geofence:manage',
    'track_trace:replay:view',
    'track_trace:customer_link:view',
    'track_trace:analytics:view',
    'track_trace:prediction:view',
  ],
  'platform-admin': [
    'track_trace:read',
    'track_trace:write',
    'track_trace:alerts:manage',
    'track_trace:geofence:manage',
    'track_trace:replay:view',
    'track_trace:customer_link:view',
    'track_trace:analytics:view',
    'track_trace:prediction:view',
  ],
  'fleet-operator': [
    'track_trace:read',
    'track_trace:write',
    'track_trace:alerts:manage',
    'track_trace:geofence:manage',
    'track_trace:replay:view',
    'track_trace:analytics:view',
    'track_trace:prediction:view',
  ],
  vendor: ['track_trace:read', 'track_trace:customer_link:view'],
  customer: ['track_trace:read', 'track_trace:customer_link:view'],
}

export const TRACK_TRACE_PLAN_FEATURE_ACCESS: Record<TrackTracePlan, TrackTraceFeatureKey[]> = {
  Basic: ['tracking.customerPreview'],
  Professional: ['tracking.customerPreview', 'tracking.geofences', 'tracking.replay'],
  Enterprise: [
    'tracking.analytics',
    'tracking.routePerformance',
    'tracking.driverBehavior',
    'tracking.prediction',
    'tracking.geofences',
    'tracking.replay',
    'tracking.customerPreview',
  ],
}
