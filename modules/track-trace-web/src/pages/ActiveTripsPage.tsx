import { useEffect, useMemo, useState } from 'react'
import { Button, Card } from '@shared-ui'
import { Filter, Search } from 'lucide-react'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { ActiveTripsTable } from '../components/ActiveTripsTable'
import { PaginationStrip } from '../components/shared/PaginationStrip'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { useTrackingStore } from '../store/trackingStore'
import { ListPageSkeleton } from '../components/shared/ListPageSkeleton'
import type { TrackingStatus } from '../types/tracking.types'

const DEFAULT_PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [10, 25, 50]
const STATUS_OPTIONS: Array<TrackingStatus | 'All'> = [
  'All',
  'Scheduled',
  'Assigned',
  'At Pickup',
  'Loading',
  'In Transit',
  'At Checkpoint',
  'Delayed',
  'Near Destination',
  'At Destination',
  'Unloading',
  'Idle',
  'Stopped',
  'Offline',
  'Route Deviated',
]
const DELAY_OPTIONS = ['All', 'Delayed', 'On Time'] as const
const PRIMARY_STATUS_OPTIONS: Array<TrackingStatus | 'All'> = ['All', 'In Transit', 'Delayed', 'Idle', 'Offline', 'Route Deviated']

const inTransitStatuses = ['Assigned', 'At Pickup', 'Loading', 'In Transit', 'At Checkpoint', 'Near Destination', 'At Destination', 'Unloading']
const idleStatuses = ['Idle', 'Stopped']

function filterChipClassName(active: boolean) {
  return active
    ? 'rounded-full border border-primary bg-primary/10 px-5 py-3 text-sm font-semibold text-primary'
    : 'rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-600 transition hover:border-primary/40 hover:text-primary'
}

