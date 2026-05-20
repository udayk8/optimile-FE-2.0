import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Card, PageHero } from '@shared-ui'
import { AlertActionPanel } from '../components/AlertActionPanel'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { PaginationStrip } from '../components/shared/PaginationStrip'
import { trackTraceV2StickyPanelClassName } from '../components/shared/trackTraceV2Chrome'
import { TrackingAlertCard } from '../components/TrackingAlertCard'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { useTrackingStore } from '../store/trackingStore'
import type { AlertSeverity, AlertStatus } from '../types/tracking.types'
import { ListPageSkeleton } from '../components/shared/ListPageSkeleton'

const PAGE_SIZE = 16

export function TrackingAlertsPage() {
  const { scopedPath } = useTrackTraceRouting()
  const [searchParams] = useSearchParams()
  const { acknowledgeAlert, addRemark, assignAlert, error, filterAlerts, loading, resolveAlert } = useTrackingStore()
  const initialSeverity = searchParams.get('severity')
  const resolvedInitialSeverity =
    initialSeverity === 'Critical' || initialSeverity === 'High' || initialSeverity === 'Medium' || initialSeverity === 'Low'
      ? initialSeverity
      : 'All'
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState<AlertSeverity | 'All'>(resolvedInitialSeverity)
  const [status, setStatus] = useState<AlertStatus | 'All'>('All')
  const [sortBy, setSortBy] = useState<'Newest' | 'Severity' | 'Assignment'>('Newest')

  useEffect(() => {
    setSeverity(resolvedInitialSeverity)
  }, [resolvedInitialSeverity])

  const alertsMatchingSearchAndStatus = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return filterAlerts({ status }).filter((alert) => {
      if (!normalizedSearch) return true

      return [
        alert.tripId,
        alert.vehicleNumber,
        alert.location,
        alert.type,
        alert.message,
        alert.assignedTo ?? '',
      ].some((value) => value.toLowerCase().includes(normalizedSearch))
    })
  }, [filterAlerts, search, status])

  const filteredAlerts = useMemo(() => {
    const matches = alertsMatchingSearchAndStatus.filter((alert) => (
      severity === 'All' || alert.severity === severity
    ))

    return matches.sort((left, right) => {
      if (sortBy === 'Severity') {
        const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }
        return severityOrder[left.severity] - severityOrder[right.severity]
      }

      if (sortBy === 'Assignment') {
        const leftAssigned = left.assignedTo ? 1 : 0
        const rightAssigned = right.assignedTo ? 1 : 0
        if (leftAssigned !== rightAssigned) return leftAssigned - rightAssigned
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })
  }, [alertsMatchingSearchAndStatus, severity, sortBy])
  const severityCounts = alertsMatchingSearchAndStatus.reduce(
    (counts, alert) => {
      counts[alert.severity] += 1
      return counts
    },
    { Critical: 0, High: 0, Medium: 0, Low: 0 },
  )

  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(filteredAlerts.length / PAGE_SIZE)
  const paginatedAlerts = filteredAlerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, severity, status, sortBy])

  if (loading) {
    return <ListPageSkeleton />
  }

  if (error) {
    return <EmptyPlaceholder title="Alerts unavailable" description={error} />
  }

  return (
    <TrackTraceAccessBoundary page="alerts">
      <div className="space-y-6">
        <PageHero
          eyebrow="Alerts"
          title="Tracking alerts workspace"
          subtitle="Triage workspace with stronger severity and ownership readability across offline, stale ping, fallback source, route deviation, delay, idle, checkpoint miss, overspeed, and SOS signals."
          action={
            <Button asChild variant="outline">
              <Link to={scopedPath('/geofences')}>Open geofences</Link>
            </Button>
          }
        />

        <Card className={trackTraceV2StickyPanelClassName}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Alert Queue</p>
              <p className="mt-2 text-3xl font-extrabold text-text">{filteredAlerts.length}</p>
              <p className="mt-1 text-sm text-gray-600">Review alerts by severity and workflow state before escalation.</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500" htmlFor="alert-search">Search</label>
              <input
                id="alert-search"
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Trip, vehicle, type, owner"
                value={search}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500" htmlFor="alert-severity">Severity</label>
              <select
                id="alert-severity"
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setSeverity(event.target.value as AlertSeverity | 'All')}
                value={severity}
              >
                {['All', 'Low', 'Medium', 'High', 'Critical'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500" htmlFor="alert-status">Status</label>
              <select
                id="alert-status"
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setStatus(event.target.value as AlertStatus | 'All')}
                value={status}
              >
                {['All', 'Open', 'Acknowledged', 'Resolved'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500" htmlFor="alert-sort">Sort</label>
              <select
                id="alert-sort"
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setSortBy(event.target.value as 'Newest' | 'Severity' | 'Assignment')}
                value={sortBy}
              >
                {['Newest', 'Severity', 'Assignment'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {(
                [
                  { key: 'Critical', count: severityCounts.Critical, active: 'bg-danger text-white', inactive: 'bg-danger/10 text-danger' },
                  { key: 'High',     count: severityCounts.High,     active: 'bg-warning text-white', inactive: 'bg-warning/10 text-warning' },
                  { key: 'Medium',   count: severityCounts.Medium,   active: 'bg-primary text-white', inactive: 'bg-primary/10 text-primary' },
                  { key: 'Low',      count: severityCounts.Low,      active: 'bg-secondary text-white', inactive: 'bg-secondary/10 text-secondary' },
                ] as const
              ).map(({ key, count, active, inactive }) => (
                <button
                  key={key}
                  type="button"
                  className={`rounded-full px-3 py-1 transition hover:opacity-80 ${severity === key ? active : inactive}`}
                  onClick={() => setSeverity(severity === key ? 'All' : key)}
                >
                  {count} {key.toLowerCase()}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-600">Sort by newest, urgency, or assignment to support triage handoff.</p>
          </div>
        </Card>

        {filteredAlerts.length ? (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              {paginatedAlerts.map((alert) => (
                <div key={alert.id} className="space-y-3">
                  <TrackingAlertCard alert={alert} compact />
                  <AlertActionPanel
                    alert={alert}
                    onAcknowledge={(remarks) => void acknowledgeAlert(alert.id, remarks)}
                    onAssign={(userId) => void assignAlert(alert.id, { userId })}
                    onRemark={(remark) => void addRemark(alert.id, remark)}
                    onResolve={(resolutionNote) =>
                      void resolveAlert(alert.id, {
                        resolvedBy: 'control.tower@optimile',
                        resolutionNote,
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <PaginationStrip
              page={page}
              totalPages={totalPages}
              totalItems={filteredAlerts.length}
              pageSize={PAGE_SIZE}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
              itemLabel="alerts"
            />
          </>
        ) : (
          <EmptyPlaceholder
            title="No alerts match the current filters"
            description="Try broadening the severity or workflow status filters."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setSeverity('All'); setStatus('All'); setSortBy('Newest'); setSearch('') }}
              >
                Reset filters
              </Button>
            }
          />
        )}
      </div>
    </TrackTraceAccessBoundary>
  )
}
