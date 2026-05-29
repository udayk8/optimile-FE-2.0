import {
  slaMetricsSummary,
  slaPerformanceRows,
  vehicleUtilizationRows,
} from '../store/analyticsMockData'
import { trackingAlerts, trackingTrips } from '../store/trackingMockData'
import type {
  AnalyticsFilters,
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
import type { AlertSeverity, TrackingAlert, TrackingTrip } from '../types/tracking.types'

const USE_MOCK_TRACKING = import.meta.env.VITE_USE_MOCK_TRACKING !== 'false'

const regionByCity: Record<string, string> = {
  Delhi: 'North',
  Agra: 'North',
  Jaipur: 'North',
  Kanpur: 'North',
  Lucknow: 'North',
  Ludhiana: 'North',
  Panipat: 'North',
  Noida: 'North',
  Mumbai: 'West',
  Pune: 'West',
  Ahmedabad: 'West',
  Vadodara: 'West',
  Surat: 'West',
  Vapi: 'West',
  Nashik: 'West',
  Chennai: 'South',
  Bengaluru: 'South',
  Hyderabad: 'South',
  Nellore: 'South',
  Kochi: 'South',
  Hosur: 'South',
  Salem: 'South',
  Kolkata: 'East',
  Kharagpur: 'East',
  Bhubaneswar: 'East',
  Jamshedpur: 'East',
  Patna: 'East',
  Siliguri: 'East',
  Guwahati: 'East',
  Nagpur: 'Central',
  Indore: 'Central',
  Seoni: 'Central',
  Nagda: 'Central',
  Raipur: 'Central',
}

const severityRank: Record<AlertSeverity, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function resolveAfter<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(clone(value)), ms))
}

function toDate(value?: string, endOfDay = false) {
  if (!value) return null
  const date = new Date(value.includes('T') ? value : `${value}T${endOfDay ? '23:59:59' : '00:00:00'}`)
  return Number.isNaN(date.getTime()) ? null : date
}

function laneIdForTrip(trip: TrackingTrip) {
  return `${trip.origin.toLowerCase()}-${trip.destination.toLowerCase()}`.replace(/\s+/g, '-')
}

function regionForTrip(trip: TrackingTrip) {
  const city = trip.lastLocationLabel.split(',')[0] ?? trip.destination
  return regionByCity[city] ?? regionByCity[trip.origin] ?? 'Other'
}

function matchesTripFilters(trip: TrackingTrip, filters?: AnalyticsFilters) {
  if (!filters) return true

  const fromDate = toDate(filters.fromDate)
  const toDateValue = toDate(filters.toDate, true)
  const tripDate = new Date(trip.lastUpdatedAt || trip.scheduledPickupTime)

  if (fromDate && tripDate < fromDate) return false
  if (toDateValue && tripDate > toDateValue) return false
  if (filters.customerId && !trip.customerName.toLowerCase().includes(filters.customerId.toLowerCase())) return false
  if (filters.vehicleId) {
    const vehicleNeedle = filters.vehicleId.toLowerCase()
    if (!trip.vehicleNumber.toLowerCase().includes(vehicleNeedle) && !trip.vehicleId?.toLowerCase().includes(vehicleNeedle)) return false
  }
  if (filters.driverId && !trip.driverName.toLowerCase().includes(filters.driverId.toLowerCase())) return false
  if (filters.status && trip.status !== filters.status) return false
  if (filters.laneId && laneIdForTrip(trip) !== filters.laneId) return false
  if (filters.region && regionForTrip(trip) !== filters.region) return false
  if (filters.tenantId && trip.tenantId !== filters.tenantId) return false

  return true
}

function matchesAlertFilters(alert: TrackingAlert, filters?: AnalyticsFilters) {
  if (!filters) return true

  const fromDate = toDate(filters.fromDate)
  const toDateValue = toDate(filters.toDate, true)
  const alertDate = new Date(alert.createdAt)

  if (fromDate && alertDate < fromDate) return false
  if (toDateValue && alertDate > toDateValue) return false

  const trip = trackingTrips.find((item) => item.id === alert.tripId)
  return trip ? matchesTripFilters(trip, { ...filters, fromDate: undefined, toDate: undefined }) : true
}

