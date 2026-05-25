import { useMemo, useState } from 'react'
import { ProtectedRoute, useAuth } from '@shared-auth'
import { Badge } from '@shared-ui/badge'
import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import { KpiCard } from '@shared-ui/kpi-card'
import { PageHero } from '@shared-ui/page-hero'
import {
  Bell,
  BookOpenCheck,
  ChevronRight,
  ClipboardList,
  FileText,
  LogOut,
  PackageSearch,
  Route,
  Search,
  ShieldCheck,
  Truck,
  UserCircle2,
} from 'lucide-react'
import '../styles/global.css'

type CustomerSection = 'overview' | 'requests' | 'shipments' | 'contracts'

const NAV_ITEMS: Array<{
  id: CustomerSection
  label: string
  description: string
  icon: typeof ClipboardList
  badge?: string
}> = [
  { id: 'overview', label: 'Overview', description: 'Dashboard summary', icon: PackageSearch },
  { id: 'requests', label: 'Booking Requests', description: 'Customer demand intake', icon: ClipboardList, badge: '17' },
  { id: 'shipments', label: 'Shipments', description: 'Movement visibility', icon: Truck, badge: '42' },
  { id: 'contracts', label: 'Contracts', description: 'Pricing and coverage', icon: FileText },
]

const SEARCH_ITEMS = [
  'Booking request BR-2041',
  'Shipment SHP-8821',
  'Contract CNT-CBD-19',
  'Lane Mumbai → Bengaluru',
  'Customer SLA exceptions',
]

const NOTIFICATIONS = [
  { id: 'n1', title: '3 bookings need confirmation', tone: 'warning' as const, time: '5m ago' },
  { id: 'n2', title: '1 shipment has a delivery exception', tone: 'destructive' as const, time: '12m ago' },
  { id: 'n3', title: 'Contract coverage updated for South lane', tone: 'default' as const, time: '45m ago' },
]

