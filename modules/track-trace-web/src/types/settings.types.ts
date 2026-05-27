export interface TrackingRules {
  locationUpdateFrequencySeconds: number
  vehicleOfflineThresholdMinutes: number
  stalePingThresholdMinutes: number
  idleThresholdMinutes: number
  overspeedThresholdKmph: number
  routeDeviationThresholdMeters: number
  gpsAccuracyThresholdMeters: number
  preferredFallbackSource: 'DRIVER_APP' | 'FASTAG' | 'ANPR' | 'MANUAL'
}

export interface SlaRules {
  pickupGracePeriodMinutes: number
  deliveryGracePeriodMinutes: number
  checkpointGracePeriodMinutes: number
  detentionThresholdMinutes: number
  idleThresholdMinutes: number
  routeDeviationThresholdMeters: number
}

export interface AlertRule {
  id: string
  alertType: string
  isEnabled: boolean
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  escalationMinutes: number
  notifyRoles: string[]
  channels: Array<'InApp' | 'Email' | 'SMS' | 'WhatsApp' | 'Push'>
}

export interface CustomerVisibilityRules {
  showVehicleNumber: boolean
  showDriverName: boolean
  showDriverMobile: boolean
  showExactLocation: boolean
  showApproxLocation: boolean
  showETA: boolean
  showDelayReason: boolean
  showPublicTimeline: boolean
  showPODStatus: boolean
  showSupportContact: boolean
}

export interface DataRetentionRules {
  liveLocationRetentionDays: number
  tripHistoryRetentionDays: number
  alertHistoryRetentionDays: number
  replayHistoryRetentionDays: number
  auditLogRetentionDays: number
}

export interface FeatureAccessConfig {
  planName: 'Basic' | 'Professional' | 'Enterprise'
  trackingAnalytics: boolean
  slaMonitoring: boolean
  routePerformance: boolean
  driverBehavior: boolean
  reports: boolean
  reportsExport: boolean
  predictiveDelay: boolean
  auditLogs: boolean
  advancedCustomerVisibility: boolean
}
