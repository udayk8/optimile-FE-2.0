import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card } from '@shared-ui'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { PaginationStrip } from '../components/shared/PaginationStrip'
import { useTrackingStore } from '../store/trackingStore'
import type { GeofenceEvent, TrackingGeofence } from '../types/geofence.types'
import type { TrackingAlertRecord } from '../types/alert.types'
import type { TrackingTrip } from '../types/tracking.types'
import { ListPageSkeleton } from '../components/shared/ListPageSkeleton'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'

const PAGE_SIZE = 20

// ─── helpers (list-page only) ─────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const STATIONARY_STATUSES = new Set([
  'At Checkpoint', 'Idle', 'Stopped', 'At Pickup', 'At Destination', 'Unloading', 'Loading',
])

function getDwellMinutes(trip: TrackingTrip, gf: TrackingGeofence): number | null {
  if (!trip.currentLocation) return null
  const distanceM = haversineKm(trip.currentLocation.latitude, trip.currentLocation.longitude, gf.latitude, gf.longitude) * 1000
  if (distanceM > gf.radiusMeters) return null
  if (trip.idleMinutes != null && trip.idleMinutes > 0) return trip.idleMinutes
  if (STATIONARY_STATUSES.has(trip.status))
    return Math.floor((Date.now() - new Date(trip.currentLocation.recordedAt).getTime()) / 60000)
  return null
}