function CustomerDashboardShell({ embedded = false }: { embedded?: boolean }) {
  const { logout, user } = useAuth()
  const [activeSection, setActiveSection] = useState<CustomerSection>('overview')
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const filteredSearchItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return SEARCH_ITEMS.slice(0, 4)
    return SEARCH_ITEMS.filter((item) => item.toLowerCase().includes(normalizedQuery)).slice(0, 4)
  }, [query])

  const showSearchResults = searchFocused && filteredSearchItems.length > 0

  const handleLogout = () => {
    logout()
    window.location.assign('/login')
  }

  return (
    <div className={embedded ? "optimile-customer-root" : "optimile-customer-root min-h-screen bg-background text-text"}>
      <div className={embedded ? "flex" : "flex min-h-screen"}>
        <aside className={embedded ? "hidden" : "hidden w-80 shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col"}>
          <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-white">
              O
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Optimile</p>
              <h1 className="text-lg font-extrabold text-text">Customer Dashboard</h1>
            </div>
          </div>

          <div className="border-b border-gray-200 px-5 py-4">
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                  <UserCircle2 className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-text">{user?.name ?? 'Customer User'}</p>
                  <p className="text-xs text-gray-500">{user?.role ?? 'CBD'} · Customer Operations</p>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
            <section>
              <p className="mb-3 px-3 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Workspace</p>
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  const active = activeSection === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border-l-4 px-3 py-3 text-left transition ${
                        active
                          ? 'border-l-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-l-transparent text-gray-600 hover:border-l-gray-300 hover:bg-gray-100 hover:text-primary'
                      }`}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-primary' : 'text-gray-400'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-extrabold">{item.label}</span>
                          {item.badge && (
                            <span className={`inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-xs font-extrabold ${
                              item.id === 'shipments' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs font-semibold text-gray-400">{item.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <p className="mb-3 px-3 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Notifications</p>
              <div className="space-y-2">
                {NOTIFICATIONS.map((notification) => (
                  <div key={notification.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text">{notification.title}</p>
                        <p className="mt-1 text-xs text-gray-500">{notification.time}</p>
                      </div>
                      <Badge variant={notification.tone}>New</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </nav>

        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {embedded ? null : <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Optimile</p>
                <h1 className="truncate text-xl font-extrabold text-text">Customer Booking Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">Booking intake, shipment visibility, and customer-facing execution in one place.</p>
              </div>

              <div className="flex flex-col gap-3 xl:min-w-[620px] xl:flex-row xl:items-center xl:justify-end">
                <div className="relative min-w-0 flex-1 xl:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
                    placeholder="Search bookings, shipments, contracts, or lanes"
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                  />
                  {showSearchResults && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                      {filteredSearchItems.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setQuery(item)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50 hover:text-primary"
                        >
                          <span>{item}</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button type="button" className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-primary">
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-danger" />
                </button>

                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-text">{user?.name ?? 'Customer User'}</p>
                  <p className="text-xs text-gray-500">{user?.role ?? 'CBD'} · Customer Booking Desk</p>
                </div>

                <button
                  aria-label="Sign out"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-primary"
                  onClick={handleLogout}
                  title="Sign out"
                  type="button"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>}

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
              <PageHero
                eyebrow="Customer Control Tower"
                title="Welcome to the customer workspace"
                subtitle="Use this dashboard to monitor booking demand, customer commitments, shipment progress, and coordination actions without leaving the shared Optimile operating rhythm."
                icon={<BookOpenCheck className="h-5 w-5 text-primary" />}
                action={<Badge variant="default">Role: {user?.role ?? 'CBD'}</Badge>}
              />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <KpiCard
                  title="Active bookings"
                  value="128"
                  insight="Open booking requests currently moving through planning and allocation."
                  icon={<PackageSearch className="h-4 w-4" />}
                />
                <KpiCard
                  title="Shipments in transit"
                  value="42"
                  insight="Customer orders with active vehicle movement and milestone tracking."
                  icon={<Route className="h-4 w-4" />}
                />
                <KpiCard
                  title="Booking requests"
                  value="17"
                  insight="New requests waiting for rate confirmation or operational allocation."
                  icon={<ClipboardList className="h-4 w-4" />}
                />
                <KpiCard
                  title="Contract coverage"
                  value="94%"
                  insight="Customer lanes already mapped to approved contracts and pricing controls."
                  icon={<FileText className="h-4 w-4" />}
                />
                <KpiCard
                  title="Access profile"
                  value={user?.role ?? 'CBD'}
                  insight="Role-aware customer landing with shared login, notifications, and workspace shell."
                  icon={<ShieldCheck className="h-4 w-4" />}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Dashboard summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current focus</p>
                        <p className="mt-2 text-sm font-bold text-text">
                          {activeSection === 'overview' && 'Cross-team visibility across customer demand and in-flight execution.'}
                          {activeSection === 'requests' && 'Prioritize pending booking confirmations and aging request queues.'}
                          {activeSection === 'shipments' && 'Track in-transit movements and surface customer-facing exceptions early.'}
                          {activeSection === 'contracts' && 'Monitor lane coverage, pricing readiness, and contract dependencies.'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Role expectation</p>
                        <p className="mt-2 text-sm font-bold text-text">Customer Booking Desk users need quick context, escalations, and clear operational next steps.</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-bold uppercase tracking-wide text-accent">Daily snapshot</p>
                          <h2 className="mt-1 text-lg font-extrabold text-text">Customer experience is stable, but two shipment exceptions need follow-up.</h2>
                          <p className="mt-2 max-w-3xl text-sm text-gray-600">
                            Booking inflow remains healthy, contract coverage is high, and most customer SLAs are protected. The current operational risk is concentrated in delayed milestones and confirmation lag on new requests.
                          </p>
                        </div>
                        <Button variant="outline">Export summary</Button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        { title: 'Booking intake', detail: 'Customer requests, promised dates, and SLA-sensitive demand planning.', badge: '17 pending' },
                        { title: 'Shipment visibility', detail: 'Order-to-trip progress, exception monitoring, and status communication.', badge: '42 live' },
                        { title: 'Pricing and contracts', detail: 'Applicable rate cards, lane coverage, and commercial readiness.', badge: '94% covered' },
                        { title: 'Support workflow', detail: 'Escalations, callbacks, milestone follow-ups, and update ownership.', badge: '8 actions' },
                      ].map((item) => (
                        <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-text">{item.title}</p>
                            <Badge variant="outline">{item.badge}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-gray-600">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Alerts and notifications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {NOTIFICATIONS.map((notification) => (
                        <div key={notification.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-text">{notification.title}</p>
                            <Badge variant={notification.tone}>{notification.time}</Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                  <CardHeader>
                    <CardTitle>User panel</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Signed in as</p>
                        <p className="mt-1 text-sm font-bold text-text">{user?.name ?? 'Customer User'}</p>
                        <p className="mt-1 text-sm text-gray-600">{user?.role ?? 'CBD'} · Customer Booking Desk</p>
                      </div>
                      <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-sm text-gray-600">
                        Header actions now mirror Fleet more closely: search, notifications, role context, and top-right logout stay together in one clean control strip.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default function CustomerApp() {
  return (
    <ProtectedRoute portal="customer">
      <CustomerDashboardShell />
    </ProtectedRoute>
  )
}

// Embeddable variant — used by platform-admin tenant workspace.
// Renders the customer dashboard content without its own sidebar/header
// so the surrounding shell owns navigation.
export function CustomerDashboardEmbedded() {
  return <CustomerDashboardShell embedded />
}
