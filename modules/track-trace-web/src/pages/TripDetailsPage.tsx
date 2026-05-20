import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, PageHero } from '@shared-ui'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { Breadcrumb } from '../components/shared/Breadcrumb'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { ETAWidget } from '../components/ETAWidget'
import { RouteProgress } from '../components/RouteProgress'
import {
  trackTraceV2AnchorChipClassName,
  trackTraceV2CompactStickyPanelClassName,
  trackTraceV2EyebrowClassName,
  trackTraceV2SummaryCardClassName,
} from '../components/shared/trackTraceV2Chrome'
import { TrackingAlertCard } from '../components/TrackingAlertCard'
import { TrackingStatusBadge } from '../components/TrackingStatusBadge'
import { TripInfoPanel } from '../components/TripInfoPanel'
import { TripTimeline } from '../components/TripTimeline'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { getDelayRiskScore } from '../services/predictionApi'
import { useTrackingStore } from '../store/trackingStore'
import type { DelayRiskScore } from '../types/prediction.types'
import { DetailPageSkeleton } from '../components/shared/DetailPageSkeleton'

export function TripDetailsPage() {
  const { tripId } = useParams()
  const { scopedPath } = useTrackTraceRouting()
  const { activeTrips, alerts, error, events, loading, setSelectedTripId } = useTrackingStore()
  const [riskScore, setRiskScore] = useState<DelayRiskScore | null>(null)

  const trip = tripId ? activeTrips.find((item) => item.id === tripId) ?? null : null
  const timeline = tripId
    ? events
        .filter((event) => event.tripId === tripId)
        .sort((left, right) => new Date(right.eventTime).getTime() - new Date(left.eventTime).getTime())
    : []
  const tripAlerts = tripId ? alerts.filter((alert) => alert.tripId === tripId) : []

  useEffect(() => {
    if (!tripId) return
    let active = true
    void getDelayRiskScore(tripId).then((response) => {
      if (active) setRiskScore(response ?? null)
    })
    return () => {
      active = false
    }
  }, [tripId])

  if (loading) {
    return <DetailPageSkeleton />
  }

  if (!tripId) {
    return <EmptyPlaceholder title="Trip details unavailable" description="Trip ID is missing from the route." />
  }

  if (error || !trip) {
    return <EmptyPlaceholder title="Trip details unavailable" description={error ?? 'The requested trip is not present in the mock tracking dataset.'} />
  }

  const primaryAction =
    trip.isOffline || trip.delayMinutes > 0 || trip.routeDeviationKm > 0
      ? {
          label: 'Open live map',
          to: scopedPath('/live-map'),
          description: 'Best next step for route, ETA, and source-health investigation.',
        }
      : tripAlerts.length > 0
        ? {
            label: 'Replay trip',
            to: scopedPath(`/trips/${trip.id}/replay`),
            description: 'Best next step for event-by-event trip reconstruction.',
          }
        : {
            label: 'Customer preview',
            to: scopedPath(`/customer-preview/${trip.id}`),
            description: 'Best next step for reviewing the safe external tracking experience.',
          }

  return (
    <TrackTraceAccessBoundary page="shipment-detail">
      <div className="space-y-6">
        <Breadcrumb items={[
          { label: 'Tracking', to: scopedPath('/trips') },
          { label: 'Active Trips', to: scopedPath('/trips') },
          { label: trip.id },
        ]} />
        <PageHero
          eyebrow="Trip Detail"
          title={trip.id}
          subtitle={`${trip.origin} to ${trip.destination} · ${trip.vehicleNumber} · ${trip.driverName} · investigation-first view`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to={scopedPath('/trips')} onClick={() => setSelectedTripId(trip.id)}>Back to active trips</Link>
              </Button>
              <>
                <Button asChild>
                  <Link to={primaryAction.to}>{primaryAction.label}</Link>
                </Button>
                {primaryAction.to !== scopedPath('/live-map') && (
                  <Button asChild variant="outline">
                    <Link to={scopedPath('/live-map')}>Open live map</Link>
                  </Button>
                )}
                {primaryAction.to !== scopedPath(`/trips/${trip.id}/replay`) && (
                  <Button asChild>
                    <Link to={scopedPath(`/trips/${trip.id}/replay`)}>Replay trip</Link>
                  </Button>
                )}
                {primaryAction.to !== scopedPath(`/customer-preview/${trip.id}`) && (
                  <Button asChild variant="outline">
                    <Link to={scopedPath(`/customer-preview/${trip.id}`)}>Customer preview</Link>
                  </Button>
                )}
              </>
            </div>
          }
        />

        <>
            <Card className={trackTraceV2CompactStickyPanelClassName}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={trackTraceV2EyebrowClassName}>Investigation guide</p>
                  <p className="mt-1 text-sm text-gray-600">{primaryAction.description}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm font-semibold">
                  <a className={trackTraceV2AnchorChipClassName} href="#trip-overview">Overview</a>
                  <a className={trackTraceV2AnchorChipClassName} href="#trip-route">Route</a>
                  <a className={trackTraceV2AnchorChipClassName} href="#trip-timeline">Timeline</a>
                  <a className={trackTraceV2AnchorChipClassName} href="#trip-alerts">Alerts</a>
                </div>
              </div>
            </Card>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" id="trip-overview">
              <Card className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Current Status</p>
                <div className="mt-3"><TrackingStatusBadge status={trip.status} /></div>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Current Location</p>
                <p className="mt-3 text-lg font-bold text-text">{trip.lastLocationLabel}</p>
                <p className="mt-1 text-xs text-gray-500">{trip.remainingDistanceKm} km remaining</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">ETA</p>
                <p className="mt-3 text-lg font-bold text-text">{new Date(trip.currentEta ?? trip.eta).toLocaleString('en-IN')}</p>
                <p className="mt-1 text-xs text-gray-500">{trip.delayMinutes > 0 ? `${trip.delayMinutes} min delay` : 'On-time movement'}</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Exception Load</p>
                <p className="mt-3 text-lg font-bold text-text">{tripAlerts.length} active alerts</p>
                <p className="mt-1 text-xs text-gray-500">{trip.routeDeviationKm} km route deviation · {trip.sourceHealth ?? 'Healthy'} source</p>
              </Card>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.08fr,0.92fr]">
              <div className="space-y-6">
                <ETAWidget trip={trip} />

                {riskScore ? (
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Predictive delay foundation</p>
                        <p className="mt-2 text-lg font-extrabold text-text">{riskScore.riskLevel} risk</p>
                      </div>
                      <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                        Score {riskScore.score}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-sm font-semibold text-text">Predicted delay</p>
                        <p className="mt-1 text-sm text-gray-600">{riskScore.predictedDelayMinutes} min</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text">Confidence</p>
                        <p className="mt-1 text-sm text-gray-600">{riskScore.confidence}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm font-semibold text-text">Recommended action</p>
                        <p className="mt-1 text-sm text-gray-600">{riskScore.recommendedAction}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-gray-600">{riskScore.reason}</p>
                  </Card>
                ) : null}

                <div id="trip-route">
                  <RouteProgress trip={trip} />
                </div>
              </div>

              <div className="space-y-6">
                <TripInfoPanel trip={trip} />

                <Card className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Customer-safe tracking status</p>
                  <p className="mt-3 text-lg font-bold text-text">{trip.customerSafeStatus}</p>
                  <p className="mt-2 text-sm text-gray-600">
                    This is the sanitized customer-facing movement summary that can later support a `/public/track/{'{trackingToken}'}` flow.
                  </p>
                </Card>

                <Card className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Investigation shortcuts</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className={trackTraceV2SummaryCardClassName}>
                      <p className="text-sm font-bold text-text">Tracking source</p>
                      <p className="mt-1 text-sm text-gray-600">{trip.activeSource ?? 'Unknown'} · primary {trip.primarySource ?? 'Not set'}</p>
                    </div>
                    <div className={trackTraceV2SummaryCardClassName}>
                      <p className="text-sm font-bold text-text">Source health</p>
                      <p className="mt-1 text-sm text-gray-600">{trip.sourceHealth ?? (trip.isOffline ? 'Offline' : 'Healthy')}</p>
                    </div>
                    <div className={trackTraceV2SummaryCardClassName}>
                      <p className="text-sm font-bold text-text">Driver contact</p>
                      <p className="mt-1 text-sm text-gray-600">{trip.driverMobile}</p>
                    </div>
                    <div className={trackTraceV2SummaryCardClassName}>
                      <p className="text-sm font-bold text-text">Distance covered</p>
                      <p className="mt-1 text-sm text-gray-600">{trip.distanceCoveredKm} km</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
              <div id="trip-timeline">
                <TripTimeline events={timeline} />
              </div>
              <Card className="p-5" id="trip-alerts">
                <h3 className="text-lg font-bold text-text">Trip alerts</h3>
                <div className="mt-4 space-y-3">
                  {tripAlerts.length ? (
                    tripAlerts.map((alert) => <TrackingAlertCard compact key={alert.id} alert={alert} />)
                  ) : (
                    <EmptyPlaceholder
                      compact
                      title="No active trip alerts"
                      description="This trip has no alert cards in the current mock tracking feed."
                      action={
                        <Button asChild size="sm" variant="outline">
                          <Link to={scopedPath('/alerts')}>View all alerts</Link>
                        </Button>
                      }
                    />
                  )}
                </div>
              </Card>
            </div>
        </>
      </div>
    </TrackTraceAccessBoundary>
  )
}
