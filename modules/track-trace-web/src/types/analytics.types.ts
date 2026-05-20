export interface AnalyticsFilters {
  fromDate?: string
  toDate?: string
  customerId?: string
  vehicleId?: string
  driverId?: string
  status?: string
  laneId?: string
  region?: string
  tenantId?: string
}

export interface TrackingKpiSummary {
  totalTrips: number
  activeTrips: number
  completedTrips: number
  delayedTrips: number
  onTimeDeliveryPercentage: number
  averageDelayMinutes: number
  averageIdleMinutes: number
  averageTripDurationMinutes: number
  routeDeviationCount: number
  openExceptionCount: number
  vehicleUtilizationPercentage: number
  driverPerformanceScore: number
}

export interface DelayTrendPoint {
  date: string
  delayedTrips: number
  averageDelayMinutes: number
}

export interface RoutePerformance {
  laneId: string
  origin: string
  destination: string
  plannedDistanceKm: number
  actualDistanceKm: number
  plannedDurationMinutes: number
  actualDurationMinutes: number
  deviationCount: number
  averageDelayMinutes: number
  efficiencyScore: number
}

export interface DriverBehaviorScore {
  driverId: string
  driverName: string
  totalTrips: number
  onTimePercentage: number
  overspeedCount: number
  idleMinutes: number
  routeDeviationCount: number
  gpsCompliancePercentage: number
  sosCount: number
  averageSpeed: number
  totalDistanceDrivenKm: number
  score: number
}

export type SlaStatus = 'On Track' | 'At Risk' | 'Breached' | 'Recovered' | 'Not Applicable'

export interface SlaPerformanceRecord {
  tripId: string
  customerName: string
  laneLabel: string
  pickupStatus: SlaStatus
  deliveryStatus: SlaStatus
  checkpointStatus: SlaStatus
  breachDurationMinutes: number
  delayReason: string
  eta: string
}

export interface ExceptionAnalyticsRecord {
  type: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  openCount: number
  resolvedCount: number
  averageResolutionMinutes: number
}

export interface VehicleUtilizationRecord {
  vehicleNumber: string
  utilizationPercentage: number
  activeHours: number
  idleHours: number
  tripCount: number
}

export interface DistributionPoint {
  label: string
  value: number
  supportingValue?: number
}

export interface SlaMetricsSummary {
  breachedTrips: number
  tripsAtRisk: number
  onTimeTrips: number
  delayedPickupTrips: number
  delayedDeliveryTrips: number
  checkpointMissedTrips: number
  pickupSlaPercentage: number
  deliverySlaPercentage: number
  checkpointSlaPercentage: number
  averageBreachDurationMinutes: number
}
