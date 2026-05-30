import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  GaugeCircle,
  Info,
  LocateFixed,
  LogOut,
  Map,
  Menu,
  Route,
  Send,
  X,
} from 'lucide-react'

import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { OptimileLogo, useAuth } from '@shared-auth'
import { TrackTraceAccessBoundary } from '@track-trace/components/TrackTraceAccessBoundary'
import { useTrackTraceAccess } from '@track-trace/hooks/useTrackTraceAccess'
import { useTrackTraceRouting } from '@track-trace/hooks/useTrackTraceRouting'
import { useTrackingStore } from '@track-trace/store/trackingStore'
import { useTrackTraceEmbedded } from '@track-trace/app/embedded-context'
import type { TrackTraceFeatureKey, TrackTracePageKey } from '@track-trace/types/access'
import type { AlertSeverity } from '@track-trace/types/tracking.types'

type NavItem = {
  to: string
  label: string
  description: string
  icon: typeof GaugeCircle
  page: TrackTracePageKey
  feature?: TrackTraceFeatureKey
}

type NavSection = {
  collapsible?: boolean
  id: string
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        description: 'Summary metrics, active trips preview, alerts, and map snapshot',
        icon: GaugeCircle,
        page: 'dashboard',
      },
    ],
  },
  {
    collapsible: true,
    id: 'tracking',
    label: 'Tracking',
    items: [
      {
        to: '/live-map',
        label: 'Live Map',
        description: 'Live markers, route lines, and selected trip side context',
        icon: Map,
        page: 'live-map',
      },
    ],
  },
  {
    collapsible: true,
    id: 'operations',
    label: 'Operations',
    items: [
      {
        to: '/dispatch',
        label: 'Dispatch',
        description: 'Create and assign trips to vehicles and drivers',
        icon: Send,
        page: 'dispatch',
      },
      {
        to: '/alerts',
        label: 'Alerts',
        description: 'Operational alerts for delay, offline, route deviation, and SOS',
        icon: BellRing,
        page: 'alerts',
      },
      {
        to: '/geofences',
        label: 'Geofences',
        description: 'Manage fence coverage for pickup, drop, customer sites, yards, and checkpoints',
        icon: LocateFixed,
        page: 'geofences',
        feature: 'tracking.geofences',
      },
    ],
  },
  {
    collapsible: true,
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      {
        to: '/route-performance',
        label: 'Route Performance',
        description: 'Lane efficiency, distance variance, and delay corridor insights',
        icon: Route,
        page: 'route-performance',
        feature: 'tracking.routePerformance',
      },
    ],
  },
]

const pageMeta: Record<TrackTracePageKey, { label: string; description: string }> = {
  dashboard: { label: 'Dashboard', description: '' },
  shipments: { label: 'Active Trips', description: '' },
  'shipment-detail': { label: 'Trip Detail', description: '' },
  replay: { label: 'Trip Replay', description: '' },
  'customer-preview': { label: 'Customer Preview', description: '' },
  analytics: { label: 'Analytics', description: '' },
  'route-performance': { label: 'Route Performance', description: '' },
  vehicles: { label: 'Active Trips', description: '' },
  'vehicle-detail': { label: 'Live Map', description: '' },
  'live-map': { label: 'Live Map', description: '' },
  'route-progress': { label: 'Live Map', description: '' },
  exceptions: { label: 'Alerts', description: '' },
  alerts: { label: 'Alerts', description: '' },
  pod: { label: 'Alerts', description: '' },
  'control-tower': { label: 'Dashboard', description: '' },
  geofences: { label: 'Geofences', description: '' },
  dispatch: { label: 'Dispatch', description: '' },
}

const SEV_ICON: Record<AlertSeverity, typeof AlertTriangle> = {
  Critical: AlertTriangle,
  High: AlertTriangle,
  Medium: Info,
  Low: Info,
}

const SEV_COLOR: Record<AlertSeverity, string> = {
  Critical: 'text-red-500',
  High: 'text-orange-400',
  Medium: 'text-amber-400',
  Low: 'text-blue-400',
}