function formatDwell(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function dwellClass(minutes: number): string {
  if (minutes >= 120) return 'bg-danger/10 text-danger border-danger/20'
  if (minutes >= 60) return 'bg-warning/10 text-warning border-warning/20'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

function getStaleCue(gf: TrackingGeofence, geofenceEvents: GeofenceEvent[]): string | null {
  if (gf.isActive) return null
  const zoneEvents = geofenceEvents.filter((e) => e.geofenceId === gf.id)
  if (zoneEvents.length === 0) return 'Stale · never triggered'
  const latest = zoneEvents.reduce((max, e) => (e.eventTime > max ? e.eventTime : max), zoneEvents[0].eventTime)
  const daysAgo = Math.floor((Date.now() - new Date(latest).getTime()) / 86400000)
  return daysAgo >= 7 ? `Stale · last seen ${daysAgo}d ago` : null
}

function getTodayThroughput(gf: TrackingGeofence, geofenceEvents: GeofenceEvent[]): number {
  const todayStr = new Date().toISOString().slice(0, 10)
  return geofenceEvents.filter(
    (e) => e.geofenceId === gf.id && e.eventType === 'GeofenceEntered' && e.eventTime.slice(0, 10) === todayStr
  ).length
}

function getDwellBreach(gf: TrackingGeofence, activeTrips: TrackingTrip[]): { count: number; worstMinutes: number } | null {
  if (!gf.dwellAlertMinutes) return null
  const breaches = activeTrips
    .filter((t) => !['Completed', 'Cancelled'].includes(t.status))
    .map((t) => getDwellMinutes(t, gf))
    .filter((d): d is number => d !== null && d >= gf.dwellAlertMinutes!)
  if (breaches.length === 0) return null
  return { count: breaches.length, worstMinutes: Math.max(...breaches) }
}

function getLinkedTrips(gf: TrackingGeofence, activeTrips: TrackingTrip[]): TrackingTrip[] {
  if (gf.linkedEntityType === 'TRIP') return activeTrips.filter((t) => t.id === gf.linkedEntityId)
  return []
}

function getOpenAlertsForGeofence(
  gf: TrackingGeofence,
  activeTrips: TrackingTrip[],
  alerts: TrackingAlertRecord[],
): TrackingAlertRecord[] {
  const tripIds = new Set(getLinkedTrips(gf, activeTrips).map((t) => t.id))
  return alerts.filter((a) => tripIds.has(a.tripId) && a.status !== 'Resolved')
}

function severityColor(severity: string) {
  if (severity === 'Critical') return 'bg-danger/10 text-danger border-danger/20'
  if (severity === 'High') return 'bg-orange-50 text-orange-600 border-orange-200'
  if (severity === 'Medium') return 'bg-warning/10 text-warning border-warning/20'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

// ─── kebab menu ──────────────────────────────────────────────────────────────

function KebabMenu({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-gray-400 hover:text-gray-700"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-gray-700 transition hover:bg-gray-50"
            onMouseDown={(e) => { e.preventDefault(); onDuplicate(); setOpen(false) }}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-danger transition hover:bg-danger/5"
            onMouseDown={(e) => { e.preventDefault(); onDelete(); setOpen(false) }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ─── enriched list ───────────────────────────────────────────────────────────

function GeofenceEnrichedList({
  geofences,
  activeTrips,
  alerts,
  geofenceEvents,
  selectedId,
  onSelect,
  onEdit,
  onToggle,
  onDelete,
  onDuplicate,
}: {
  geofences: TrackingGeofence[]
  activeTrips: TrackingTrip[]
  alerts: TrackingAlertRecord[]
  geofenceEvents: GeofenceEvent[]
  selectedId: string | null
  onSelect: (gf: TrackingGeofence) => void
  onEdit: (gf: TrackingGeofence) => void
  onToggle: (gf: TrackingGeofence) => void
  onDelete: (gf: TrackingGeofence) => void
  onDuplicate: (gf: TrackingGeofence) => void
}) {
  const typeColor: Record<string, string> = {
    Pickup: 'bg-blue-100 text-blue-700',
    Drop: 'bg-teal-100 text-teal-700',
    Warehouse: 'bg-indigo-100 text-indigo-700',
    Checkpoint: 'bg-purple-100 text-purple-700',
    'Restricted Zone': 'bg-danger/10 text-danger',
    Yard: 'bg-orange-100 text-orange-600',
    'Customer Site': 'bg-green-100 text-green-700',
    Custom: 'bg-gray-100 text-gray-600',
  }

  // Pre-compute whether any row has data for optional columns
  const hasAnyActiveTrips = geofences.some((gf) => getLinkedTrips(gf, activeTrips).filter((t) => !['Completed', 'Cancelled'].includes(t.status)).length > 0)
  const hasAnyDwell = geofences.some((gf) => {
    const linked = getLinkedTrips(gf, activeTrips).filter((t) => !['Completed', 'Cancelled'].includes(t.status))
    return linked.some((t) => getDwellMinutes(t, gf) !== null)
  })
  const hasAnyAlerts = geofences.some((gf) => getOpenAlertsForGeofence(gf, activeTrips, alerts).length > 0)

  return (
    <Card className="overflow-hidden">
      {/* Mobile cards */}
      <div className="space-y-2 p-3 md:hidden">
        {geofences.map((gf) => {
          const linked = getLinkedTrips(gf, activeTrips)
          const openAlerts = getOpenAlertsForGeofence(gf, activeTrips, alerts)
          const activeLinked = linked.filter((t) => !['Completed', 'Cancelled'].includes(t.status))
          const worstSeverity = openAlerts.reduce<string | null>((w, a) => {
            const order = ['Critical', 'High', 'Medium', 'Low']
            if (!w) return a.severity
            return order.indexOf(a.severity) < order.indexOf(w) ? a.severity : w
          }, null)
          const dwellTimes = activeLinked.map((t) => getDwellMinutes(t, gf)).filter((d): d is number => d !== null)
          const maxDwell = dwellTimes.length > 0 ? Math.max(...dwellTimes) : null
          const dwellBreach = getDwellBreach(gf, activeTrips)
          const todayCount = getTodayThroughput(gf, geofenceEvents)
          const staleCue = getStaleCue(gf, geofenceEvents)

          return (
            <div
              key={gf.id}
              className={`cursor-pointer rounded-xl border p-3 transition ${selectedId === gf.id ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}
              onClick={() => onSelect(gf)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {/* Name + type badge inline */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[14px] font-semibold text-text">{gf.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeColor[gf.type] ?? 'bg-gray-100 text-gray-500'}`}>{gf.type}</span>
                  </div>
                  {/* Route or entity sub-line */}
                  {gf.linkedEntityType === 'TRIP' && activeLinked[0] ? (
                    <p className="text-[11px] text-gray-400">{activeLinked[0].origin} → {activeLinked[0].destination}</p>
                  ) : (
                    <p className="text-[11px] text-gray-400">{gf.radiusMeters} m radius · {gf.linkedEntityId}</p>
                  )}
                  {/* Status chips row */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {staleCue && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-400">{staleCue}</span>}
                    {worstSeverity && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${severityColor(worstSeverity)}`}>{worstSeverity}</span>}
                    {maxDwell !== null && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${dwellClass(maxDwell)}`}>⏱ {formatDwell(maxDwell)}</span>}
                    {dwellBreach && <span className="rounded-full border border-danger/20 bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">⚠ Dwell exceeded</span>}
                    {todayCount > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{todayCount} today</span>}
                  </div>
                </div>

                {/* Right: toggle + kebab */}
                <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Active toggle */}
                  <button
                    type="button"
                    title={gf.isActive ? 'Deactivate zone' : 'Activate zone'}
                    onClick={() => onToggle(gf)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${gf.isActive ? 'bg-success' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${gf.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  {/* Edit */}
                  <Button size="sm" variant="outline" onClick={() => onEdit(gf)}>Edit</Button>
                  {/* Kebab */}
                  <KebabMenu
                    onDuplicate={() => onDuplicate(gf)}
                    onDelete={() => onDelete(gf)}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-500">Zone</th>
              {hasAnyActiveTrips && <th className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-500">Active Trips</th>}
              {hasAnyDwell && <th className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-500">Dwell</th>}
              {hasAnyAlerts && <th className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-500">Alerts</th>}
              <th className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-500">Active</th>
              <th className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {geofences.map((gf) => {
              const linked = getLinkedTrips(gf, activeTrips)
              const openAlerts = getOpenAlertsForGeofence(gf, activeTrips, alerts)
              const activeLinked = linked.filter((t) => !['Completed', 'Cancelled'].includes(t.status))
              const worstSeverity = openAlerts.reduce<string | null>((w, a) => {
                const order = ['Critical', 'High', 'Medium', 'Low']
                if (!w) return a.severity
                return order.indexOf(a.severity) < order.indexOf(w) ? a.severity : w
              }, null)
              const dwellTimes = activeLinked.map((t) => getDwellMinutes(t, gf)).filter((d): d is number => d !== null)
              const maxDwell = dwellTimes.length > 0 ? Math.max(...dwellTimes) : null
              const dwellBreach = getDwellBreach(gf, activeTrips)
              const todayCount = getTodayThroughput(gf, geofenceEvents)
              const staleCue = getStaleCue(gf, geofenceEvents)
              const isSelected = selectedId === gf.id

              return (
                <tr
                  key={gf.id}
                  className={`cursor-pointer transition hover:bg-gray-50 ${isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''}`}
                  onClick={() => onSelect(gf)}
                >
                  {/* Zone cell — name + type badge + meta inline */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold text-text">{gf.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeColor[gf.type] ?? 'bg-gray-100 text-gray-500'}`}>{gf.type}</span>
                    </div>
                    {gf.linkedEntityType === 'TRIP' && activeLinked[0] ? (
                      <p className="text-[11px] text-gray-400">{activeLinked[0].origin} → {activeLinked[0].destination} · {gf.radiusMeters} m</p>
                    ) : (
                      <p className="text-[11px] text-gray-400">{gf.linkedEntityId} · {gf.radiusMeters} m radius</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {staleCue && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-400">{staleCue}</span>}
                      {dwellBreach && (
                        <span className="rounded-full border border-danger/20 bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger" title={`${dwellBreach.count} vehicle(s) exceeded dwell threshold`}>
                          ⚠ Dwell exceeded
                        </span>
                      )}
                      {todayCount > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{todayCount} entr{todayCount === 1 ? 'y' : 'ies'} today</span>}
                    </div>
                  </td>

                  {/* Optional: Active Trips */}
                  {hasAnyActiveTrips && (
                    <td className="px-4 py-3">
                      {activeLinked.length > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-bold text-primary">
                          {activeLinked.length} trip{activeLinked.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-[12px] text-gray-300">—</span>
                      )}
                    </td>
                  )}

                  {/* Optional: Dwell */}
                  {hasAnyDwell && (
                    <td className="px-4 py-3">
                      {maxDwell !== null ? (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-bold ${dwellClass(maxDwell)}`}>
                          ⏱ {formatDwell(maxDwell)}
                        </span>
                      ) : (
                        <span className="text-[12px] text-gray-300">—</span>
                      )}
                    </td>
                  )}

                  {/* Optional: Alerts */}
                  {hasAnyAlerts && (
                    <td className="px-4 py-3">
                      {openAlerts.length > 0 ? (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-bold ${severityColor(worstSeverity ?? 'Low')}`}>
                          {openAlerts.length} · {worstSeverity}
                        </span>
                      ) : (
                        <span className="text-[12px] text-gray-300">—</span>
                      )}
                    </td>
                  )}

                  {/* Active toggle */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      title={gf.isActive ? 'Deactivate zone' : 'Activate zone'}
                      onClick={() => onToggle(gf)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${gf.isActive ? 'bg-success' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${gf.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </td>

                  {/* Actions: Edit + ⋮ kebab */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => onEdit(gf)}>Edit</Button>
                      <KebabMenu
                        onDuplicate={() => onDuplicate(gf)}
                        onDelete={() => onDelete(gf)}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ─── grouped list ────────────────────────────────────────────────────────────

function GroupedGeofenceList(props: Parameters<typeof GeofenceEnrichedList>[0]) {
  const { geofences } = props
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const grouped = useMemo(() => {
    const map = new Map<string, TrackingGeofence[]>()
    for (const gf of geofences) {
      const key = gf.group?.trim() || 'Ungrouped'
      const existing = map.get(key) ?? []
      map.set(key, [...existing, gf])
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'Ungrouped') return 1
      if (b === 'Ungrouped') return -1
      return a.localeCompare(b)
    })
  }, [geofences])

  return (
    <div className="space-y-3">
      {grouped.map(([groupName, groupZones]) => {
        const isCollapsed = collapsed[groupName] ?? false
        return (
          <div key={groupName} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => ({ ...prev, [groupName]: !isCollapsed }))}
              className="flex w-full items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-left transition hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-text">{groupName}</span>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                  {groupZones.length} zone{groupZones.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-[12px] text-gray-400">{isCollapsed ? '▸' : '▾'}</span>
            </button>
            {!isCollapsed && (
              <GeofenceEnrichedList {...props} geofences={groupZones} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── filter popover ──────────────────────────────────────────────────────────

function FilterPopover({
  typeFilter,
  statusFilter,
  alertFilter,
  onTypeChange,
  onStatusChange,
  onAlertChange,
  onReset,
}: {
  typeFilter: TrackingGeofence['type'] | 'All'
  statusFilter: 'All' | 'Active' | 'Disabled'
  alertFilter: 'All' | 'WithAlerts' | 'Clean'
  onTypeChange: (v: TrackingGeofence['type'] | 'All') => void
  onStatusChange: (v: 'All' | 'Active' | 'Disabled') => void
  onAlertChange: (v: 'All' | 'WithAlerts' | 'Clean') => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const activeCount = [typeFilter !== 'All', statusFilter !== 'All', alertFilter !== 'All'].filter(Boolean).length

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectClass = 'h-8 w-full rounded-lg border border-gray-300 px-2.5 text-[13px] text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white'

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition ${
          activeCount > 0 || open
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
        }`}
      >
        <span>Filter</span>
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
        <span className="text-[11px]">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-extrabold uppercase tracking-wide text-gray-500">Filters</p>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => { onReset(); setOpen(false) }}
                className="text-[12px] font-semibold text-primary hover:underline"
              >
                Reset all
              </button>
            )}
          </div>

          <div className="mt-3 space-y-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Zone type</label>
              <select
                className={selectClass + ' mt-1'}
                onChange={(e) => onTypeChange(e.target.value as TrackingGeofence['type'] | 'All')}
                value={typeFilter}
              >
                {['All', 'Pickup', 'Drop', 'Warehouse', 'Yard', 'Customer Site', 'Checkpoint', 'Restricted Zone', 'Custom'].map((item) => (
                  <option key={item} value={item}>{item === 'All' ? 'All types' : item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Status</label>
              <select
                className={selectClass + ' mt-1'}
                onChange={(e) => onStatusChange(e.target.value as 'All' | 'Active' | 'Disabled')}
                value={statusFilter}
              >
                <option value="All">All statuses</option>
                <option value="Active">Active only</option>
                <option value="Disabled">Inactive only</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Alerts</label>
              <select
                className={selectClass + ' mt-1'}
                onChange={(e) => onAlertChange(e.target.value as 'All' | 'WithAlerts' | 'Clean')}
                value={alertFilter}
              >
                <option value="All">All zones</option>
                <option value="WithAlerts">With open alerts</option>
                <option value="Clean">No alerts</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export function GeofenceManagementPage() {
  const { geofences, activeTrips, alerts, geofenceEvents, loading, error, deleteGeofence, toggleGeofenceStatus } = useTrackingStore()
  const { scopedPath } = useTrackTraceRouting()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [typeFilter, setTypeFilter] = useState<TrackingGeofence['type'] | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Disabled'>('All')
  const [alertFilter, setAlertFilter] = useState<'All' | 'WithAlerts' | 'Clean'>('All')
  const [groupBy, setGroupBy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<TrackingGeofence | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const enriched = useMemo(() => geofences.map((gf) => ({
    gf,
    linkedTrips: getLinkedTrips(gf, activeTrips),
    openAlerts: getOpenAlertsForGeofence(gf, activeTrips, alerts),
  })), [geofences, activeTrips, alerts])

  const filteredGeofences = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched
      .filter(({ gf, openAlerts }) => {
        const matchesSearch = !q || gf.name.toLowerCase().includes(q) || gf.linkedEntityId.toLowerCase().includes(q)
        const matchesType = typeFilter === 'All' || gf.type === typeFilter
        const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' && gf.isActive) || (statusFilter === 'Disabled' && !gf.isActive)
        const matchesAlert = alertFilter === 'All' || (alertFilter === 'WithAlerts' && openAlerts.length > 0) || (alertFilter === 'Clean' && openAlerts.length === 0)
        return matchesSearch && matchesType && matchesStatus && matchesAlert
      })
      .map(({ gf }) => gf)
  }, [enriched, search, statusFilter, typeFilter, alertFilter])

  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(filteredGeofences.length / PAGE_SIZE)
  const paginatedGeofences = filteredGeofences.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => { setPage(1) }, [search, typeFilter, statusFilter, alertFilter])

  const kpis = useMemo(() => {
    const total = geofences.length
    const active = geofences.filter((g) => g.isActive).length
    const zonesWithAlerts = enriched.filter(({ openAlerts }) => openAlerts.length > 0).length
    const tripsInScope = new Set(enriched.flatMap(({ linkedTrips }) => linkedTrips.filter((t) => !['Completed', 'Cancelled'].includes(t.status)).map((t) => t.id))).size
    const totalOpenAlerts = enriched.reduce((sum, { openAlerts }) => sum + openAlerts.length, 0)
    return { total, active, zonesWithAlerts, tripsInScope, totalOpenAlerts }
  }, [enriched, geofences])

  if (loading) return <ListPageSkeleton />
  if (error) return <EmptyPlaceholder title="Geofences unavailable" description={error} />

  return (
    <TrackTraceAccessBoundary page="geofences">
      {/* Delete confirm modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h3 className="text-[14px] font-semibold text-text">Delete {pendingDelete.name}?</h3>
            {(() => {
              const affected = getLinkedTrips(pendingDelete, activeTrips).filter(
                (t) => !['Completed', 'Cancelled'].includes(t.status)
              )
              return affected.length > 0 ? (
                <div className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] text-warning">
                  <span className="font-semibold">{affected.length} active trip{affected.length !== 1 ? 's are' : ' is'} linked</span> — they will stop receiving zone alerts immediately.
                </div>
              ) : null
            })()}
            <p className="mt-2 text-[13px] leading-5 text-gray-600">
              This will permanently remove the{' '}
              <span className="font-semibold">{pendingDelete.type.toLowerCase()}</span> zone. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const target = pendingDelete
                  setPendingDelete(null)
                  void deleteGeofence(target.id).catch(() => {
                    setDeleteError(`"${target.name}" could not be deleted. Please try again.`)
                    setTimeout(() => setDeleteError(null), 4000)
                  })
                }}
              >
                Delete geofence
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {deleteError && (
          <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-2.5 text-[12px] font-medium text-danger">
            {deleteError}
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Total Zones</p>
            <p className="mt-0.5 text-xl font-extrabold text-gray-900">{kpis.total}</p>
            <p className="text-[11px] text-gray-400">all configured</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Active Zones</p>
            <p className="mt-0.5 text-xl font-extrabold text-gray-900">{kpis.active}</p>
            <p className="text-[11px] text-gray-400">enabled</p>
          </div>
          <button
            type="button"
            onClick={() => setAlertFilter('WithAlerts')}
            className={`rounded-xl border px-4 py-3 shadow-sm text-left transition hover:ring-2 hover:ring-danger/20 ${
              kpis.zonesWithAlerts > 0 ? 'border-danger/30 bg-danger/5' : 'border-gray-200 bg-white'
            } ${alertFilter === 'WithAlerts' ? 'ring-2 ring-danger/20' : ''}`}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Zones w/ Alerts</p>
            <p className={`mt-0.5 text-xl font-extrabold ${kpis.zonesWithAlerts > 0 ? 'text-danger' : 'text-gray-900'}`}>{kpis.zonesWithAlerts}</p>
            <p className="text-[11px] text-gray-400">click to filter</p>
          </button>
          <div className={`rounded-xl border px-4 py-3 shadow-sm ${kpis.totalOpenAlerts > 0 ? 'border-danger/30 bg-danger/5' : 'border-gray-200 bg-white'}`}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Open Alerts</p>
            <p className={`mt-0.5 text-xl font-extrabold ${kpis.totalOpenAlerts > 0 ? 'text-danger' : 'text-gray-900'}`}>{kpis.totalOpenAlerts}</p>
            <p className="text-[11px] text-gray-400">across zones</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(scopedPath('/dispatch'))}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm text-left transition hover:ring-2 hover:ring-primary/20"
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Active Trips in Scope</p>
            <p className="mt-0.5 text-xl font-extrabold text-gray-900">{kpis.tripsInScope}</p>
            <p className="text-[11px] text-gray-400">view in dispatch</p>
          </button>
        </div>

        {/* Page header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-bold text-text">Geofences</h2>
            <p className="text-[12px] text-gray-400">
              {kpis.total} zone{kpis.total !== 1 ? 's' : ''} configured · {kpis.active} active
            </p>
          </div>
          <Button className="shrink-0" onClick={() => navigate(scopedPath('/geofences/new'))}>
            + Create geofence
          </Button>
        </div>

        {/* Filter bar */}
        <Card className="sticky top-14 z-10 border-gray-200 bg-white/95 px-4 py-2.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                id="geofence-search"
                className="h-9 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-[13px] text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search zones, routes, or vehicles…"
                value={search}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            <FilterPopover
              typeFilter={typeFilter}
              statusFilter={statusFilter}
              alertFilter={alertFilter}
              onTypeChange={setTypeFilter}
              onStatusChange={setStatusFilter}
              onAlertChange={setAlertFilter}
              onReset={() => { setTypeFilter('All'); setStatusFilter('All'); setAlertFilter('All') }}
            />
            <button
              type="button"
              title={groupBy ? 'Ungroup zones' : 'Group by corridor'}
              onClick={() => setGroupBy((v) => !v)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-[15px] transition ${
                groupBy ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 bg-white text-gray-500 hover:border-gray-400'
              }`}
            >
              ⊞
            </button>
          </div>
        </Card>

        {/* List */}
        {filteredGeofences.length === 0 ? (
          <EmptyPlaceholder
            title={geofences.length === 0 ? 'No geofences created yet' : 'No geofences match the current filters'}
            description={
              geofences.length === 0
                ? 'Create your first geofence to start monitoring trips, vehicles, and checkpoints.'
                : 'Try adjusting the search term or filters.'
            }
            action={
              geofences.length === 0 ? (
                <Button size="sm" onClick={() => navigate(scopedPath('/geofences/new'))}>Create first geofence</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => { setSearch(''); setTypeFilter('All'); setStatusFilter('All'); setAlertFilter('All') }}>
                  Reset filters
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {groupBy ? (
              <GroupedGeofenceList
                geofences={filteredGeofences}
                activeTrips={activeTrips}
                alerts={alerts}
                geofenceEvents={geofenceEvents}
                selectedId={null}
                onSelect={(gf) => navigate(scopedPath(`/geofences/${gf.id}`))}
                onEdit={(gf) => navigate(scopedPath(`/geofences/${gf.id}/edit`))}
                onToggle={(gf) => void toggleGeofenceStatus(gf.id, !gf.isActive)}
                onDelete={setPendingDelete}
                onDuplicate={(gf) => navigate(scopedPath('/geofences/new') + `?duplicateFrom=${gf.id}`)}
              />
            ) : (
              <>
                <GeofenceEnrichedList
                  geofences={paginatedGeofences}
                  activeTrips={activeTrips}
                  alerts={alerts}
                  geofenceEvents={geofenceEvents}
                  selectedId={null}
                  onSelect={(gf) => navigate(scopedPath(`/geofences/${gf.id}`))}
                  onEdit={(gf) => navigate(scopedPath(`/geofences/${gf.id}/edit`))}
                  onToggle={(gf) => void toggleGeofenceStatus(gf.id, !gf.isActive)}
                  onDelete={setPendingDelete}
                  onDuplicate={(gf) => navigate(scopedPath('/geofences/new') + `?duplicateFrom=${gf.id}`)}
                />
                {totalPages > 1 && (
                  <PaginationStrip
                    page={page}
                    totalPages={totalPages}
                    totalItems={filteredGeofences.length}
                    pageSize={PAGE_SIZE}
                    onPrev={() => setPage((p) => p - 1)}
                    onNext={() => setPage((p) => p + 1)}
                    itemLabel="zones"
                  />
                )}
              </>
            )}
          </div>
        )}

        {kpis.zonesWithAlerts > 0 && alertFilter !== 'WithAlerts' && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
            <p className="text-[13px] font-semibold text-warning">
              {kpis.zonesWithAlerts} zone{kpis.zonesWithAlerts !== 1 ? 's have' : ' has'} open alerts —{' '}
              <button
                className="underline underline-offset-2 hover:text-warning/80"
                onClick={() => setAlertFilter('WithAlerts')}
              >
                filter to see them
              </button>
            </p>
          </div>
        )}
      </div>
    </TrackTraceAccessBoundary>
  )
}
