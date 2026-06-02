import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Navigation,
  Radio,
  Shield,
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

function formatAlertTime(isoString: string) {
  const date = new Date(isoString)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (date >= todayStart) return `Today ${time}`
  if (date >= yesterdayStart) return `Yesterday ${time}`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + time
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

  const openAlerts = useMemo(() => alerts.filter((a) => a.status !== 'Resolved').slice(0, 7), [alerts])

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
  const tableTrips = activeTripRows.slice(0, 7)

  return (
    <div className="space-y-6">

      {/* ── KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {/* D1: Total active — navigates to /trips */}
        <button
          type="button"
          onClick={() => navigate(scopedPath('/trips'))}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm text-left transition hover:bg-gray-50 hover:ring-2 hover:ring-primary/20 cursor-pointer"
        >
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
        </button>

        {/* D1: In transit — navigates to /trips?status=In+Transit */}
        <button
          type="button"
          onClick={() => navigate(scopedPath('/trips') + '?status=In+Transit')}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm text-left transition hover:bg-gray-50 hover:ring-2 hover:ring-emerald-300/50 cursor-pointer"
        >
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
              style={{ width: dashboardSummary.totalActiveTrips > 0 ? `${Math.round((dashboardSummary.inTransitTrips / dashboardSummary.totalActiveTrips) * 100)}%` : '0%' }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {dashboardSummary.totalActiveTrips
              ? Math.round((dashboardSummary.inTransitTrips / dashboardSummary.totalActiveTrips) * 100)
              : 0}% of active fleet
          </p>
        </button>

        {/* D1: Delayed — navigates to /trips?delay=Delayed */}
        <button
          type="button"
          onClick={() => navigate(scopedPath('/trips') + '?delay=Delayed')}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm text-left transition hover:bg-gray-50 hover:ring-2 hover:ring-red-200 cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Delayed</p>
              <p className={`mt-1.5 text-2xl font-bold ${dashboardSummary.delayedTrips > 0 ? 'text-red-600' : 'text-text'}`}>
                {dashboardSummary.delayedTrips}
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
        </button>

        {/* D1: Open Alerts — navigates to /alerts */}
        <button
          type="button"
          onClick={() => navigate(scopedPath('/alerts'))}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm text-left transition hover:bg-gray-50 hover:ring-2 hover:ring-red-200 cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Open Alerts</p>
              <p className={`mt-1.5 text-2xl font-bold ${dashboardSummary.openAlerts > 0 ? 'text-red-600' : 'text-text'}`}>
                {dashboardSummary.openAlerts}
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
        </button>
      </div>

      {/* ── Alert severity strip ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
        <span className={`mr-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${connectionLive ? 'text-emerald-600' : 'text-gray-400'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connectionLive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          {connectionLive ? 'Live' : socketConnectionState}
        </span>
        <Link to={`${scopedPath('/alerts')}?severity=Critical`} className={`rounded-full px-3 py-1 text-xs font-bold transition hover:opacity-80 ${alertSeverityCounts.Critical > 0 ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400 pointer-events-none'}`}>
          {alertSeverityCounts.Critical} Critical
        </Link>
        <Link to={`${scopedPath('/alerts')}?severity=High`} className={`rounded-full px-3 py-1 text-xs font-bold transition hover:opacity-80 ${alertSeverityCounts.High > 0 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400 pointer-events-none'}`}>
          {alertSeverityCounts.High} High
        </Link>
        <Link to={`${scopedPath('/alerts')}?severity=Medium`} className={`rounded-full px-3 py-1 text-xs font-bold transition hover:opacity-80 ${alertSeverityCounts.Medium > 0 ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-400 pointer-events-none'}`}>
          {alertSeverityCounts.Medium} Medium
        </Link>
        <Link to={`${scopedPath('/alerts')}?severity=Low`} className={`rounded-full px-3 py-1 text-xs font-bold transition hover:opacity-80 ${alertSeverityCounts.Low > 0 ? 'bg-blue-400 text-white' : 'bg-gray-100 text-gray-400 pointer-events-none'}`}>
          {alertSeverityCounts.Low} Low
        </Link>
        <span className="ml-auto text-xs text-gray-400">Last updated {lastUpdatedLabel}</span>
      </div>

      {/* ── Main content: trips table + alert center ──────────── */}
      <div className="grid gap-6 xl:grid-cols-[1fr,360px] xl:items-start">

        {/* Active trips table */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" style={{ maxHeight: 520 }}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-text">Active Trips</h2>
              <p className="text-xs text-gray-500">Live updates</p>
            </div>
            <Link
              to={scopedPath('/dispatch')}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Go to Dispatch <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {tableTrips.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">No trips in dispatch right now.</div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="min-w-full">
                <thead>
                  <tr className="sticky top-0 border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-400">Trip ID</th>
                    <th className="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-400">Route</th>
                    <th className="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-400">Vehicle</th>
                    <th className="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-400">Tracking</th>
                    <th className="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-400">ETA / Status</th>
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
                        className="group cursor-pointer transition hover:bg-gray-50"
                        onClick={() => navigate(`${scopedPath('/trips')}/${trip.id}`)}
                      >
                        {/* Trip ID */}
                        <td className="px-4 py-2.5">
                          <p className="font-mono text-xs font-semibold text-text">{trip.bookingId}</p>
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

                        {/* Tracking devices */}
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {!hasGps && !hasSim && !hasApp ? (
                              <span className="rounded px-1.5 py-0.5 text-xs font-bold uppercase bg-gray-100 text-gray-500">
                                Manual
                              </span>
                            ) : (
                              <>
                                {hasGps && sourceTag('GPS', !isOffline, 'bg-emerald-100 text-emerald-700')}
                                {hasSim  && sourceTag('SIM', !isOffline, 'bg-blue-100 text-blue-700')}
                                {hasApp  && sourceTag('App', !isOffline, 'bg-violet-100 text-violet-700')}
                              </>
                            )}
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

                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTripRows.length > 7 && (
            <div className="border-t border-gray-100 px-5 py-3">
              <Link to={scopedPath('/trips')} className="text-xs font-semibold text-primary hover:underline">
                + {activeTripRows.length - 7} more trips — view all
              </Link>
            </div>
          )}
        </div>

        {/* Alert center */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" style={{ maxHeight: 520 }}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text">Alerts</h2>
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
                  <div
                    key={alert.id}
                    className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-primary/[0.04]"
                    onClick={() => navigate(`${scopedPath('/alerts')}?alert=${alert.id}`)}
                  >
                    <div className={`mt-1 h-full w-1 shrink-0 self-stretch rounded-full ${style.bar}`} style={{ minHeight: 32 }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style.badge}`}>
                          {alert.severity}
                        </span>
                        <span className="shrink-0 text-xs text-gray-400">
                          {formatAlertTime(alert.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-bold text-text leading-snug">{alert.type}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed line-clamp-2">{alert.message}</p>
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{activeTrips.find((t) => t.id === alert.tripId)?.bookingId ?? alert.tripId}</span>
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-gray-300" />
                  </div>
                )
              })
            )}
          </div>

        </div>
      </div>

      {/* ── Quick links (D2: expanded to all pages) ───────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { to: scopedPath('/live-map'), icon: Navigation, label: 'Live Map', desc: 'Real-time positions', color: 'text-primary bg-primary/10', badge: null },
          { to: scopedPath('/alerts'), icon: AlertTriangle, label: 'Alerts', desc: null, color: 'text-red-600 bg-red-50', badge: dashboardSummary.openAlerts },
          { to: scopedPath('/dispatch'), icon: Truck, label: 'Dispatch', desc: 'Assign & dispatch', color: 'text-emerald-600 bg-emerald-50', badge: null },
          { to: scopedPath('/geofences'), icon: Shield, label: 'Geofences', desc: 'Zone management', color: 'text-indigo-600 bg-indigo-50', badge: null },
          { to: scopedPath('/route-performance'), icon: BarChart2, label: 'Route Perf.', desc: 'Corridor analytics', color: 'text-amber-600 bg-amber-50', badge: null },
        ].map(({ to, icon: Icon, label, desc, color, badge }) => (
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
              {badge !== null ? (
                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${badge > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                  {badge} open
                </span>
              ) : (
                <p className="truncate text-[11px] text-gray-500">{desc}</p>
              )}
            </div>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-gray-300" />
          </Link>
        ))}
      </div>

    </div>
  )
}
