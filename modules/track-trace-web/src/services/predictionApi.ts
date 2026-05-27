import { trackingTrips } from '../store/trackingMockData'
import type { AnalyticsFilters } from '../types/analytics.types'
import type { DelayRiskScore } from '../types/prediction.types'
import type { TrackingTrip } from '../types/tracking.types'

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
  if (filters.tenantId && trip.tenantId !== filters.tenantId) return false

  return true
}

function buildRiskScore(tripId: string): DelayRiskScore | undefined {
  const trip = trackingTrips.find((item) => item.id === tripId)
  if (!trip) return undefined

  const score = Math.min(96, Math.max(18, Math.round((trip.delayMinutes / 3) + trip.routeDeviationKm * 4 + (trip.isOffline ? 18 : 0) + ((trip.idleMinutes ?? 0) / 2))))
  const riskLevel = score >= 85 ? 'Critical' : score >= 65 ? 'High' : score >= 40 ? 'Medium' : 'Low'
  const reason =
    trip.routeDeviationKm > 0
      ? 'Route deviation detected on active lane'
      : trip.isOffline
        ? 'GPS signal missing for vehicle'
        : trip.delayMinutes > 90
          ? 'Historical delay on lane and current ETA slip'
          : 'Vehicle idle too long at checkpoint'

  return {
    tripId,
    riskLevel,
    score,
    predictedDelayMinutes: Math.max(15, trip.delayMinutes + 25),
    reason,
    confidence: riskLevel === 'Critical' || riskLevel === 'High' ? 'High' : 'Medium',
    recommendedAction: riskLevel === 'Critical' ? 'Escalate to control tower and alert customer success.' : 'Monitor checkpoint progress and contact driver.',
  }
}

export async function getDelayRiskScore(tripId: string): Promise<DelayRiskScore | undefined> {
  return resolveAfter(buildRiskScore(tripId))
}

export async function getTripsAtRisk(filters?: AnalyticsFilters): Promise<DelayRiskScore[]> {
  return resolveAfter(
    trackingTrips
      .filter((trip) => matchesTripFilters(trip, filters))
      .filter((trip) => trip.delayMinutes > 30 || trip.routeDeviationKm > 0 || trip.isOffline)
      .slice(0, 8)
      .map((trip) => buildRiskScore(trip.id))
      .filter((item): item is DelayRiskScore => Boolean(item)),
  )
}

export async function getPredictedEta(tripId: string): Promise<{ tripId: string; predictedEta: string } | undefined> {
  const trip = trackingTrips.find((item) => item.id === tripId)
  if (!trip) return resolveAfter(undefined)

  const predictedAt = new Date(new Date(trip.eta).getTime() + 20 * 60 * 1000).toISOString()
  return resolveAfter({ tripId, predictedEta: predictedAt })
}