function NotificationBell({ scopedPath }: { scopedPath: (to: string) => string }) {
  const navigate = useNavigate()
  const { alerts } = useTrackingStore()
  const [open, setOpen] = useState(false)
  const [cleared, setCleared] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  const notifications = useMemo(
    () => alerts.filter((a) => a.status !== 'Resolved' && !cleared.has(a.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [alerts, cleared],
  )

  const count = notifications.length

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [open])

  function handleClearAll() {
    setCleared(new Set(alerts.map((a) => a.id)))
  }

  function handleClickNotification(_alertId: string, severity: AlertSeverity) {
    setOpen(false)
    navigate(`${scopedPath('/alerts')}?severity=${severity}`)
  }

  function timeAgo(iso: string) {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-primary"
      >
        {count > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold text-text">Notifications</p>
              {count > 0 && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-500">{count} active</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-700"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Clear all
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <CheckCheck className="h-8 w-8 text-gray-300" />
                <p className="text-sm font-semibold text-gray-400">All clear — no active alerts</p>
              </div>
            ) : (
              notifications.map((alert) => {
                const Icon = SEV_ICON[alert.severity]
                const color = SEV_COLOR[alert.severity]
                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => handleClickNotification(alert.id, alert.severity)}
                    className="flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition hover:bg-gray-50 last:border-0"
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-text">{alert.type}</p>
                        <span className="shrink-0 text-[10px] text-gray-400">{timeAgo(alert.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-gray-500">{alert.message}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wide ${color}`}>{alert.severity}</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-gray-500">{alert.tripId}</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-gray-500">{alert.vehicleNumber}</span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5">
              <button
                type="button"
                onClick={() => { setOpen(false); navigate(scopedPath('/alerts')) }}
                className="w-full text-center text-xs font-semibold text-primary hover:underline"
              >
                View all alerts →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function TrackTraceLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const location = useLocation()
  const { currentPage, scopedPath } = useTrackTraceRouting()
  const { canAccessPage, canUseFeature } = useTrackTraceAccess()
  const { logout, user } = useAuth()
  const embedded = useTrackTraceEmbedded()

  const visibleSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => canAccessPage(item.page) && (!item.feature || canUseFeature(item.feature))),
        }))
        .filter((section) => section.items.length > 0),
    [canAccessPage, canUseFeature],
  )

  const currentItem = pageMeta[currentPage] ?? pageMeta.dashboard

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    window.location.assign('/login')
  }

  const toggleSection = (id: string) => {
    setCollapsedSections((current) => ({ ...current, [id]: !current[id] }))
  }

  // Embedded: host owns sidebar/header/auth chrome. Render just the page so
  // the tenant shell shows a single navigation level, not two.
  if (embedded) {
    return (
      <div className="bg-background text-text">
        <main className="mx-auto w-full max-w-screen-2xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <TrackTraceAccessBoundary page={currentPage}>
            <Outlet />
          </TrackTraceAccessBoundary>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background text-text">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="sticky top-0 z-40 hidden h-screen w-[268px] flex-col border-r border-gray-200 bg-white shadow-[1px_0_0_0_rgba(15,23,42,0.04)] lg:flex">
        {/* Brand band */}
        <div className="flex h-[64px] shrink-0 items-center justify-center bg-primary px-6">
          <OptimileLogo className="text-white" style={{ height: 36, width: 'auto', display: 'block' }} />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto pt-2 pb-4">
          {visibleSections.map((section) => {
            const collapsed = Boolean(collapsedSections[section.id])
            return (
              <div key={section.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center gap-2 px-6 py-3 text-[12px] font-extrabold uppercase tracking-[0.14em] text-gray-500 transition-colors hover:text-gray-700"
                >
                  <span className="flex-1 text-left">{section.label}</span>
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4 text-gray-400" strokeWidth={2.5} />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" strokeWidth={2.5} />
                  )}
                </button>

                {!collapsed && (
                  <div className="pb-1">
                    {section.items.map((item) => {
                      const targetPath = scopedPath(item.to)
                      return (
                        <NavLink
                          key={item.to}
                          to={targetPath}
                          end={item.to === '/dashboard'}
                          className={({ isActive }) =>
                            `relative flex items-center gap-3 px-6 py-2.5 text-[14px] font-medium transition-colors ${
                              isActive
                                ? 'bg-primary/[0.06] font-semibold text-primary'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-primary" />
                              )}
                              <item.icon
                                className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-primary' : 'text-gray-500'}`}
                              />
                              <span className="truncate">{item.label}</span>
                            </>
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4">
          <p className="text-[12px] font-medium text-gray-500">© 2025 Optimile ERP</p>
          <p className="text-[11px] text-gray-400">v1.0.0</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
                onClick={() => setMobileOpen((open) => !open)}
                type="button"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Track and Trace</p>
                <h2 className="truncate text-lg font-bold text-text">{currentItem.label}</h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right lg:block">
                <p className="text-sm font-semibold text-text">{user?.name ?? 'Optimile User'}</p>
                {currentItem.description && <p className="text-xs text-gray-500">{currentItem.description}</p>}
              </div>
              <NotificationBell scopedPath={scopedPath} />
              <button
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-primary"
                onClick={handleLogout}
                title="Sign out"
                type="button"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>

          {mobileOpen && (
            <nav className="border-t border-gray-200 bg-white p-3 lg:hidden">
              <div className="mb-2 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Screens
                <ChevronDown className="h-4 w-4" />
              </div>
              <div className="space-y-4">
                {visibleSections.map((section) => (
                  <div key={section.label}>
                    <p className="mb-2 px-2 text-xs font-extrabold uppercase tracking-wider text-gray-500">{section.label}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {section.items.map((item) => {
                        const targetPath = scopedPath(item.to)
                        const active = location.pathname === targetPath || location.pathname.startsWith(`${targetPath}/`)

                        return (
                          <NavLink
                            key={item.to}
                            className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                              active ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'
                            }`}
                            onClick={() => setMobileOpen(false)}
                            to={targetPath}
                          >
                            <span className="flex items-center gap-2">
                              <item.icon className="h-4 w-4" />
                              {item.label}
                            </span>
                          </NavLink>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>
          )}
        </header>

        <main className="mx-auto w-full max-w-screen-2xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <TrackTraceAccessBoundary page={currentPage}>
            <Outlet />
          </TrackTraceAccessBoundary>
        </main>
      </div>
    </div>
  )
}
