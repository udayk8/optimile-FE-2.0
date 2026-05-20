import { trackingAlerts, trackingTrips } from './trackingMockData'
import type {
  DelayTrendPoint,
  DistributionPoint,
  DriverBehaviorScore,
  ExceptionAnalyticsRecord,
  RoutePerformance,
  SlaMetricsSummary,
  SlaPerformanceRecord,
  TrackingKpiSummary,
  VehicleUtilizationRecord,
} from '../types/analytics.types'

function laneIdForTrip(origin: string, destination: string) {
  return `${origin.toLowerCase()}-${destination.toLowerCase()}`.replace(/\s+/g, '-')
}

const activeTrips = trackingTrips.filter((trip) => trip.status !== 'Completed' && trip.status !== 'Cancelled')
const completedTrips = trackingTrips.filter((trip) => trip.status === 'Completed')

export const trackingKpiSummary: TrackingKpiSummary = {
  totalTrips: trackingTrips.length,
  activeTrips: activeTrips.length,
  completedTrips: completedTrips.length,
  delayedTrips: trackingTrips.filter((trip) => trip.delayMinutes > 0 || ['Delayed', 'Offline', 'Route Deviated'].includes(trip.status)).length,
  onTimeDeliveryPercentage: Math.round((trackingTrips.filter((trip) => trip.delayMinutes <= 30).length / trackingTrips.length) * 100),
  averageDelayMinutes: Math.round(trackingTrips.reduce((total, trip) => total + trip.delayMinutes, 0) / trackingTrips.length),
  averageIdleMinutes: Math.round(trackingTrips.reduce((total, trip) => total + (trip.idleMinutes ?? 0), 0) / trackingTrips.length),
  averageTripDurationMinutes: 1080,
  routeDeviationCount: trackingTrips.filter((trip) => trip.routeDeviationKm > 0).length,
  openExceptionCount: trackingAlerts.filter((alert) => alert.status !== 'Resolved').length,
  vehicleUtilizationPercentage: 78,
  driverPerformanceScore: 83,
}

export const delayTrend: DelayTrendPoint[] = [
  { date: '2026-05-01', delayedTrips: 3, averageDelayMinutes: 46 },
  { date: '2026-05-02', delayedTrips: 4, averageDelayMinutes: 51 },
  { date: '2026-05-03', delayedTrips: 5, averageDelayMinutes: 64 },
  { date: '2026-05-04', delayedTrips: 4, averageDelayMinutes: 58 },
  { date: '2026-05-05', delayedTrips: 6, averageDelayMinutes: 73 },
  { date: '2026-05-06', delayedTrips: 5, averageDelayMinutes: 67 },
  { date: '2026-05-07', delayedTrips: 4, averageDelayMinutes: 52 },
]

export const onTimeVsDelayed: DistributionPoint[] = [
  { label: 'On Time', value: trackingTrips.filter((trip) => trip.delayMinutes <= 30).length },
  { label: 'Delayed', value: trackingTrips.filter((trip) => trip.delayMinutes > 30).length },
]

export const regionDistribution: DistributionPoint[] = [
  { label: 'North', value: 4 },
  { label: 'West', value: 3 },
  { label: 'South', value: 4 },
  { label: 'East', value: 2 },
]

export const alertSeverityDistribution: DistributionPoint[] = [
  { label: 'Critical', value: trackingAlerts.filter((item) => item.severity === 'Critical').length },
  { label: 'High', value: trackingAlerts.filter((item) => item.severity === 'High').length },
  { label: 'Medium', value: trackingAlerts.filter((item) => item.severity === 'Medium').length },
  { label: 'Low', value: trackingAlerts.filter((item) => item.severity === 'Low').length },
]

