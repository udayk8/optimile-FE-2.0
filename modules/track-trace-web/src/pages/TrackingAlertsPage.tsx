import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
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
import type { AlertSeverity, AlertStatus, TrackingAlert } from '../types/tracking.types'

const PAGE_SIZE = 20

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
function IncidentPanel({
  alert,
  onClose,
  onAcknowledge,
  onResolve,
  onRemark,
}: {
  alert: TrackingAlert
  onClose: () => void
  onAcknowledge: (remark: string) => void
  onResolve: (note: string) => void
  onRemark: (remark: string) => void
}) {
  const [remark, setRemark] = useState('')
  const sev = SEV[alert.severity]

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
    <div className="flex h-full max-h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Incident Details</p>
          <p className="text-sm font-bold text-text">{alert.type}</p>
        </div>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Severity + status strip */}
        <div className={`border-b px-5 py-3 ${sev.card}`}>
          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide ${sev.badge}`}>{alert.severity}</span>
            <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-xs font-semibold text-gray-600">{alert.status}</span>
            <span className="ml-auto text-xs text-gray-400">{timeAgo(alert.createdAt)}</span>
          </div>
          <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">{alert.message}</p>
        </div>

        {/* Trip context */}
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Trip Context</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Trip ID</span>
              <span className="font-semibold text-text">{alert.tripId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vehicle</span>
              <span className="font-semibold text-text">{alert.vehicleNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Location</span>
              <span className="font-semibold text-text">{alert.location}</span>
            </div>
            {alert.assignedTo && (
              <div className="flex justify-between">
                <span className="text-gray-500">Assigned To</span>
                <span className="font-semibold text-primary">{alert.assignedTo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Incident timeline */}
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Incident Timeline</p>
          <div className="space-y-3">
            {timeline.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.dot}`} />
                  {i < timeline.length - 1 && <div className="mt-1 w-px flex-1 bg-gray-200" />}
                </div>
                <div className="pb-2">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xs font-semibold text-text">{item.label}</p>
                    {item.time && <span className="text-[10px] text-gray-400">{item.time}</span>}
                  </div>
                  {item.desc && <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed">{item.desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operator remarks */}
        <div className="px-5 py-4">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Operator Remarks</p>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
            placeholder="Add a note or internal status update…"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
          {remark.trim() && (
            <button
              type="button"
              onClick={() => { onRemark(remark); setRemark('') }}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              Save note
            </button>
          )}
        </div>
      </div>

      {/* Action footer */}
      {alert.status !== 'Resolved' && (
        <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
          {alert.status === 'Open' && (
            <button
              type="button"
              onClick={handleAcknowledge}
              className="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
            >
              Acknowledge
            </button>
          )}
          <button
            type="button"
            onClick={handleResolve}
            className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-white transition hover:bg-primary/90"
          >
            Resolve &amp; Close
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function TrackingAlertsPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { acknowledgeAlert, addRemark, alerts, error, loading, resolveAlert } = useTrackingStore()

  const initialSeverity = searchParams.get('severity')
  const resolvedInitialSeverity: AlertSeverity | 'All' =
    initialSeverity === 'Critical' || initialSeverity === 'High' || initialSeverity === 'Medium' || initialSeverity === 'Low'
      ? initialSeverity : 'All'

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState<AlertSeverity | 'All'>(resolvedInitialSeverity)
  const [status, setStatus] = useState<AlertStatus | 'All'>('Open')
  const [sortBy, setSortBy] = useState<'Newest' | 'Severity' | 'Unassigned First'>('Newest')
  const [selectedAlert, setSelectedAlert] = useState<TrackingAlert | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => { setSeverity(resolvedInitialSeverity) }, [resolvedInitialSeverity])
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

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
  }, [alerts, search, severity, status, sortBy])

  useEffect(() => { setPage(1) }, [search, severity, status, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE))
  const paged = filteredAlerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = searchInput.trim().length > 0 || severity !== 'All' || status !== 'Open' || sortBy !== 'Newest'

  // keep selectedAlert in sync after mutations
  useEffect(() => {
    if (!selectedAlert) return
    const updated = alerts.find(a => a.id === selectedAlert.id)
    if (updated) setSelectedAlert(updated)
  }, [alerts, selectedAlert])

  if (loading) return <ListPageSkeleton />
  if (error) return <EmptyPlaceholder title="Alerts unavailable" description={error} />

  return (
    <TrackTraceAccessBoundary page="alerts">
      <div className="space-y-4">

        {/* ── Severity stat cards ─────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(['Critical', 'High', 'Medium', 'Low'] as AlertSeverity[]).map((s) => {
            const cfg = SEV[s]
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(severity === s ? 'All' : s)}
                className={`flex items-center justify-between rounded-2xl border bg-white px-5 py-4 shadow-sm transition hover:shadow-md ${cfg.statBorder} ${severity === s ? 'ring-2 ring-primary/20' : ''}`}
              >
                <div className="text-left">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">{s}</p>
                  <p className={`mt-1 text-2xl font-bold ${cfg.count}`}>{globalCounts[s]}</p>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${cfg.statIcon}`}>
                  {cfg.icon}
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Filter bar ──────────────────────────────────────── */}
        <div className="space-y-2.5 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
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
            <span className="ml-auto shrink-0 text-xs text-gray-400">
              {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setSeverity('All'); setStatus('Open'); setSortBy('Newest'); setSearch(''); setSearchInput('') }}
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
                {(['Newest', 'Severity', 'Unassigned First'] as const).map((s) => (
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

        {/* ── Content: list + panel ───────────────────────────── */}
        {filteredAlerts.length === 0 ? (
          <EmptyPlaceholder
            title={hasFilters ? 'No alerts match the current filters' : 'No open alerts'}
            description={hasFilters ? 'Try broadening the severity or status filters.' : 'All alerts have been resolved or none have been raised yet.'}
          />
        ) : (
          <div className={`grid gap-4 ${selectedAlert ? 'xl:grid-cols-[1fr,380px]' : ''}`}>

            {/* Alert list */}
            <div className="space-y-3">
              {paged.map((alert) => {
                const cfg = SEV[alert.severity]
                const isSelected = selectedAlert?.id === alert.id
                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlert(isSelected ? null : alert)}
                    className={`cursor-pointer overflow-hidden rounded-xl border-l-4 bg-white shadow-sm transition hover:shadow-md ${cfg.border} ${isSelected ? 'ring-2 ring-primary/30' : 'border border-gray-200'}`}
                  >
                    {/* Single compact header row: severity + title + status + time */}
                    <div className="flex items-center gap-2 px-4 py-2.5">
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${cfg.badge}`}>
                        {alert.severity}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-xs font-bold text-text">{alert.type}</p>
                      <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${
                        alert.status === 'Open' ? 'border-gray-200 text-gray-500' :
                        alert.status === 'Acknowledged' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                        'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}>
                        {alert.status}
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-400">{timeAgo(alert.createdAt)}</span>
                    </div>

                    {/* Meta row: trip · location · owner */}
                    <div className="grid grid-cols-3 gap-2 border-t border-gray-100 px-4 py-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Trip</p>
                        <p className="truncate text-xs font-semibold text-text">{alert.tripId}</p>
                        <p className="truncate text-[11px] text-gray-500">{alert.vehicleNumber}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Location</p>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                          <p className="truncate text-xs text-gray-700">{alert.location}</p>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          {new Date(alert.createdAt).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Owner</p>
                        <p className="truncate text-xs text-gray-500">
                          {alert.assignedTo ?? <span className="italic text-gray-400">Unassigned</span>}
                        </p>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
                      <div className="flex gap-1.5">
                        {alert.status === 'Open' && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void acknowledgeAlert(alert.id, undefined, user?.email) }}
                            className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-primary/90"
                          >
                            Acknowledge
                          </button>
                        )}
                        {alert.status !== 'Resolved' && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void resolveAlert(alert.id, { resolvedBy: user?.email ?? 'control.tower@optimile', resolutionNote: 'Resolved via alerts workspace' }) }}
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedAlert(isSelected ? null : alert) }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <Clock className="h-3 w-3" />
                        {isSelected ? 'Hide details' : 'View details'}
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
                  <p className="text-xs text-gray-500">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredAlerts.length)} of {filteredAlerts.length} alerts
                  </p>
                  <div className="flex items-center gap-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-xl border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                    <span className="text-xs font-medium text-gray-500">Page {page} of {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="rounded-xl border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40 hover:bg-gray-50">Next →</button>
                  </div>
                </div>
              )}
            </div>

            {/* Incident detail panel */}
            {selectedAlert && (
              <div className="xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)]">
                <IncidentPanel
                  alert={selectedAlert}
                  onClose={() => setSelectedAlert(null)}
                  onAcknowledge={(remark) => void acknowledgeAlert(selectedAlert.id, remark, user?.email)}
                  onResolve={(note) => void resolveAlert(selectedAlert.id, { resolvedBy: user?.email ?? 'control.tower@optimile', resolutionNote: note })}
                  onRemark={(remark) => void addRemark(selectedAlert.id, remark)}
                />
              </div>
            )}
          </div>
        )}

      </div>
    </TrackTraceAccessBoundary>
  )
}