function filteredTrips(filters?: AnalyticsFilters) {
  return trackingTrips.filter((trip) => matchesTripFilters(trip, filters))
}

function filteredAlerts(filters?: AnalyticsFilters) {
  return trackingAlerts.filter((alert) => matchesAlertFilters(alert, filters))
}

function buildTrackingKpiSummary(filters?: AnalyticsFilters): TrackingKpiSummary {
  const trips = filteredTrips(filters)
  const alerts = filteredAlerts(filters)
  const activeTrips = trips.filter((trip) => !['Completed', 'Cancelled'].includes(trip.status))
  const completedTrips = trips.filter((trip) => trip.status === 'Completed')
  const totalDelay = trips.reduce((total, trip) => total + trip.delayMinutes, 0)
  const totalIdle = trips.reduce((total, trip) => total + (trip.idleMinutes ?? 0), 0)
  const delayedTrips = trips.filter((trip) => trip.delayMinutes > 30 || ['Delayed', 'Offline', 'Route Deviated'].includes(trip.status)).length
  const onTimeTrips = trips.filter((trip) => trip.delayMinutes <= 30).length
  const driverScoreBase = trips.length
    ? Math.round(trips.reduce((total, trip) => total + Math.max(56, 94 - Math.round(trip.delayMinutes / 12) - (trip.isOffline ? 10 : 0) - (trip.routeDeviationKm > 0 ? 8 : 0)), 0) / trips.length)
    : 0

  return {
    totalTrips: trips.length,
    activeTrips: activeTrips.length,
    completedTrips: completedTrips.length,
    delayedTrips,
    onTimeDeliveryPercentage: trips.length ? Math.round((onTimeTrips / trips.length) * 100) : 0,
    averageDelayMinutes: trips.length ? Math.round(totalDelay / trips.length) : 0,
    averageIdleMinutes: trips.length ? Math.round(totalIdle / trips.length) : 0,
    averageTripDurationMinutes: trips.length ? 1080 : 0,
    routeDeviationCount: trips.filter((trip) => trip.routeDeviationKm > 0).length,
    openExceptionCount: alerts.filter((alert) => alert.status !== 'Resolved').length,
    vehicleUtilizationPercentage: trips.length ? Math.round((activeTrips.length / trips.length) * 100) : 0,
    driverPerformanceScore: driverScoreBase,
  }
}

function buildDelayTrend(filters?: AnalyticsFilters): DelayTrendPoint[] {
  const trips = filteredTrips(filters)
  const grouped = trips.reduce<Record<string, { delayedTrips: number; delayTotal: number; totalTrips: number }>>((acc, trip) => {
    const date = trip.lastUpdatedAt.slice(0, 10)
    acc[date] ??= { delayedTrips: 0, delayTotal: 0, totalTrips: 0 }
    acc[date].totalTrips += 1
    acc[date].delayTotal += trip.delayMinutes
    if (trip.delayMinutes > 30 || ['Delayed', 'Offline', 'Route Deviated'].includes(trip.status)) acc[date].delayedTrips += 1
    return acc
  }, {})

  return Object.entries(grouped)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date,
      delayedTrips: value.delayedTrips,
      averageDelayMinutes: value.totalTrips ? Math.round(value.delayTotal / value.totalTrips) : 0,
    }))
}

function buildOnTimePerformance(filters?: AnalyticsFilters): DistributionPoint[] {
  const trips = filteredTrips(filters)
  return [
    { label: 'On Time', value: trips.filter((trip) => trip.delayMinutes <= 30).length },
    { label: 'Delayed', value: trips.filter((trip) => trip.delayMinutes > 30).length },
  ]
}

function buildRegionDistribution(filters?: AnalyticsFilters): DistributionPoint[] {
  const trips = filteredTrips(filters)
  const grouped = trips.reduce<Record<string, number>>((acc, trip) => {
    const region = regionForTrip(trip)
    acc[region] = (acc[region] ?? 0) + 1
    return acc
  }, {})

  return Object.entries(grouped)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({ label, value }))
}

