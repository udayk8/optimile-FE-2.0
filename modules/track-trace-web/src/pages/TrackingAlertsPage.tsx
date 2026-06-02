import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { getRoutePerformance } from '../services/analyticsApi'
import type { RoutePerformance } from '../types/analytics.types'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Info,
  MapPin,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { ListPageSkeleton } from '../components/shared/ListPageSkeleton'
import { useAuth } from '@shared-auth'
import { useTrackingStore } from '../store/trackingStore'
import type { AlertSeverity, AlertStatus, TrackingAlert, TrackingTrip } from '../types/tracking.types'

const PAGE_SIZE = 10

// ── severity config ───────────────────────────────────────────────────────────
const SEV = {
  Critical: {
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-700',
    card: 'border-red-100',
    icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
    statBorder: 'border-red-200',
    statIcon: 'bg-red-50 text-red-500',
    count: 'text-red-600',
  },
  High: {
    border: 'border-l-orange-400',
    badge: 'bg-orange-100 text-orange-700',
    card: 'border-orange-100',
    icon: <AlertTriangle className="h-5 w-5 text-orange-400" />,
    statBorder: 'border-orange-200',
    statIcon: 'bg-orange-50 text-orange-400',
    count: 'text-orange-500',
  },
  Medium: {
    border: 'border-l-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    card: 'border-amber-100',
    icon: <Info className="h-5 w-5 text-amber-400" />,
    statBorder: 'border-amber-200',
    statIcon: 'bg-amber-50 text-amber-400',
    count: 'text-amber-500',
  },
  Low: {
    border: 'border-l-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    card: 'border-blue-100',
    icon: <CheckCircle2 className="h-5 w-5 text-blue-400" />,
    statBorder: 'border-blue-200',
    statIcon: 'bg-blue-50 text-blue-400',
    count: 'text-blue-500',
  },
} as const

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Incident Detail Panel ─────────────────────────────────────────────────────
function TripContextCard({ trip }: { trip: TrackingTrip }) {
  const total = trip.distanceCoveredKm + trip.remainingDistanceKm
  const progress = total > 0 ? Math.round((trip.distanceCoveredKm / total) * 100) : 0

  const statusColors: Record<string, string> = {
    'Delayed':        'bg-red-100 text-red-700',
    'Route Deviated': 'bg-orange-100 text-orange-700',
    'Offline':        'bg-gray-200 text-gray-600',
    'In Transit':     'bg-emerald-100 text-emerald-700',
    'At Checkpoint':  'bg-blue-100 text-blue-700',
    'Near Destination': 'bg-teal-100 text-teal-700',
    'Completed':      'bg-emerald-100 text-emerald-700',
  }

  const sourceLabels: Record<string, string> = {
    GPS_DEVICE: 'GPS',
    FASTAG:     'SIM',
    DRIVER_APP: 'App',
    ANPR:       'ANPR',
    MANUAL:     'Manual',
  }

  const sourceHealth = trip.sourceHealth ?? 'Healthy'
  const sourceHealthColor =
    sourceHealth === 'Healthy'  ? 'bg-emerald-100 text-emerald-700' :
    sourceHealth === 'Stale'    ? 'bg-amber-100 text-amber-700' :
    sourceHealth === 'Fallback' ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-200 text-gray-500'

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2.5">
      {/* Origin → Destination */}
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-text">
        <span className="truncate">{trip.origin}</span>
        <span className="shrink-0 text-gray-400">→</span>
        <span className="truncate">{trip.destination}</span>
      </div>

      {/* Status + delay row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusColors[trip.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {trip.status}
        </span>
        {trip.delayMinutes > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
            +{trip.delayMinutes} min delay
          </span>
        )}
        {trip.isOffline && (
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-600">Offline</span>
        )}
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${sourceHealthColor}`}>
          {sourceLabels[trip.activeSource ?? ''] ?? trip.activeSource ?? '—'} · {sourceHealth}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-1.5 rounded-full transition-all ${trip.delayMinutes > 0 ? 'bg-red-400' : 'bg-emerald-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-gray-400">
          <span>{progress}% complete</span>
          <span>{trip.remainingDistanceKm} km left</span>
        </div>
      </div>
    </div>
  )
}

function IncidentPanel({
  alert,
  bookingId,
  trip,
  routeRows,
  onClose,
  onAcknowledge,
  onResolve,
  onRemark,
}: {
  alert: TrackingAlert
  bookingId: string
  trip: TrackingTrip | null
  routeRows: RoutePerformance[]
  onClose: () => void
  onAcknowledge: (remark: string) => void
  onResolve: (note: string) => void
  onRemark: (remark: string) => void
}) {
  const [remark, setRemark] = useState('')
  const sev = SEV[alert.severity]
  const navigate = useNavigate()
  const { scopedPath } = useTrackTraceRouting()

  const handleAcknowledge = () => {
    onAcknowledge(remark)
    setRemark('')
  }
  const handleResolve = () => {
    onResolve(remark || 'Resolved via alerts workspace')
    setRemark('')
  }

  const timeline = [
    { dot: 'bg-red-500', label: 'Alert Triggered', desc: alert.message, time: new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ...(alert.acknowledgedBy ? [{ dot: 'bg-amber-400', label: 'Acknowledged', desc: `By ${alert.acknowledgedBy}`, time: alert.acknowledgedAt ? new Date(alert.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '' }] : []),
    ...(alert.resolvedBy ? [{ dot: 'bg-emerald-500', label: 'Resolved', desc: alert.resolutionNote ?? '', time: alert.updatedAt ? new Date(alert.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '' }] : []),
    ...(alert.remarks ?? []).map(r => ({ dot: 'bg-gray-400', label: 'Operator Note', desc: r, time: '' })),
  ]

  return (
    <div
      style={{ width: 'clamp(400px, 32vw, 480px)' }}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
    >
      {/* ── Fixed header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">Incident Details</p>
          <p className="text-[14px] font-semibold text-text">{alert.type}</p>
        </div>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Scrollable body — flex:1 + min-height:0 keeps it bounded ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">

        {/* Severity + status strip */}
        <div className={`border-b px-4 py-3 ${sev.card}`}>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${sev.badge}`}>{alert.severity}</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">{alert.status}</span>
            <span className="ml-auto text-[11px] text-gray-400">{timeAgo(alert.createdAt)}</span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-gray-600">{alert.message}</p>
        </div>

        {/* Trip context */}
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">Trip Context</p>
          {trip && <div className="mb-3"><TripContextCard trip={trip} /></div>}
          {/* AL2: corridor performance context */}
          {trip && (() => {
            const laneId = (trip.origin + '-' + trip.destination).toLowerCase().replace(/\s+/g, '-')
            const row = routeRows.find((r) => r.laneId === laneId)
            if (!row) return null
            const delayColor = row.averageDelayMinutes > 90 ? 'text-danger' : row.averageDelayMinutes > 30 ? 'text-warning' : 'text-success'
            return (
              <div className="mb-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 space-y-1">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-400">Corridor context</p>
                <p className="text-[11px] text-gray-500">
                  Avg delay: <span className={`font-bold ${delayColor}`}>{row.averageDelayMinutes} min</span>
                  {' · '}
                  Efficiency: <span className="font-bold">{row.efficiencyScore}%</span>
                </p>
                <a href={scopedPath('/route-performance')} onClick={(e) => { e.preventDefault(); navigate(scopedPath('/route-performance')) }}
                  className="text-[11px] font-semibold text-primary hover:underline">
                  View corridor history →
                </a>
              </div>
            )
          })()}
          <div className="space-y-2">
            {[
              { label: 'Booking Ref', value: bookingId },
              { label: 'Vehicle',    value: alert.vehicleNumber },
              { label: 'Location',   value: alert.location },
              ...(alert.assignedTo ? [{ label: 'Assigned To', value: alert.assignedTo }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-[12px] text-gray-500">{label}</span>
                <span className="text-right text-[12px] font-semibold text-text">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Incident timeline */}
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">Incident Timeline</p>
          <div className="space-y-3">
            {timeline.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
                  {i < timeline.length - 1 && <div className="mt-1 w-px flex-1 bg-gray-200" />}
                </div>
                <div className="pb-2">
                  <div className="flex items-baseline gap-2">
                    <p className="text-[12px] font-semibold text-text">{item.label}</p>
                    {item.time && <span className="text-[11px] text-gray-400">{item.time}</span>}
                  </div>
                  {item.desc && <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{item.desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operator remarks — hidden when resolved */}
        {alert.status !== 'Resolved' && (
          <div className="px-4 py-3">
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">Operator Remarks</p>
            <div className="relative">
              <textarea
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pr-16 text-[12px] text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Add a note or internal status update…"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
              {remark.trim() && (
                <button
                  type="button"
                  onClick={() => { onRemark(remark); setRemark('') }}
                  className="absolute bottom-2 right-2 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-primary/90"
                >
                  Add remark
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky footer — always visible ── */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 space-y-2">
        <button
          type="button"
          onClick={() => navigate(scopedPath('/dispatch') + '?search=' + encodeURIComponent(bookingId))}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-primary"
        >
          Open in Dispatch →
        </button>
        {/* AL1: View Trip Replay */}
        {alert.tripId && (
          <button
            type="button"
            onClick={() => navigate(scopedPath('/trips/' + alert.tripId + '/replay'))}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-primary"
          >
            View Trip Replay →
          </button>
        )}
        {alert.status === 'Resolved' ? (
          <p className="text-center text-[12px] text-gray-400">This alert has been resolved.</p>
        ) : (
          <div className="flex gap-2">
            {alert.status === 'Open' && (
              <button
                type="button"
                onClick={handleAcknowledge}
                className="flex-1 rounded-lg border border-gray-300 bg-white py-2 text-[12px] font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Acknowledge
              </button>
            )}
            <button
              type="button"
              onClick={handleResolve}
              className="flex-1 rounded-lg bg-primary py-2 text-[12px] font-bold text-white transition hover:bg-primary/90"
            >
              Resolve &amp; Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function TrackingAlertsPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { acknowledgeAlert, addRemark, alerts, activeTrips, error, loading, resolveAlert } = useTrackingStore()

  const bookingRef = (tripId: string) =>
    activeTrips.find((t) => t.id === tripId)?.bookingId ?? tripId

  const initialSeverity = searchParams.get('severity')
  const resolvedInitialSeverity: AlertSeverity | 'All' =
    initialSeverity === 'Critical' || initialSeverity === 'High' || initialSeverity === 'Medium' || initialSeverity === 'Low'
      ? initialSeverity : 'All'

  const initialAlertId = searchParams.get('alert')
  const initialTripId = searchParams.get('tripId')

  const [routeRows, setRouteRows] = useState<RoutePerformance[]>([])
  useEffect(() => { void getRoutePerformance().then(setRouteRows).catch(() => {}) }, [])

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState<AlertSeverity | 'All'>(resolvedInitialSeverity)
  // When deep-linking to a specific alert or trip, open all statuses so results are always visible
  const [status, setStatus] = useState<AlertStatus | 'All'>(initialAlertId || initialTripId ? 'All' : 'Open')
  const [sortBy, setSortBy] = useState<'Newest' | 'Severity' | 'Unassigned First'>('Newest')
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(initialAlertId)
  const [tripIdFilter, setTripIdFilter] = useState<string | null>(initialTripId)
  const [page, setPage] = useState(1)

  useEffect(() => { setSeverity(resolvedInitialSeverity) }, [resolvedInitialSeverity])
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Derive live selected alert directly from store — always up-to-date after mutations
  const selectedAlert = useMemo(() => alerts.find(a => a.id === selectedAlertId) ?? null, [alerts, selectedAlertId])

  // Global severity counts (all open, no search filter)
  const globalCounts = useMemo(() =>
    alerts
      .filter((a) => a.status !== 'Resolved')
      .reduce(
        (acc: Record<AlertSeverity, number>, a) => { acc[a.severity] += 1; return acc },
        { Critical: 0, High: 0, Medium: 0, Low: 0 },
      ), [alerts])

  const filteredAlerts = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    const matches = alerts.filter((a) => {
      if (status !== 'All' && a.status !== status) return false
      if (severity !== 'All' && a.severity !== severity) return false
      if (tripIdFilter && a.tripId !== tripIdFilter) return false
      if (!normalized) return true
      return [a.tripId, a.vehicleNumber, a.location, a.type, a.message, a.assignedTo ?? '']
        .some(v => v.toLowerCase().includes(normalized))
    })
    return matches.sort((l, r) => {
      if (sortBy === 'Severity') {
        const order: Record<AlertSeverity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
        return order[l.severity] - order[r.severity]
      }
      if (sortBy === 'Unassigned First') {
        const la = l.assignedTo ? 1 : 0; const ra = r.assignedTo ? 1 : 0
        if (la !== ra) return la - ra
      }
      return new Date(r.createdAt).getTime() - new Date(l.createdAt).getTime()
    })
  }, [alerts, search, severity, status, sortBy, tripIdFilter])

  useEffect(() => { setPage(1) }, [search, severity, status, sortBy, tripIdFilter])

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE))
  const paged = filteredAlerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = searchInput.trim().length > 0 || severity !== 'All' || status !== 'Open' || sortBy !== 'Newest' || tripIdFilter !== null



  if (loading) return <ListPageSkeleton />
  if (error) return <EmptyPlaceholder title="Alerts unavailable" description={error} />

  return (
    <TrackTraceAccessBoundary page="alerts">
      {/* Full-height shell — navbar 64px + main py-6 (48px) = 112px */}
      <div className="flex h-[calc(100vh-112px)] flex-col gap-3 overflow-hidden">

        {/* ── Severity stat cards — shrink-0 ─────────────────── */}
        <div className="shrink-0 grid grid-cols-3 gap-3 lg:grid-cols-5">
          {/* Total pill */}
          <button
            type="button"
            onClick={() => setSeverity('All')}
            className={`rounded-xl border border-gray-200 bg-white px-5 py-3 text-left shadow-sm transition hover:shadow-md ${severity === 'All' ? 'ring-2 ring-primary/20' : ''}`}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Total</p>
            <p className="mt-0.5 text-xl font-extrabold text-gray-800">
              {globalCounts.Critical + globalCounts.High + globalCounts.Medium + globalCounts.Low}
            </p>
          </button>

          {(['Critical', 'High', 'Medium', 'Low'] as AlertSeverity[]).map((s) => {
            const cfg = SEV[s]
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(severity === s ? 'All' : s)}
                className={`rounded-xl border bg-white px-5 py-3 text-left shadow-sm transition hover:shadow-md ${cfg.statBorder} ${severity === s ? 'ring-2 ring-primary/20' : ''}`}
              >
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">{s}</p>
                <p className={`mt-0.5 text-xl font-extrabold ${cfg.count}`}>{globalCounts[s]}</p>
              </button>
            )
          })}
        </div>

        {/* ── Filter bar — shrink-0 ───────────────────────────── */}
        <div className="shrink-0 space-y-2.5 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          {/* Row 1: search + count + reset */}
          <div className="flex items-center gap-3">
            <label className="relative min-w-[200px] flex-1" htmlFor="alert-search">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="alert-search"
                type="text"
                className="h-8 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-xs text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Search alerts, trips, vehicles…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </label>
            {tripIdFilter && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                Trip: {bookingRef(tripIdFilter)}
                <button
                  type="button"
                  onClick={() => { setTripIdFilter(null); setStatus('Open') }}
                  className="ml-0.5 rounded-full hover:text-primary/70"
                  title="Clear trip filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <span className="ml-auto shrink-0 text-xs text-gray-400">
              {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setSeverity('All'); setStatus('Open'); setSortBy('Newest'); setSearch(''); setSearchInput(''); setTripIdFilter(null) }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
                title="Reset filters"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Row 2: status pills + sort pills */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Status</span>
              <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-0.5">
                {(['Open', 'Acknowledged', 'Resolved', 'All'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition ${
                      status === s
                        ? s === 'Open'        ? 'bg-white text-gray-800 shadow-sm'
                        : s === 'Acknowledged' ? 'bg-amber-50 text-amber-700 shadow-sm'
                        : s === 'Resolved'    ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Sort</span>
              <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-0.5">
                {(['Newest', 'Severity'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSortBy(s)}
                    className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition ${
                      sortBy === s
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Content: list + panel — flex-1 min-h-0 ─────────── */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {filteredAlerts.length === 0 ? (
            <EmptyPlaceholder
              title={hasFilters ? 'No alerts match the current filters' : 'No open alerts'}
              description={hasFilters ? 'Try broadening the severity or status filters.' : 'All alerts have been resolved or none have been raised yet.'}
            />
          ) : (
            <div className="flex h-full min-w-0 gap-4">

              {/* ── Alert table card — flex-1 flex-col h-full ── */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

                {/* Table header — shrink-0 */}
                <div className="shrink-0 overflow-x-auto">
                  <div className="grid min-w-[900px] grid-cols-[120px_minmax(180px,1fr)_minmax(150px,180px)_minmax(180px,1fr)_110px_120px_220px] items-center gap-3 border-b border-gray-100 border-l-4 border-l-transparent bg-gray-50 px-3 py-2">
                    {(['Severity','Alert Type','Trip / Vehicle','Location','Status','Time','Actions'] as const).map((h) => (
                      <p key={h} className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</p>
                    ))}
                  </div>
                </div>

                {/* Rows — flex-1 min-h-0 scrolls internally */}
                <div className="min-h-0 flex-1 overflow-auto">
                  <div className="divide-y divide-gray-50">
                    {paged.map((alert) => {
                      const cfg = SEV[alert.severity]
                      const isSelected = selectedAlert?.id === alert.id
                      return (
                        <div
                          key={alert.id}
                          onClick={() => setSelectedAlertId(isSelected ? null : alert.id)}
                          className={`grid min-w-[900px] cursor-pointer grid-cols-[120px_minmax(180px,1fr)_minmax(150px,180px)_minmax(180px,1fr)_110px_120px_220px] items-center gap-3 border-l-4 px-3 py-2.5 transition-colors hover:bg-gray-50 ${cfg.border} ${isSelected ? 'bg-primary/[0.04]' : 'bg-white'}`}
                        >
                          <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.badge}`}>
                            {alert.severity}
                          </span>
                          <p className="truncate text-[13px] font-medium text-gray-900">{alert.type}</p>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-gray-800">{bookingRef(alert.tripId)}</p>
                            <p className="truncate text-[11px] text-gray-400">{alert.vehicleNumber}</p>
                          </div>
                          <div className="flex min-w-0 items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0 text-gray-300" />
                            <p className="truncate text-[12px] text-gray-500">{alert.location}</p>
                          </div>
                          <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            alert.status === 'Open'         ? 'bg-gray-100 text-gray-600' :
                            alert.status === 'Acknowledged' ? 'bg-amber-50 text-amber-700' :
                                                              'bg-emerald-50 text-emerald-700'
                          }`}>
                            {alert.status}
                          </span>
                          <p className="text-[11px] text-gray-400">{timeAgo(alert.createdAt)}</p>
                          <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {alert.status === 'Open' && (
                              <button type="button" onClick={() => void acknowledgeAlert(alert.id, undefined, user?.email)}
                                className="h-[30px] rounded-lg bg-primary px-3 text-[11px] font-bold text-white transition hover:bg-primary/90">
                                Ack
                              </button>
                            )}
                            {alert.status !== 'Resolved' && (
                              <button type="button" onClick={() => void resolveAlert(alert.id, { resolvedBy: user?.email ?? 'control.tower@optimile', resolutionNote: 'Resolved via alerts workspace' })}
                                className="h-[30px] rounded-lg border border-gray-200 bg-white px-3 text-[11px] font-medium text-gray-600 transition hover:bg-gray-50">
                                Resolve
                              </button>
                            )}
                            <button type="button" title="View details" onClick={() => setSelectedAlertId(isSelected ? null : alert.id)}
                              className={`flex h-[30px] w-[30px] items-center justify-center rounded-lg border transition ${
                                isSelected ? 'border-primary/30 bg-primary/10 text-primary' : 'border-gray-200 bg-white text-gray-400 hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
                              }`}>
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Pagination — shrink-0 */}
                {totalPages > 1 && (
                  <div className="shrink-0 flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
                    <p className="text-[12px] text-gray-500">
                      {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredAlerts.length)} of {filteredAlerts.length} alerts
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-[12px] font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                      <span className="text-[12px] text-gray-500">Page {page} of {totalPages}</span>
                      <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-[12px] font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50">Next →</button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Incident panel — shrink-0 h-full ── */}
              {selectedAlert && (
                <div className="shrink-0 h-full">
                  <IncidentPanel
                    alert={selectedAlert}
                    bookingId={bookingRef(selectedAlert.tripId)}
                    trip={activeTrips.find((t) => t.id === selectedAlert.tripId) ?? null}
                    routeRows={routeRows}
                    onClose={() => setSelectedAlertId(null)}
                    onAcknowledge={(remark) => void acknowledgeAlert(selectedAlert.id, remark, user?.email)}
                    onResolve={(note) => void resolveAlert(selectedAlert.id, { resolvedBy: user?.email ?? 'control.tower@optimile', resolutionNote: note })}
                    onRemark={(remark) => void addRemark(selectedAlert.id, remark)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </TrackTraceAccessBoundary>
  )
}
