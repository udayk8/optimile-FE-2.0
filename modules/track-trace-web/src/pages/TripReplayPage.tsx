import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, PageHero } from '@shared-ui'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { ReplayMapPanel } from '../components/ReplayMapPanel'
import { ReplayTimeline } from '../components/ReplayTimeline'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { Breadcrumb } from '../components/shared/Breadcrumb'
import { trackTraceV2AnchorChipClassName, trackTraceV2CompactStickyPanelClassName, trackTraceV2EyebrowClassName } from '../components/shared/trackTraceV2Chrome'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { getTripReplay } from '../services/trackingApi'
import type { TripReplay } from '../types/tracking.types'
import { DetailPageSkeleton } from '../components/shared/DetailPageSkeleton'

export function TripReplayPage() {
  const { tripId } = useParams()
  const { scopedPath } = useTrackTraceRouting()
  const [replay, setReplay] = useState<TripReplay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tripId) {
      setError('Trip ID is missing for replay.')
      setLoading(false)
      return
    }

    let active = true
    void getTripReplay(tripId)
      .then((response) => {
        if (!active) return
        if (!response) {
          setError('Replay data is not available for the selected trip.')
          return
        }
        setReplay(response)
      })
      .catch(() => {
        if (!active) return
        setError('Trip replay data could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [tripId])

  if (loading) {
    return <DetailPageSkeleton />
  }

  if (error || !replay) {
    return <EmptyPlaceholder title="Replay unavailable" description={error ?? 'Replay data could not be prepared.'} />
  }

  const replayDurationMinutes = Math.round(
    (new Date(replay.endTime).getTime() - new Date(replay.startTime).getTime()) / 60000,
  )
  const replayDurationLabel =
    replayDurationMinutes >= 60
      ? `${Math.floor(replayDurationMinutes / 60)}h ${replayDurationMinutes % 60}m`
      : `${replayDurationMinutes} min`

  return (
    <TrackTraceAccessBoundary page="replay">
      <div className="space-y-6">
        <Breadcrumb items={[
          { label: 'Active Trips', to: scopedPath('/trips') },
          { label: replay.tripId, to: scopedPath(`/trips/${replay.tripId}`) },
          { label: 'Replay' },
        ]} />
        <PageHero
          eyebrow="Trip Replay"
          title={`${replay.tripId} replay`}
          subtitle={`${replay.vehicleNumber} · ${replay.driverName} · compact replay workspace for movement review`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to={scopedPath(`/trips/${replay.tripId}`)}>Back to trip detail</Link>
              </Button>
              <Button asChild>
                <Link to={scopedPath('/live-map')}>Open live map</Link>
              </Button>
            </div>
          }
        />

        <>
            <Card className={trackTraceV2CompactStickyPanelClassName}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className={trackTraceV2EyebrowClassName}>Replay workspace · {replay.tripId}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {replay.locations.length} location samples · {replayDurationLabel} window · {replay.alerts.length} alert{replay.alerts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">{replay.totalDistanceKm} km</span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">{replay.averageSpeed} km/h avg</span>
                    {replay.totalIdleMinutes > 0 && (
                      <span className="rounded-full bg-warning/10 px-3 py-1 text-warning">{replay.totalIdleMinutes} min idle</span>
                    )}
                    {replay.alerts.length > 0 && (
                      <span className="rounded-full bg-danger/10 px-3 py-1 text-danger">{replay.alerts.length} alerts</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm font-semibold">
                    <a className={trackTraceV2AnchorChipClassName} href="#replay-map">Map</a>
                    <a className={trackTraceV2AnchorChipClassName} href="#replay-timeline">Timeline</a>
                  </div>
                </div>
              </div>
            </Card>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Replay duration</p>
                <p className="mt-2 text-2xl font-extrabold text-text">{replayDurationLabel}</p>
                <p className="mt-1 text-sm text-gray-600">Total window from first to last recorded location.</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Distance covered</p>
                <p className="mt-2 text-2xl font-extrabold text-text">{replay.totalDistanceKm} km</p>
                <p className="mt-1 text-sm text-gray-600">Total movement reconstructed across {replay.locations.length} samples.</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Idle duration</p>
                <p className="mt-2 text-2xl font-extrabold text-text">{replay.totalIdleMinutes} min</p>
                <p className="mt-1 text-sm text-gray-600">Accumulated idle time across the replay window.</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Alert markers</p>
                {replay.alerts.length > 0 ? (
                  <Link className="mt-2 block text-2xl font-extrabold text-danger hover:underline" to={scopedPath('/alerts') + '?tripId=' + replay.tripId}>
                    {replay.alerts.length}
                  </Link>
                ) : (
                  <p className="mt-2 text-2xl font-extrabold text-text">0</p>
                )}
                <p className="mt-1 text-sm text-gray-600">Exceptions flagged during the replay window.</p>
                {replay.alerts.length > 0 && (
                  <Link className="mt-1 block text-xs font-semibold text-primary hover:underline" to={scopedPath('/alerts') + '?tripId=' + replay.tripId}>
                    View alerts →
                  </Link>
                )}
              </Card>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
              <div className="space-y-6" id="replay-map">
                <ReplayMapPanel replay={replay} />
                <Card className="p-5">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Replay scope</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-semibold text-text">Started</p>
                      <p className="mt-1 text-sm text-gray-600">{new Date(replay.startTime).toLocaleString(undefined)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text">Ended</p>
                      <p className="mt-1 text-sm text-gray-600">{new Date(replay.endTime).toLocaleString(undefined)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text">Average speed</p>
                      <p className="mt-1 text-sm text-gray-600">{replay.averageSpeed} km/h</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text">Max speed</p>
                      <p className="mt-1 text-sm text-gray-600">{replay.maxSpeed} km/h</p>
                    </div>
                  </div>
                </Card>
              </div>

              <div id="replay-timeline">
                <ReplayTimeline replay={replay} />
              </div>
            </div>
        </>
      </div>
    </TrackTraceAccessBoundary>
  )
}