function buildAlertSeverityDistribution(filters?: AnalyticsFilters): DistributionPoint[] {
  const alerts = filteredAlerts(filters)
  return (['Critical', 'High', 'Medium', 'Low'] as const).map((severity) => ({
    label: severity,
    value: alerts.filter((alert) => alert.severity === severity).length,
  }))
}

function buildExceptionAnalytics(filters?: AnalyticsFilters): ExceptionAnalyticsRecord[] {
  const alerts = filteredAlerts(filters)
  const grouped = alerts.reduce<Record<string, TrackingAlert[]>>((acc, alert) => {
    acc[alert.type] ??= []
    acc[alert.type].push(alert)
    return acc
  }, {})

  return Object.entries(grouped)
    .map(([type, rows]) => {
      const highestSeverity = rows.reduce<AlertSeverity>((highest, alert) => (severityRank[alert.severity] > severityRank[highest] ? alert.severity : highest), 'Low')
      const openCount = rows.filter((alert) => alert.status !== 'Resolved').length
      const resolvedCount = rows.filter((alert) => alert.status === 'Resolved').length

      return {
        type,
        severity: highestSeverity,
        openCount,
        resolvedCount,
        averageResolutionMinutes: 35 + rows.length * 9 + openCount * 6,
      }
    })
    .sort((left, right) => severityRank[right.severity] - severityRank[left.severity] || right.openCount - left.openCount)
}

export async function getTrackingKpiSummary(filters?: AnalyticsFilters): Promise<TrackingKpiSummary> {
  return USE_MOCK_TRACKING ? resolveAfter(buildTrackingKpiSummary(filters)) : resolveAfter(buildTrackingKpiSummary(filters))
}

export async function getDelayTrend(filters?: AnalyticsFilters): Promise<DelayTrendPoint[]> {
  return resolveAfter(buildDelayTrend(filters))
}

export async function getOnTimePerformance(filters?: AnalyticsFilters): Promise<DistributionPoint[]> {
  return resolveAfter(buildOnTimePerformance(filters))
}

export async function getRoutePerformance(_filters?: AnalyticsFilters): Promise<RoutePerformance[]> {
  const trips = filteredTrips(_filters).slice(0, 8)

  const rows = trips.map((trip, index) => {
    const plannedDistanceKm = trip.distanceCoveredKm + trip.remainingDistanceKm - Math.max(trip.routeDeviationKm, 0)
    const actualDistanceKm = trip.distanceCoveredKm + Math.max(trip.routeDeviationKm, 0)
    const plannedDurationMinutes = 900 + index * 45
    const actualDurationMinutes = plannedDurationMinutes + trip.delayMinutes

    return {
      laneId: laneIdForTrip(trip),
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

  return resolveAfter(rows)
}

export async function getDriverBehaviorScores(_filters?: AnalyticsFilters): Promise<DriverBehaviorScore[]> {
  const trips = filteredTrips(_filters).slice(0, 8)

  const rows = trips.map((trip, index) => ({
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

  return resolveAfter(rows)
}

export async function getExceptionAnalytics(filters?: AnalyticsFilters): Promise<ExceptionAnalyticsRecord[]> {
  return resolveAfter(buildExceptionAnalytics(filters))
}

export async function getVehicleUtilization(_filters?: AnalyticsFilters): Promise<VehicleUtilizationRecord[]> {
  return resolveAfter(vehicleUtilizationRows)
}

export async function getAlertSeverityDistribution(filters?: AnalyticsFilters): Promise<DistributionPoint[]> {
  return resolveAfter(buildAlertSeverityDistribution(filters))
}

export async function getRegionDistribution(filters?: AnalyticsFilters): Promise<DistributionPoint[]> {
  return resolveAfter(buildRegionDistribution(filters))
}

export async function getSlaMetrics(_filters?: AnalyticsFilters): Promise<SlaMetricsSummary> {
  return resolveAfter(slaMetricsSummary)
}

export async function getSlaPerformance(_filters?: AnalyticsFilters): Promise<SlaPerformanceRecord[]> {
  return resolveAfter(slaPerformanceRows)
}
