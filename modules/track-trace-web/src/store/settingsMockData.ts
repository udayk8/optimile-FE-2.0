import type {
  AlertRule,
  CustomerVisibilityRules,
  DataRetentionRules,
  FeatureAccessConfig,
  SlaRules,
  TrackingRules,
} from '../types/settings.types'

export const trackingRulesSeed: TrackingRules = {
  locationUpdateFrequencySeconds: 120,
  vehicleOfflineThresholdMinutes: 10,
  stalePingThresholdMinutes: 15,
  idleThresholdMinutes: 30,
  overspeedThresholdKmph: 75,
  routeDeviationThresholdMeters: 1200,
  gpsAccuracyThresholdMeters: 50,
  preferredFallbackSource: 'DRIVER_APP',
}

export const slaRulesSeed: SlaRules = {
  pickupGracePeriodMinutes: 30,
  deliveryGracePeriodMinutes: 45,
  checkpointGracePeriodMinutes: 20,
  detentionThresholdMinutes: 60,
  idleThresholdMinutes: 30,
  routeDeviationThresholdMeters: 1200,
}

export const alertRulesSeed: AlertRule[] = [
  { id: 'ALR-1', alertType: 'Vehicle Offline', isEnabled: true, severity: 'Critical', escalationMinutes: 10, notifyRoles: ['control-tower', 'fleet-operator'], channels: ['InApp', 'Email'] },
  { id: 'ALR-1A', alertType: 'Stale Ping', isEnabled: true, severity: 'High', escalationMinutes: 15, notifyRoles: ['control-tower', 'fleet-operator'], channels: ['InApp', 'Email'] },
  { id: 'ALR-1B', alertType: 'Tracking Source Fallback', isEnabled: true, severity: 'Medium', escalationMinutes: 20, notifyRoles: ['control-tower'], channels: ['InApp'] },
  { id: 'ALR-2', alertType: 'Route Deviation', isEnabled: true, severity: 'High', escalationMinutes: 15, notifyRoles: ['control-tower', 'tenant-admin'], channels: ['InApp', 'SMS'] },
  { id: 'ALR-3', alertType: 'Delay', isEnabled: true, severity: 'High', escalationMinutes: 20, notifyRoles: ['control-tower', 'customer'], channels: ['InApp', 'WhatsApp'] },
  { id: 'ALR-4', alertType: 'Overspeed', isEnabled: false, severity: 'Medium', escalationMinutes: 30, notifyRoles: ['fleet-operator'], channels: ['InApp'] },
]

export const customerVisibilityRulesSeed: CustomerVisibilityRules = {
  showVehicleNumber: true,
  showDriverName: false,
  showDriverMobile: false,
  showExactLocation: false,
  showApproxLocation: true,
  showETA: true,
  showDelayReason: true,
  showPublicTimeline: true,
  showPODStatus: true,
  showSupportContact: true,
}

export const dataRetentionRulesSeed: DataRetentionRules = {
  liveLocationRetentionDays: 30,
  tripHistoryRetentionDays: 180,
  alertHistoryRetentionDays: 365,
  replayHistoryRetentionDays: 90,
  auditLogRetentionDays: 365,
}

export const featureAccessConfigSeed: FeatureAccessConfig = {
  planName: 'Enterprise',
  trackingAnalytics: true,
  slaMonitoring: true,
  routePerformance: true,
  driverBehavior: true,
  reports: true,
  reportsExport: true,
  predictiveDelay: true,
  auditLogs: true,
  advancedCustomerVisibility: true,
}
