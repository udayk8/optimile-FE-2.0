import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Radio,
  Truck,
  WifiOff,
} from 'lucide-react'
import { DashboardSkeleton } from '../components/shared/DashboardSkeleton'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { useTrackingStore } from '../store/trackingStore'
import type { TrackingAlert } from '../types/tracking.types'

// ── helpers ──────────────────────────────────────────────────────────────────

function sourceTag(label: string, active: boolean, color: string) {
  return (
    <span
      key={label}
      className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
        active ? color : 'bg-gray-100 text-gray-400 line-through'
      }`}
    >
      {label}
    </span>
  )
}

function etaLabel(delayMinutes: number, remainingKm: number) {
  if (remainingKm === 0) return { text: 'Arrived', cls: 'text-emerald-600' }
  if (delayMinutes > 60) return { text: `+${Math.round(delayMinutes / 60)}h delay`, cls: 'text-red-600 font-bold' }
  if (delayMinutes > 0) return { text: `+${delayMinutes}m`, cls: 'text-amber-600 font-semibold' }
  return { text: 'On time', cls: 'text-emerald-600' }
}

function alertSeverityStyle(severity: TrackingAlert['severity']) {
  switch (severity) {
    case 'Critical': return { bar: 'bg-red-500',    label: 'text-red-600',    badge: 'bg-red-100 text-red-700'    }
    case 'High':     return { bar: 'bg-orange-400', label: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' }
    case 'Medium':   return { bar: 'bg-amber-400',  label: 'text-amber-500',  badge: 'bg-amber-100 text-amber-700'  }
    default:         return { bar: 'bg-blue-400',   label: 'text-blue-500',   badge: 'bg-blue-100 text-blue-700'   }
  }
}

// ── component ─────────────────────────────────────────────────────────────────

export function TrackTraceDashboard() {
  const { scopedPath } = useTrackTraceRouting()
  const navigate = useNavigate()
  const {
    activeTrips,
    alerts,
    dashboardSummary,
    lastUpdatedAt,
    loading,
    error,
    socketConnectionState,
  } = useTrackingStore()

  const activeTripRows = useMemo(
    () => activeTrips.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled'),
    [activeTrips],
  )

  const alertSeverityCounts = useMemo(
    () => alerts.reduce(
      (acc, a) => { if (a.status !== 'Resolved') acc[a.severity] += 1; return acc },
      { Critical: 0, High: 0, Medium: 0, Low: 0 },
    ),
    [alerts],
  )

  const openAlerts = useMemo(() => alerts.filter((a) => a.status !== 'Resolved').slice(0, 6), [alerts])

  const tripAlertCounts = useMemo(
    () => alerts.reduce<Record<string, number>>((acc, a) => {
      if (a.status !== 'Resolved') acc[a.tripId] = (acc[a.tripId] ?? 0) + 1
      return acc
    }, {}),
    [alerts],
  )

  const connectionLive = socketConnectionState === 'Connected'
  const lastUpdatedLabel = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—'

  if (loading) return <DashboardSkeleton />
  if (error || !dashboardSummary) {
    return <EmptyPlaceholder title="Dashboard unavailable" description={error ?? 'Dashboard data could not be loaded.'} />
  }

  const onTimePct = dashboardSummary.onTimePercentage ?? 0
  const tableTrips = activeTripRows.slice(0, 8)

  return (
    <div className="space-y-6">

      {/* ── KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {/* Total active */}
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Active Trips</p>
              <p className="mt-1.5 text-2xl font-bold text-text">{dashboardSummary.totalActiveTrips}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Truck className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-3 h-1 w-full rounded-full bg-gray-100">
            <div className="h-1 rounded-full bg-primary" style={{ width: `${Math.min(100, onTimePct)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">{onTimePct}% on time</p>
        </div>

        {/* In transit */}
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">In Transit</p>
              <p className="mt-1.5 text-2xl font-bold text-emerald-600">{dashboardSummary.inTransitTrips}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3 h-1 w-full rounded-full bg-gray-100">
            <div
              className="h-1 rounded-full bg-emerald-500"
              style={{ width: dashboardSummary.totalActiveTrips ? `${(dashboardSummary.inTransitTrips / dashboardSummary.totalActiveTrips) * 100}%` : '0%' }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {dashboardSummary.totalActiveTrips
              ? Math.round((dashboardSummary.inTransitTrips / dashboardSummary.totalActiveTrips) * 100)
              : 0}% of active fleet
          </p>
        </div>

        {/* Delayed */}
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Delayed</p>
              <p className={`mt-1.5 text-2xl font-bold ${dashboardSummary.delayedTrips > 0 ? 'text-red-600' : 'text-text'}`}>
                {String(dashboardSummary.delayedTrips).padStart(2, '0')}
              </p>
            </div>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${dashboardSummary.delayedTrips > 0 ? 'bg-red-50' : 'bg-gray-100'}`}>
              <AlertTriangle className={`h-4 w-4 ${dashboardSummary.delayedTrips > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-gray-500">
            {dashboardSummary.delayedTrips > 0 ? 'Avg delay: ' : 'No delays — '}
            {dashboardSummary.delayedTrips > 0
              ? `${dashboardSummary.averageEtaDelay} min`
              : 'all on schedule'}
          </p>
        </div>

        {/* Alerts / offline */}
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Open Alerts</p>
              <p className={`mt-1.5 text-2xl font-bold ${dashboardSummary.openAlerts > 0 ? 'text-red-600' : 'text-text'}`}>
                {String(dashboardSummary.openAlerts).padStart(2, '0')}
              </p>
            </div>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${dashboardSummary.openAlerts > 0 ? 'bg-red-50' : 'bg-gray-100'}`}>
              <Radio className={`h-4 w-4 ${dashboardSummary.openAlerts > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs font-semibold">
            <span className="text-red-600">{alertSeverityCounts.Critical} critical</span>
            <span className="text-orange-500">{alertSeverityCounts.High} high</span>
            <span className="inline-flex items-center gap-1 text-gray-500">
              <WifiOff className="h-3 w-3" />{dashboardSummary.offlineVehicles} offline
            </span>
          </div>
        </div>
      </div>

      {/* ── Alert severity strip ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
        <span className={`mr-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${connectionLive ? 'text-emerald-600' : 'text-gray-400'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connectionLive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          {connectionLive ? 'Live' : socketConnectionState}
        </span>
        <Link to={`${scopedPath('/alerts')}?severity=Critical`} className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white transition hover:opacity-80">
          {alertSeverityCounts.Critical} Critical
        </Link>
        <Link to={`${scopedPath('/alerts')}?severity=High`} className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white transition hover:opacity-80">
          {alertSeverityCounts.High} High
        </Link>
        <Link to={`${scopedPath('/alerts')}?severity=Medium`} className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-white transition hover:opacity-80">
          {alertSeverityCounts.Medium} Medium
        </Link>
        <Link to={`${scopedPath('/alerts')}?severity=Low`} className="rounded-full bg-blue-400 px-3 py-1 text-xs font-bold text-white transition hover:opacity-80">
          {alertSeverityCounts.Low} Low
        </Link>
        <span className="ml-auto text-xs text-gray-400">Last updated {lastUpdatedLabel}</span>
      </div>

      {/* ── Main content: trips table + alert center ──────────── */}
      <div className="grid gap-6 xl:grid-cols-[1fr,360px]">

        {/* Active trips table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-text">Active Trips</h2>
              <p className="text-xs text-gray-500">Live updates · {tableTrips.length} of {activeTripRows.length} trips shown</p>
            </div>
            <Link
              to={scopedPath('/dispatch')}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {tableTrips.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">No active trips right now.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-400">Trip ID</th>
                    <th className="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-400">Route</th>
                    <th className="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-400">Vehicle</th>
                    <th className="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-400">Source</th>
                    <th className="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-400">ETA / Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableTrips.map((trip) => {
                    const alertCount = tripAlertCounts[trip.id] ?? 0
                    const eta = etaLabel(trip.delayMinutes, trip.remainingDistanceKm)
                    const progress = trip.distanceCoveredKm + trip.remainingDistanceKm > 0
                      ? Math.round((trip.distanceCoveredKm / (trip.distanceCoveredKm + trip.remainingDistanceKm)) * 100)
                      : 0
                    const isOffline = trip.isOffline
                    const hasGps  = trip.primarySource === 'GPS_DEVICE' || trip.activeSource === 'GPS_DEVICE'
                    const hasSim  = trip.primarySource === 'FASTAG' || trip.activeSource === 'FASTAG'
                    const hasApp  = trip.primarySource === 'DRIVER_APP' || trip.activeSource === 'DRIVER_APP'

                    return (
                      <tr
                        key={trip.id}
                        className="group cursor-pointer transition hover:bg-primary/[0.03]"
                        onClick={() => navigate(scopedPath('/dispatch'))}
                      >
                        {/* Trip ID */}
                        <td className="px-4 py-2.5">
                          <p className="font-mono text-xs font-semibold text-text">{trip.id}</p>
                          {alertCount > 0 && (
                            <span className="mt-0.5 inline-block rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                              {alertCount} alert{alertCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </td>

                        {/* Route */}
                        <td className="px-4 py-2.5">
                          <p className="text-xs font-semibold text-text">{trip.origin}</p>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[140px]">{trip.destination}</span>
                          </div>
                        </td>

                        {/* Vehicle + driver */}
                        <td className="px-4 py-2.5">
                          <p className="font-mono text-xs font-semibold text-text">{trip.vehicleNumber || '—'}</p>
                          <p className="text-[11px] text-gray-500 truncate max-w-[120px]">{trip.driverName || 'Unassigned'}</p>
                        </td>

                        {/* Source health tags */}
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {sourceTag('GPS', hasGps && !isOffline, 'bg-emerald-100 text-emerald-700')}
                            {sourceTag('SIM', hasSim && !isOffline, 'bg-blue-100 text-blue-700')}
                            {sourceTag('App', hasApp && !isOffline, 'bg-violet-100 text-violet-700')}
                            {isOffline && (
                              <span className="rounded px-1.5 py-0.5 text-xs font-bold uppercase bg-red-100 text-red-600">
                                Offline
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ETA + progress */}
                        <td className="px-4 py-2.5">
                          <p className={`text-xs font-bold ${eta.cls}`}>{eta.text}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1 w-20 rounded-full bg-gray-100">
                              <div
                                className={`h-1 rounded-full transition-all ${trip.delayMinutes > 0 ? 'bg-red-400' : 'bg-emerald-500'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-gray-400">{progress}%</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-gray-400">{trip.remainingDistanceKm} km left</p>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-2.5 text-right">
                          <Link
                            to={`${scopedPath('/trips')}/${trip.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 opacity-0 transition group-hover:opacity-100 hover:border-primary hover:text-primary"
                          >
                            View <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTripRows.length > 8 && (
            <div className="border-t border-gray-100 px-5 py-3">
              <Link to={scopedPath('/trips')} className="text-xs font-semibold text-primary hover:underline">
                + {activeTripRows.length - 8} more trips — view all
              </Link>
            </div>
          )}
        </div>

        {/* Alert center */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text">Alert Center</h2>
              {dashboardSummary.openAlerts > 0 && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                  {dashboardSummary.openAlerts}
                </span>
              )}
            </div>
            <Link
              to={scopedPath('/alerts')}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              All alerts <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
            {openAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <p className="text-sm font-semibold text-gray-700">All clear</p>
                <p className="text-xs text-gray-400">No open alerts right now.</p>
              </div>
            ) : (
              openAlerts.map((alert) => {
                const style = alertSeverityStyle(alert.severity)
                return (
                  <div key={alert.id} className="flex gap-3 px-4 py-4 transition hover:bg-gray-50">
                    <div className={`mt-1 h-full w-1 shrink-0 self-stretch rounded-full ${style.bar}`} style={{ minHeight: 32 }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style.badge}`}>
                          {alert.severity}
                        </span>
                        <span className="shrink-0 text-xs text-gray-400">
                          {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-bold text-text leading-snug">{alert.type}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed line-clamp-2">{alert.message}</p>
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{alert.tripId}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Quick stats footer */}
          <div className="border-t border-gray-100 px-5 py-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-bold text-text">{dashboardSummary.idleVehicles}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Idle</p>
              </div>
              <div>
                <p className="text-sm font-bold text-red-600">{dashboardSummary.offlineVehicles}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Offline</p>
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-600">{onTimePct}%</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">On Time</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick links ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { to: scopedPath('/live-map'), icon: Navigation, label: 'Live Map', desc: 'Real-time vehicle positions', color: 'text-primary bg-primary/10' },
          { to: scopedPath('/alerts'), icon: AlertTriangle, label: 'Alerts', desc: `${dashboardSummary.openAlerts} open`, color: 'text-red-600 bg-red-50' },
          { to: scopedPath('/dispatch'), icon: Truck, label: 'Dispatch', desc: 'Assign & dispatch trips', color: 'text-emerald-600 bg-emerald-50' },
          { to: scopedPath('/analytics'), icon: Clock, label: 'Analytics', desc: 'KPI & delay trends', color: 'text-violet-600 bg-violet-50' },
        ].map(({ to, icon: Icon, label, desc, color }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition hover:border-primary/30 hover:shadow-md"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-text">{label}</p>
              <p className="truncate text-[11px] text-gray-500">{desc}</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-gray-300" />
          </Link>
        ))}
      </div>

    </div>
  )
}
