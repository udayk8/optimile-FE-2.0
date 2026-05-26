import { useMemo, useState } from 'react'
import {
  BarChart3,
  BellRing,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GaugeCircle,
  LocateFixed,
  LogOut,
  Map,
  Menu,
  Route,
  Send,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@shared-auth'
import { TrackTraceAccessBoundary } from '@track-trace/components/TrackTraceAccessBoundary'
import { useTrackTraceAccess } from '@track-trace/hooks/useTrackTraceAccess'
import { useTrackTraceRouting } from '@track-trace/hooks/useTrackTraceRouting'
import type { TrackTraceFeatureKey, TrackTracePageKey } from '@track-trace/types/access'

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
        to: '/analytics',
        label: 'Analytics',
        description: 'KPI, delay trend, exception intelligence, and predictive risk views',
        icon: BarChart3,
        page: 'analytics',
        feature: 'tracking.analytics',
      },
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

const navItems = navSections.flatMap((section) => section.items)

const pageMeta: Record<TrackTracePageKey, { label: string; description: string }> = {
  dashboard: { label: 'Dashboard', description: 'Track and Trace summary with metrics, alerts, map, and recent events.' },
  shipments: { label: 'Active Trips', description: 'Search and filter trips by booking, vehicle, customer, status, and delay.' },
  'shipment-detail': { label: 'Trip Detail', description: 'Trip summary, ETA, location, timeline, alerts, and customer-safe status.' },
  replay: { label: 'Trip Replay', description: 'Playback-ready route history with event and alert context for the selected trip.' },
  'customer-preview': { label: 'Customer Preview', description: 'Sanitized customer-safe tracking view for shareable visibility flows.' },
  analytics: { label: 'Analytics', description: 'Tracking KPI, delay trend, exception intelligence, and predictive risk overview.' },
  'route-performance': { label: 'Route Performance', description: 'Planned vs actual route efficiency, lane delay, and deviation intelligence.' },
  vehicles: { label: 'Active Trips', description: 'Legacy route redirected to the active trips view.' },
  'vehicle-detail': { label: 'Live Map', description: 'Legacy vehicle detail route now points to live map visibility.' },
  'live-map': { label: 'Live Map', description: 'Marker-based live visibility with selected trip side panel and route overlays.' },
  'route-progress': { label: 'Live Map', description: 'Route visibility is anchored in the live map page.' },
  exceptions: { label: 'Alerts', description: 'Operational exception workflow is focused on the alerts workspace.' },
  alerts: { label: 'Alerts', description: 'Review alert severity, ownership, and trip-linked tracking issues.' },
  pod: { label: 'Alerts', description: 'POD follow-up is anchored to the alerts workspace.' },
  'control-tower': { label: 'Dashboard', description: 'Control-tower entry lands on the dashboard.' },
  geofences: { label: 'Geofences', description: 'Create and manage active geofence coverage for operational route controls.' },
  dispatch: { label: 'Dispatch', description: 'Create and assign trips to vehicles and drivers with guardrail checks.' },
}

export function TrackTraceLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const location = useLocation()
  const { currentPage, scopedPath } = useTrackTraceRouting()
  const { canAccessPage, canUseFeature } = useTrackTraceAccess()
  const { logout, user } = useAuth()
  const sidebarWidth = sidebarExpanded ? 'lg:w-80' : 'lg:w-20'
  const mainOffset = sidebarExpanded ? 'lg:pl-80' : 'lg:pl-20'

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

  const handleLogout = () => {
    logout()
    window.location.assign('/login')
  }

  const toggleSection = (id: string) => {
    setCollapsedSections((current) => ({ ...current, [id]: !current[id] }))
  }

  return (
    <div className="min-h-screen bg-background text-text">
      <aside className={`fixed inset-y-0 left-0 hidden border-r border-gray-200 bg-white transition-all duration-300 lg:flex lg:flex-col ${sidebarWidth}`}>
        <div className={`flex items-center border-b border-gray-200 px-4 py-4 ${sidebarExpanded ? 'gap-3' : 'justify-center'}`}>
          {sidebarExpanded ? (
            <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-extrabold text-white">
                O
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Optimile</p>
                <p className="text-lg font-extrabold text-text">Track and Trace</p>
              </div>
            </>
          ) : null}
          <button
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className={`${sidebarExpanded ? 'ml-auto' : ''} flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-primary`}
            onClick={() => setSidebarExpanded((open) => !open)}
            title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            type="button"
          >
            {sidebarExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        <nav className={`flex flex-1 flex-col gap-5 overflow-y-auto py-4 ${sidebarExpanded ? 'px-3' : 'px-2'}`}>
          {visibleSections.map((section) => {
            const collapsed = sidebarExpanded && Boolean(collapsedSections[section.id])

            return (
              <section key={section.id}>
                {sidebarExpanded ? (
                  <div className="mb-2 flex items-center justify-between px-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">{section.label}</p>
                    {section.collapsible && (
                      <button
                        className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-primary"
                        onClick={() => toggleSection(section.id)}
                        title={collapsed ? `Expand ${section.label}` : `Collapse ${section.label}`}
                        type="button"
                      >
                        <ChevronDown className={`h-4 w-4 transition ${collapsed ? '-rotate-90' : ''}`} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mb-2 border-t border-gray-100" title={section.label} />
                )}
                {!collapsed && (
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const targetPath = scopedPath(item.to)
                      const active = location.pathname === targetPath || location.pathname.startsWith(`${targetPath}/`)

                      return (
                        <NavLink
                          aria-label={item.label}
                          key={item.to}
                          to={targetPath}
                          title={sidebarExpanded ? undefined : item.label}
                          className={`group relative flex w-full items-center gap-3 rounded-lg border-l-4 px-3 py-3 text-left transition ${
                            active
                              ? 'border-l-primary bg-primary/10 text-primary shadow-sm'
                              : 'border-l-transparent text-gray-600 hover:border-l-gray-300 hover:bg-gray-100 hover:text-primary'
                          } ${sidebarExpanded ? '' : 'justify-center px-2'}`}
                        >
                          <item.icon className={`h-5 w-5 shrink-0 ${active ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`} />
                          {sidebarExpanded && (
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-extrabold">{item.label}</span>
                              <span className="mt-0.5 block truncate text-xs font-semibold text-gray-400">{item.description}</span>
                            </span>
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </nav>

        <div className={`border-t border-gray-200 px-4 py-4 ${sidebarExpanded ? '' : 'flex justify-center'}`}>
          {sidebarExpanded ? (
            <>
              <p className="text-sm font-semibold text-text">{user?.name ?? 'Optimile User'}</p>
              <p className="mt-1 text-xs text-gray-500">{user?.role ?? 'tracking'} · Control Tower Access</p>
            </>
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-sm font-extrabold text-primary"
              title={`${user?.name ?? 'Optimile User'} · Control Tower Access`}
            >
              {(user?.name ?? 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </aside>

      <div className={`transition-all duration-300 ${mainOffset}`}>
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
                <p className="text-xs text-gray-500">{currentItem.description}</p>
              </div>
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

        <main className="mx-auto max-w-screen-2xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <TrackTraceAccessBoundary page={currentPage}>
            <Outlet />
          </TrackTraceAccessBoundary>
        </main>
      </div>
    </div>
  )
}