export function ActiveTripsPage() {
  const { scopedPath } = useTrackTraceRouting()
  const { activeTrips, error, loading } = useTrackingStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TrackingStatus | 'All'>('All')
  const [delayFilter, setDelayFilter] = useState<(typeof DELAY_OPTIONS)[number]>('All')
  const [showFilters, setShowFilters] = useState(false)
  const [showMoreStatuses, setShowMoreStatuses] = useState(false)

  const queueTrips = useMemo(
    () => activeTrips.filter((trip) => trip.status !== 'Completed' && trip.status !== 'Cancelled'),
    [activeTrips],
  )

  const filteredTrips = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return queueTrips.filter((trip) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          trip.id,
          trip.bookingId,
          trip.vehicleNumber,
          trip.customerName,
          trip.driverName,
          trip.origin,
          trip.destination,
        ].some((value) => value.toLowerCase().includes(normalizedSearch))

      const matchesStatus = statusFilter === 'All' || trip.status === statusFilter
      const matchesDelay =
        delayFilter === 'All'
        || (delayFilter === 'Delayed' && trip.delayMinutes > 0)
        || (delayFilter === 'On Time' && trip.delayMinutes <= 0)

      return matchesSearch && matchesStatus && matchesDelay
    })
  }, [delayFilter, queueTrips, search, statusFilter])

  const counts = useMemo(() => ({
    inTransit: queueTrips.filter((trip) => inTransitStatuses.includes(trip.status)).length,
    delayed: queueTrips.filter((trip) => trip.delayMinutes > 0 || trip.status === 'Delayed').length,
    idle: queueTrips.filter((trip) => idleStatuses.includes(trip.status)).length,
    offline: queueTrips.filter((trip) => trip.isOffline || trip.status === 'Offline').length,
    deviation: queueTrips.filter((trip) => trip.routeDeviationKm > 0 || trip.status === 'Route Deviated').length,
  }), [queueTrips])

  const hasActiveFilters = search.trim().length > 0 || statusFilter !== 'All' || delayFilter !== 'All'
  const activeFilterCount = Number(search.trim().length > 0) + Number(statusFilter !== 'All') + Number(delayFilter !== 'All')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize))
  const paginatedTrips = filteredTrips.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    if (!filteredTrips.length) {
      if (page !== 1) setPage(1)
      return
    }

    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [filteredTrips.length, page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, delayFilter])

  if (loading) {
    return <ListPageSkeleton />
  }

  if (error) {
    return <EmptyPlaceholder title="Trips unavailable" description={error} />
  }

  return (
    <TrackTraceAccessBoundary page="shipments">
      <div className="space-y-6">
        <Card className="overflow-hidden px-6 py-5">
          <div className="grid gap-5 md:grid-cols-[220px,repeat(5,minmax(0,1fr))]">
            <div className="border-b border-gray-200 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-6">
              <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Total Active</p>
              <p className="mt-2 text-4xl font-extrabold text-text">{queueTrips.length}</p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">In Transit</p>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-text">{counts.inTransit}</div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Delayed</p>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-text">{counts.delayed}</div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Idle</p>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-text">{counts.idle}</div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Offline</p>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-text">{counts.offline}</div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Deviation</p>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-text">{counts.deviation}</div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 px-5 py-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <h3 className="text-2xl font-extrabold text-text">Active Trips</h3>
                <p className="mt-1 text-sm text-gray-600">{filteredTrips.length} trips</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="relative min-w-[280px] flex-1 md:min-w-[520px]" htmlFor="active-trips-search">
                  <Search className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400" />
                  <input
                    id="active-trips-search"
                    className="h-14 w-full rounded-2xl border border-gray-300 bg-white pl-14 pr-4 text-base text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search trips"
                    value={search}
                  />
                </label>
                <Button
                  className="h-14 min-w-[160px] rounded-2xl px-6 text-base"
                  onClick={() => setShowFilters((current) => !current)}
                  size="sm"
                  variant="outline"
                >
                  <Filter className="mr-3 h-5 w-5" />
                  Filter
                  {activeFilterCount > 0 ? (
                    <span className="ml-3 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Button>
              </div>
            </div>

            {showFilters ? (
              <div className="mt-4 grid gap-5 border-t border-gray-200 pt-4 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Status</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {PRIMARY_STATUS_OPTIONS.map((option) => (
                      <button
                        className={filterChipClassName(statusFilter === option)}
                        key={option}
                        onClick={() => setStatusFilter(option)}
                        type="button"
                      >
                        {option === 'All' ? 'All statuses' : option}
                      </button>
                    ))}
                    <button
                      className="rounded-full border border-dashed border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-600 transition hover:border-primary/40 hover:text-primary"
                      onClick={() => setShowMoreStatuses((current) => !current)}
                      type="button"
                    >
                      {showMoreStatuses ? 'Fewer statuses' : 'More filters'}
                    </button>
                  </div>
                  {showMoreStatuses ? (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {STATUS_OPTIONS.filter((option) => !PRIMARY_STATUS_OPTIONS.includes(option)).map((option) => (
                        <button
                          className={filterChipClassName(statusFilter === option)}
                          key={option}
                          onClick={() => setStatusFilter(option)}
                          type="button"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Delay</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {DELAY_OPTIONS.map((option) => (
                      <button
                        className={filterChipClassName(delayFilter === option)}
                        key={option}
                        onClick={() => setDelayFilter(option)}
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button
                      className="h-11 rounded-xl px-5"
                      disabled={!hasActiveFilters}
                      onClick={() => {
                        setSearch('')
                        setStatusFilter('All')
                        setDelayFilter('All')
                        setShowMoreStatuses(false)
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Reset filters
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {filteredTrips.length ? (
            <>
              <ActiveTripsTable showMobileCards trips={paginatedTrips} tripBasePath={scopedPath('/trips')} />
              <PaginationStrip
                page={page}
                totalPages={totalPages}
                totalItems={filteredTrips.length}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPrev={() => setPage((p) => p - 1)}
                onNext={() => setPage((p) => p + 1)}
                onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize)
                  setPage(1)
                }}
                itemLabel="trips"
              />
            </>
          ) : (
            <EmptyPlaceholder
              title="No trips match the current filters"
              description="Try a broader search or reset the filters."
            />
          )}
        </Card>
      </div>
    </TrackTraceAccessBoundary>
  )
}
