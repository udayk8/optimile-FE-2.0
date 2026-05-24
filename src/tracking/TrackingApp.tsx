import { Bell, Clock3, LogOut, MapPinned, RadioTower, Route, ShieldCheck, Truck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { OptimileLogo, useAuth } from '@shared-auth'

interface NavItem {
  label: string
  icon: typeof RadioTower
  active?: boolean
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Welcome', icon: RadioTower, active: true },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Live Trips', icon: Truck, active: false },
      { label: 'Milestones', icon: Route, active: false },
      { label: 'Control Tower', icon: Bell, active: false },
    ],
  },
]

const UPCOMING_FEATURES = [
  {
    title: 'Real-time shipment visibility',
    description: 'Live vehicle pings, waypoint progress, and ETA confidence will appear here once the tracking connectors are switched on.',
    icon: MapPinned,
  },
  {
    title: 'Automated milestone timeline',
    description: 'Gate-in, dispatch, in-transit, and delivery events will assemble into a shared movement timeline for every load.',
    icon: Clock3,
  },
  {
    title: 'Exception and alert center',
    description: 'Delay flags, route deviations, and proof-of-delivery exceptions will surface in one operator-friendly workspace.',
    icon: ShieldCheck,
  },
]

export default function TrackingApp() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="min-h-screen bg-background text-text">
      <aside className="hidden border-r border-gray-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-80 lg:flex-col">
        <div className="border-b border-gray-200 px-6 py-6">
          <OptimileLogo className="text-primary" style={{ height: 34, width: 'auto', display: 'block' }} />
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-secondary">Optimile</p>
          <h1 className="mt-1 text-2xl font-extrabold text-text">Track and Trace</h1>
          <p className="mt-2 text-sm text-gray-500">A dedicated visibility workspace for shipment movement and delivery confidence.</p>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">{section.label}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        item.active
                          ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
                          : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-primary'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${item.active ? 'text-primary' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                      {!item.active && (
                        <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          Soon
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-80">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Track and Trace</p>
              <p className="text-sm text-gray-500">Preview workspace</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-primary transition hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:p-7">
              <p className="text-sm font-bold uppercase tracking-wide text-accent">Welcome screen</p>
              <h2 className="mt-2 text-3xl font-extrabold text-text">Welcome, {firstName}</h2>
              <p className="mt-3 max-w-3xl text-sm text-gray-600">
                The Track and Trace workspace is being prepared. This feature will be enabled soon with live trip visibility,
                milestone capture, and exception handling across the delivery journey.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Status</p>
                  <p className="mt-3 text-2xl font-extrabold text-text">Coming Soon</p>
                  <p className="mt-2 text-sm text-gray-600">Core tracking workflows are currently in rollout preparation.</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Module</p>
                  <p className="mt-3 text-2xl font-extrabold text-text">Track and Trace</p>
                  <p className="mt-2 text-sm text-gray-600">Single place for shipment movement, alerting, and ETA confidence.</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Role</p>
                  <p className="mt-3 text-2xl font-extrabold text-text">{user?.role ?? 'User'}</p>
                  <p className="mt-2 text-sm text-gray-600">Your access is ready and will light up as soon as the workspace goes live.</p>
                </div>
                <div className="rounded-xl border border-warning/20 bg-warning/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-warning">Next step</p>
                  <p className="mt-3 text-2xl font-extrabold text-text">Preview only</p>
                  <p className="mt-2 text-sm text-gray-600">Use this page as the holding experience until operational screens are released.</p>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-accent">What’s planned</p>
                    <h3 className="mt-1 text-xl font-bold text-text">The first release focus</h3>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                    Preview
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  {UPCOMING_FEATURES.map((feature) => {
                    const Icon = feature.icon
                    return (
                      <article key={feature.title} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-primary/10 p-3 text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-text">{feature.title}</h4>
                            <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>

              <aside className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-wide text-accent">Workspace note</p>
                <h3 className="mt-1 text-lg font-bold text-text">Why this placeholder exists</h3>
                <p className="mt-3 text-sm text-gray-600">
                  Users can sign in today, see the correct role context, and land on a branded shell while the tracking experience is under development.
                </p>

                <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Enabled soon</p>
                  <ul className="mt-3 space-y-3 text-sm text-gray-600">
                    <li>Trip map and last-known location</li>
                    <li>Milestone event stream</li>
                    <li>Delay alerts and escalation cues</li>
                    <li>Proof-of-delivery readiness</li>
                  </ul>
                </div>
              </aside>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