export const routePerformanceRows: RoutePerformance[] = trackingTrips.slice(0, 8).map((trip, index) => {
  const plannedDistanceKm = trip.distanceCoveredKm + trip.remainingDistanceKm - Math.max(trip.routeDeviationKm, 0)
  const actualDistanceKm = trip.distanceCoveredKm + Math.max(trip.routeDeviationKm, 0)
  const plannedDurationMinutes = 900 + index * 45
  const actualDurationMinutes = plannedDurationMinutes + trip.delayMinutes

  return {
    laneId: laneIdForTrip(trip.origin, trip.destination),
    origin: trip.origin,
    destination: trip.destination,
    plannedDistanceKm,
    actualDistanceKm,
    plannedDurationMinutes,
    actualDurationMinutes,
    deviationCount: trip.routeDeviationKm > 0 ? 1 : 0,
    averageDelayMinutes: trip.delayMinutes,
    efficiencyScore: Math.round((plannedDistanceKm / Math.max(actualDistanceKm, 1)) * 100),
  }
})

export const driverBehaviorRows: DriverBehaviorScore[] = trackingTrips.slice(0, 8).map((trip, index) => ({
  driverId: `DRV-${index + 1}`,
  driverName: trip.driverName,
  totalTrips: 8 + index,
  onTimePercentage: Math.max(54, 92 - trip.delayMinutes / 10),
  overspeedCount: index % 3,
  idleMinutes: trip.idleMinutes ?? 0,
  routeDeviationCount: trip.routeDeviationKm > 0 ? 1 : 0,
  gpsCompliancePercentage: trip.isOffline ? 72 : 95,
  sosCount: index === 2 ? 1 : 0,
  averageSpeed: trip.currentLocation.speed ?? 42,
  totalDistanceDrivenKm: trip.distanceCoveredKm + 260,
  score: Math.max(56, 94 - Math.round(trip.delayMinutes / 12) - (trip.isOffline ? 10 : 0) - (trip.routeDeviationKm > 0 ? 8 : 0)),
}))

export const vehicleUtilizationRows: VehicleUtilizationRecord[] = trackingTrips.slice(0, 8).map((trip, index) => ({
  vehicleNumber: trip.vehicleNumber,
  utilizationPercentage: Math.max(52, 88 - index * 3),
  activeHours: 10 - index * 0.4,
  idleHours: Math.max(0.5, (trip.idleMinutes ?? 30) / 60),
  tripCount: 4 + index,
}))

export const exceptionAnalyticsRows: ExceptionAnalyticsRecord[] = [
  { type: 'Vehicle Offline', severity: 'Critical', openCount: 2, resolvedCount: 6, averageResolutionMinutes: 48 },
  { type: 'Route Deviation', severity: 'High', openCount: 3, resolvedCount: 9, averageResolutionMinutes: 56 },
  { type: 'Delay', severity: 'High', openCount: 4, resolvedCount: 12, averageResolutionMinutes: 71 },
  { type: 'Idle Threshold', severity: 'Medium', openCount: 2, resolvedCount: 7, averageResolutionMinutes: 39 },
]

export const slaMetricsSummary: SlaMetricsSummary = {
  breachedTrips: 3,
  tripsAtRisk: 4,
  onTimeTrips: 6,
  delayedPickupTrips: 2,
  delayedDeliveryTrips: 4,
  checkpointMissedTrips: 1,
  pickupSlaPercentage: 84,
  deliverySlaPercentage: 76,
  checkpointSlaPercentage: 89,
  averageBreachDurationMinutes: 62,
}

export const slaPerformanceRows: SlaPerformanceRecord[] = trackingTrips.slice(0, 8).map((trip, index) => ({
  tripId: trip.id,
  customerName: trip.customerName,
  laneLabel: `${trip.origin} to ${trip.destination}`,
  pickupStatus: trip.actualPickupTime ? (trip.delayMinutes > 45 ? 'At Risk' : 'On Track') : 'Not Applicable',
  deliveryStatus: trip.delayMinutes > 150 ? 'Breached' : trip.delayMinutes > 45 ? 'At Risk' : trip.status === 'Completed' ? 'Recovered' : 'On Track',
  checkpointStatus: index === 3 ? 'Breached' : trip.routeDeviationKm > 0 ? 'At Risk' : 'On Track',
  breachDurationMinutes: trip.delayMinutes > 120 ? trip.delayMinutes - 60 : 0,
  delayReason: trip.delayMinutes > 120 ? 'Lane congestion and late checkpoint recovery' : trip.routeDeviationKm > 0 ? 'Deviation under control tower review' : 'None',
  eta: trip.eta,
}))
