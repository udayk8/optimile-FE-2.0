import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, Search } from 'lucide-react'
import { Button, Card, PageHero } from '@shared-ui'
import { AlertActionPanel } from '../components/AlertActionPanel'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { PaginationStrip } from '../components/shared/PaginationStrip'
import { trackTraceV2StickyPanelClassName } from '../components/shared/trackTraceV2Chrome'
import { TrackingAlertCard } from '../components/TrackingAlertCard'
import { useAuth } from '@shared-auth'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { useTrackingStore } from '../store/trackingStore'
import type { AlertSeverity, AlertStatus } from '../types/tracking.types'
import { ListPageSkeleton } from '../components/shared/ListPageSkeleton'

const PAGE_SIZE = 16

export function TrackingAlertsPage() {
  const { scopedPath } = useTrackTraceRouting()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { acknowledgeAlert, addRemark, assignAlert, error, filterAlerts, loading, resolveAlert } = useTrackingStore()
  const initialSeverity = searchParams.get('severity')
  const resolvedInitialSeverity =
    initialSeverity === 'Critical' || initialSeverity === 'High' || initialSeverity === 'Medium' || initialSeverity === 'Low'
      ? initialSeverity
      : 'All'
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState<AlertSeverity | 'All'>(resolvedInitialSeverity)
  const [status, setStatus] = useState<AlertStatus | 'All'>('Open')
  const [sortBy, setSortBy] = useState<'Newest' | 'Severity' | 'Unassigned First'>('Newest')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    setSeverity(resolvedInitialSeverity)
  }, [resolvedInitialSeverity])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

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
      if (sortBy === 'Unassigned First') {
        const leftAssigned = left.assignedTo ? 1 : 0
        const rightAssigned = right.assignedTo ? 1 : 0
        if (leftAssigned !== rightAssigned) return leftAssigned - rightAssigned
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })
  }, [alertsMatchingSearchAndStatus, severity, sortBy])

  const totalOpen = useMemo(() => filterAlerts({ status: 'Open' }).length, [filterAlerts])

  const severityCounts = alertsMatchingSearchAndStatus.reduce(
    (counts, alert) => {
      counts[alert.severity] += 1
      return counts
    },
    { Critical: 0, High: 0, Medium: 0, Low: 0 },
  )

  const hasActiveFilters = searchInput.trim().length > 0 || severity !== 'All' || status !== 'Open' || sortBy !== 'Newest'
  const activeFilterCount = Number(searchInput.trim().length > 0) + Number(severity !== 'All') + Number(status !== 'Open') + Number(sortBy !== 'Newest')

  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(filteredAlerts.length / PAGE_SIZE)
  const paginatedAlerts = filteredAlerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [searchInput, severity, status, sortBy])

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
          subtitle="Triage workspace for offline, stale ping, route deviation, delay, idle, checkpoint miss, overspeed, and SOS signals."
          action={
            <Button asChild variant="outline">
              <Link to={scopedPath('/geofences')}>Open geofences</Link>
            </Button>
          }
        />

        <Card className={trackTraceV2StickyPanelClassName}>
          {/* Search + Filter button row */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="relative min-w-[280px] flex-1" htmlFor="alert-search">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="alert-search"
                type="text"
                className="h-12 w-full rounded-2xl border border-gray-300 bg-white pl-12 pr-4 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by trip, vehicle, type, or owner…"
                value={searchInput}
              />
            </label>
            <Button
              className="h-12 min-w-[140px] rounded-2xl px-5"
              variant="outline"
              onClick={() => setShowFilters((f) => !f)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Expandable filter panel */}
          {showFilters && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="flex flex-wrap items-start gap-x-8 gap-y-4">

                {/* Severity */}
                <div className="flex items-center gap-3">
                  <p className="shrink-0 text-xs font-extrabold uppercase tracking-widest text-gray-500">Severity</p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: 'All',      active: 'bg-gray-800 text-white border-gray-800',         inactive: 'border-gray-300 text-gray-600' },
                        { key: 'Critical', active: 'bg-danger text-white border-danger',             inactive: 'border-danger/40 text-danger' },
                        { key: 'High',     active: 'bg-warning text-white border-warning',           inactive: 'border-warning/40 text-warning' },
                        { key: 'Medium',   active: 'bg-primary text-white border-primary',           inactive: 'border-primary/40 text-primary' },
                        { key: 'Low',      active: 'bg-secondary text-white border-secondary',       inactive: 'border-secondary/40 text-secondary' },
                      ] as const
                    ).map(({ key, active, inactive }) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={severity === key}
                        className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition hover:opacity-90 ${severity === key ? active : `bg-white ${inactive}`}`}
                        onClick={() => setSeverity(key)}
                      >
                        {key === 'All' ? 'All' : key}
                        {key !== 'All' && (
                          <span className="ml-1.5 opacity-70">{severityCounts[key as keyof typeof severityCounts]}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-8 w-px self-center bg-gray-200 max-sm:hidden" />

                {/* Status */}
                <div className="flex items-center gap-3">
                  <p className="shrink-0 text-xs font-extrabold uppercase tracking-widest text-gray-500">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {(['Open', 'Acknowledged', 'Resolved', 'All'] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={status === item}
                        className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition hover:opacity-90 ${
                          status === item
                            ? 'bg-gray-800 text-white border-gray-800'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                        }`}
                        onClick={() => setStatus(item)}
                      >
                        {item === 'All' ? 'All' : item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-8 w-px self-center bg-gray-200 max-sm:hidden" />

                {/* Sort */}
                <div className="flex items-center gap-3">
                  <p className="shrink-0 text-xs font-extrabold uppercase tracking-widest text-gray-500">Sort</p>
                  <div className="flex flex-wrap gap-2">
                    {(['Newest', 'Severity', 'Unassigned First'] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={sortBy === item}
                        className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition hover:opacity-90 ${
                          sortBy === item
                            ? 'bg-gray-800 text-white border-gray-800'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                        }`}
                        onClick={() => setSortBy(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    className="self-center text-sm font-medium text-primary hover:underline"
                    onClick={() => { setSeverity('All'); setStatus('Open'); setSortBy('Newest'); setSearch(''); setSearchInput('') }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>

        {filteredAlerts.length ? (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              {paginatedAlerts.map((alert) => (
                <div key={alert.id} className="space-y-3">
                  <TrackingAlertCard alert={alert} compact />
                  <AlertActionPanel
                    alert={alert}
                    onAcknowledge={(remarks) => void acknowledgeAlert(alert.id, remarks, user?.email)}
                    onAssign={(userId) => void assignAlert(alert.id, { userId })}
                    onRemark={(remark) => void addRemark(alert.id, remark)}
                    onResolve={(resolutionNote) =>
                      void resolveAlert(alert.id, {
                        resolvedBy: user?.email ?? 'control.tower@optimile',
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
            title={hasActiveFilters ? 'No alerts match the current filters' : 'No open alerts'}
            description={hasActiveFilters ? 'Try broadening the severity or status filters.' : 'All alerts have been resolved or none have been raised yet.'}
            action={
              hasActiveFilters ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setSeverity('All'); setStatus('Open'); setSortBy('Newest'); setSearch(''); setSearchInput('') }}
                >
                  Reset filters
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </TrackTraceAccessBoundary>
  )
}
