import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, PageHero } from '@shared-ui'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { DashboardSkeleton } from '../components/shared/DashboardSkeleton'
import { ActiveTripsTable } from '../components/ActiveTripsTable'
import { LiveMapPanel } from '../components/LiveMapPanel'
import { TrackingDataHealthBanner } from '../components/TrackingDataHealthBanner'
import { SelectedTripInsightCard } from '../components/SelectedTripInsightCard'
import { TrackingAlertCard } from '../components/TrackingAlertCard'
import { TrackingSummaryCards } from '../components/TrackingSummaryCards'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { useTrackingStore } from '../store/trackingStore'

export function TrackTraceDashboard() {
  const { scopedPath } = useTrackTraceRouting()
  const {
    activeTrips,
    alerts,
    dashboardSummary,
    geofenceEvents,
    lastUpdatedAt,
    loading,
    error,
    selectedTripId,
    setSelectedTripId,
    socketConnectionState,
  } = useTrackingStore()

  const activeTripRows = useMemo(
    () => activeTrips.filter((trip) => trip.status !== 'Completed' && trip.status !== 'Cancelled'),
    [activeTrips],
  )

  const tripAlertCounts = useMemo(
    () => alerts.reduce<Record<string, number>>((counts, alert) => {
      if (alert.status === 'Resolved') return counts
      counts[alert.tripId] = (counts[alert.tripId] ?? 0) + 1
      return counts
    }, {}),
    [alerts],
  )

  const alertSeverityCounts = useMemo(
    () => alerts.reduce(
      (counts, alert) => {
        if (alert.status === 'Resolved') return counts
        counts[alert.severity] += 1
        return counts
      },
      { Critical: 0, High: 0, Medium: 0, Low: 0 },
    ),
    [alerts],
  )

  const priorityTrips = useMemo(() => {
    const riskScore = (trip: (typeof activeTripRows)[0]) =>
      (tripAlertCounts[trip.id] ?? 0) * 30
      + trip.delayMinutes
      + (trip.isOffline ? 90 : 0)
      + trip.routeDeviationKm * 4
      + ((trip.idleMinutes ?? 0) >= 30 ? 10 : 0)
    return [...activeTripRows]
      .filter((trip) => riskScore(trip) > 0)
      .sort((left, right) => riskScore(right) - riskScore(left))
      .slice(0, 5)
  }, [activeTripRows, tripAlertCounts])

  const openAlerts = useMemo(
    () => alerts.filter((alert) => alert.status !== 'Resolved').slice(0, 4),
    [alerts],
  )

  const selectedTrip = useMemo(
    () => activeTripRows.find((trip) => trip.id === selectedTripId) ?? activeTripRows[0],
    [activeTripRows, selectedTripId],
  )

  const selectedTripAlerts = useMemo(
    () => selectedTrip
      ? alerts.filter((alert) => alert.tripId === selectedTrip.id && alert.status !== 'Resolved')
      : [],
    [alerts, selectedTrip],
  )

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error || !dashboardSummary) {
    return <EmptyPlaceholder title="Dashboard unavailable" description={error ?? 'Track and Trace dashboard data could not be prepared.'} />
  }

  const connectionTone =
    socketConnectionState === 'Connected'
      ? 'bg-success/10 text-success'
      : socketConnectionState === 'Connecting' || socketConnectionState === 'Reconnecting'
        ? 'bg-warning/10 text-warning'
        : socketConnectionState === 'Disconnected'
          ? 'bg-gray-100 text-gray-500'
          : 'bg-danger/10 text-danger'
  return (
    <TrackTraceAccessBoundary page="dashboard">
      <div className="space-y-6 lg:space-y-8">
        <PageHero
          eyebrow="Track & Trace"
          title="Track and Trace dashboard"
          subtitle="Live visibility command surface for active trips, ETA pressure, offline vehicles, alert load, and recent movement updates."
          className="border-gray-300 bg-gradient-to-r from-white via-white to-primary/5"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
                <Link to={scopedPath('/dispatch')}>Open dispatch</Link>
              </Button>
              <Button asChild>
                <Link to={scopedPath('/live-map')}>Open live map</Link>
              </Button>
            </div>
          }
        />

        <>
          <section className="grid gap-4 xl:grid-cols-[1.25fr,0.75fr]">
              <Card className="border-gray-300 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Control tower status</p>
                    <h2 className="mt-2 text-xl font-extrabold text-text sm:text-2xl">What needs attention right now</h2>
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      Start with exceptions and impacted trips first. The dashboard stays focused on immediate operational action before deeper analysis.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className={`rounded-full px-3 py-1 ${connectionTone}`}>{socketConnectionState}</span>
                    <span className="rounded-full bg-warning/10 px-3 py-1 text-warning">{dashboardSummary.delayedTrips} delayed trips</span>
                    <span className="rounded-full bg-danger/10 px-3 py-1 text-danger">{dashboardSummary.openAlerts} alerts open</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Immediate actions</p>
                  <Link className="text-sm font-semibold text-primary hover:underline" to={scopedPath('/alerts')}>
                    Open alerts
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  <Link
                    to={`${scopedPath('/alerts')}?severity=Critical`}
                    className="block rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-danger/30 hover:bg-danger/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-text">Escalate critical alerts</p>
                        <p className="mt-1 text-sm text-gray-600">Highest-severity issues needing immediate triage.</p>
                      </div>
                      <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger">{alertSeverityCounts.Critical} critical</span>
                    </div>
                  </Link>
                  <Link
                    to={scopedPath('/trips')}
                    className="block rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-warning/30 hover:bg-warning/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-text">Review delayed trips</p>
                        <p className="mt-1 text-sm text-gray-600">Start with the trips carrying the most ETA pressure.</p>
                      </div>
                      <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">{dashboardSummary.delayedTrips} delayed</span>
                    </div>
                  </Link>
                  <Link
                    to={scopedPath('/live-map')}
                    className="block rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-secondary/30 hover:bg-secondary/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-text">Inspect route deviations</p>
                        <p className="mt-1 text-sm text-gray-600">Use the live map to confirm off-route movement and source health.</p>
                      </div>
                      <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">{priorityTrips.filter((trip) => trip.routeDeviationKm > 0).length} impacted</span>
                    </div>
                  </Link>
                </div>
              </Card>
          </section>

          <TrackingDataHealthBanner lastUpdatedAt={lastUpdatedAt} socketConnectionState={socketConnectionState} />

          {/* Exception zone — visually heavier treatment to signal "act here first" */}
          <div className="rounded-3xl border border-danger/10 bg-danger/[0.03] px-5 py-6 space-y-6 sm:px-6">
          <TrackingSummaryCards summary={dashboardSummary} section="urgent" />

          <section className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-danger/70">Needs attention now</p>
                  <h2 className="mt-1 text-xl font-extrabold text-text">Priority trips to resolve first</h2>
                </div>
                <p className="max-w-3xl text-sm text-gray-600">
                  Ranked using active alerts, delay depth, route deviation, and source-health risk so operators can start where intervention matters most.
                </p>
              </div>
              <Card className="p-5">
                {priorityTrips.length ? (
                  <div className="space-y-3">
                    {priorityTrips.map((trip, index) => {
                      const alertCount = tripAlertCounts[trip.id] ?? 0
                      const isSelected = trip.id === selectedTrip?.id

                      return (
                        <div
                          key={trip.id}
                          className={`rounded-2xl border px-4 py-4 transition ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">#{index + 1}</span>
                                <p className="text-base font-extrabold text-text">{trip.id}</p>
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{trip.status}</span>
                              </div>
                              <p className="mt-2 text-sm text-gray-600">
                                {trip.customerName} · {trip.origin} to {trip.destination}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant={isSelected ? 'default' : 'outline'} onClick={() => setSelectedTripId(trip.id)}>
                                {isSelected ? 'Selected' : 'Review trip'}
                              </Button>
                              <Button asChild size="sm" variant="outline">
                                <Link to={`${scopedPath('/trips')}/${trip.id}`}>Open detail</Link>
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className={`rounded-full px-2.5 py-1 ${trip.delayMinutes > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                              {trip.delayMinutes > 0 ? `${trip.delayMinutes} min delay` : 'On time'}
                            </span>
                            <span className="rounded-full bg-danger/10 px-2.5 py-1 text-danger">{alertCount} open alerts</span>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">{trip.lastLocationLabel}</span>
                            {trip.isOffline ? <span className="rounded-full bg-danger/10 px-2.5 py-1 text-danger">Telemetry offline</span> : null}
                            {trip.routeDeviationKm > 0 ? <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-secondary">{trip.routeDeviationKm} km off route</span> : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyPlaceholder
                    compact
                    title="All clear"
                    description="No active trips are showing delay, alert, or route-health risk right now. The queue will populate as exceptions arise."
                  />
                )}
              </Card>
          </section>
          </div>

          <section className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Main workspace</p>
                  <h2 className="mt-1 text-xl font-extrabold text-text">Trips and alert queue</h2>
                </div>
                <p className="max-w-3xl text-sm text-gray-600">
                  Operators should be able to scan the trips needing attention, then compare them against the latest alert activity without changing screens.
                </p>
              </div>
              <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
                <Card className="overflow-hidden">
                  <div className="border-b border-gray-200 px-5 py-4">
                    <h3 className="text-lg font-bold text-text">Active trips preview</h3>
                    <p className="mt-1 text-sm text-gray-600">Trips that need the most attention first, with direct drill-down into trip details.</p>
                  </div>
                  {selectedTrip ? (
                    <SelectedTripInsightCard
                      alertCount={selectedTripAlerts.length}
                      liveMapPath={scopedPath('/live-map')}
                      trip={selectedTrip}
                      tripBasePath={scopedPath('/trips')}
                    />
                  ) : null}
                  {activeTripRows.length ? (
                    <ActiveTripsTable
                      trips={activeTripRows}
                      showMobileCards
                      previewMode
                      onSelectTrip={setSelectedTripId}
                      selectedTripId={selectedTrip?.id}
                      tripBasePath={scopedPath('/trips')}
                    />
                  ) : (
                    <div className="p-5">
                      <EmptyPlaceholder
                        compact
                        title="No active trips in scope"
                        description="This workspace has no trips to monitor right now. Once dispatch activity resumes, the trip queue and selected-trip investigation panel will appear here."
                        action={
                          <Button asChild size="sm" variant="outline">
                            <Link to={scopedPath('/trips')}>View all trips</Link>
                          </Button>
                        }
                      />
                    </div>
                  )}
                </Card>

                <div className="space-y-6">
                  <Card className="p-5">
                    <h3 className="text-lg font-bold text-text">Alert highlights</h3>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <Link to={`${scopedPath('/alerts')}?severity=Critical`} className="rounded-full bg-danger px-3 py-1 text-white transition hover:opacity-80">
                        {alertSeverityCounts.Critical} critical
                      </Link>
                      <Link to={`${scopedPath('/alerts')}?severity=High`} className="rounded-full bg-warning px-3 py-1 text-white transition hover:opacity-80">
                        {alertSeverityCounts.High} high
                      </Link>
                      <Link to={`${scopedPath('/alerts')}?severity=Medium`} className="rounded-full bg-primary px-3 py-1 text-white transition hover:opacity-80">
                        {alertSeverityCounts.Medium} medium
                      </Link>
                      <Link to={`${scopedPath('/alerts')}?severity=Low`} className="rounded-full bg-secondary px-3 py-1 text-white transition hover:opacity-80">
                        {alertSeverityCounts.Low} low
                      </Link>
                    </div>
                    {openAlerts.length ? (
                      <div className="mt-4 space-y-3">
                        {openAlerts.slice(0, 3).map((alert) => (
                          <TrackingAlertCard
                            key={alert.id}
                            alert={alert}
                            compact
                            onSelectTrip={setSelectedTripId}
                            selected={alert.tripId === selectedTrip?.id}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <EmptyPlaceholder
                          compact
                          title="No open alerts"
                          description="The alert queue is currently clear. New operational exceptions will surface here as soon as they are raised."
                          action={
                            <Button asChild size="sm" variant="outline">
                              <Link to={scopedPath('/alerts')}>View alert queue</Link>
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </Card>

                </div>
              </div>
          </section>

          <section className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Geographic context</p>
                  <h2 className="mt-1 text-xl font-extrabold text-text">Map and movement intelligence</h2>
                </div>
                <p className="max-w-3xl text-sm text-gray-600">
                  Keep the route view close to the dashboard, but use the live map module for full geographic investigation and route overlays.
                </p>
              </div>
              <LiveMapPanel
                trips={activeTripRows.slice(0, 6)}
                onSelectTrip={setSelectedTripId}
                selectedTripId={selectedTripId ?? activeTripRows[0]?.id}
                geofenceEvents={geofenceEvents}
                socketConnectionState={socketConnectionState}
                lastUpdatedAt={lastUpdatedAt}
              />
              {activeTripRows.length > 6 && (
                <p className="mt-2 text-sm text-gray-500">
                  Showing 6 of {activeTripRows.length} active vehicles.{' '}
                  <Link className="font-semibold text-primary hover:underline" to={scopedPath('/live-map')}>
                    Open live map for full coverage
                  </Link>
                </p>
              )}
          </section>
        </>
      </div>
    </TrackTraceAccessBoundary>
  )
}
