import { useMemo, type ComponentType } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCustomerBridge } from '../integration/customer-data-bridge'
import { ProtectedRoute, useAuth } from '@shared-auth'
import { Button } from '@shared-ui/button'
import {
  BarChart3,
  Bell,
  CircleDollarSign,
  ClipboardList,
  Download,
  Languages,
  LayoutDashboard,
  LogOut,
  Plus,
  Route,
  Search,
  UserCircle2,
} from 'lucide-react'
import '../styles/global.css'
import type { CustomerSection } from '../shared/customer-types'
import { BOOKINGS } from '../shared/customer-types'
import { useCustomerBookings } from '../hooks/useCustomerBookings'
import { useCreateBooking } from '../hooks/useCreateBooking'
import { useTrackingDetail } from '../hooks/useTrackingDetail'
import { OverviewSection } from '../sections/OverviewSection'
import { BookingsSection } from '../sections/BookingsSection'
import { CreateBookingSection } from '../sections/CreateBookingSection'
import { TrackingSection } from '../sections/TrackingSection'
import { FinanceSection } from '../sections/FinanceSection'
import { ReportsSection } from '../sections/ReportsSection'

const SESSION_CONTEXT_KEY = 'optimile.session.context'

type PortalCustomerIdentity = { customerId?: string; customerName?: string; phone?: string }

const NAV_ITEMS: Array<{ id: CustomerSection; label: string; description: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', description: 'KPIs, alerts, live feed', icon: LayoutDashboard },
  { id: 'bookings', label: 'Bookings', description: 'Lifecycle tabs and list', icon: ClipboardList },
  { id: 'create', label: 'Create Booking', description: 'Customer booking intake', icon: Plus },
  { id: 'tracking', label: 'Track & ePOD', description: 'ETA, milestones, POD', icon: Route },
  { id: 'finance', label: 'Finance', description: 'Invoices and aging', icon: CircleDollarSign },
  { id: 'reports', label: 'Reports', description: 'Shipment analytics exports', icon: BarChart3 },
]

function readPortalCustomerIdentity(): PortalCustomerIdentity | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_CONTEXT_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as {
      loginType?: string
      customerId?: string
      customerName?: string
      phone?: string
    }
    if (session?.loginType !== 'CUSTOMER') return null
    return { customerId: session.customerId, customerName: session.customerName, phone: session.phone }
  } catch {
    return null
  }
}

export function CustomerDashboardShell({ embedded = false }: { embedded?: boolean } = {}) {
  const { logout, user } = useAuth()
  const bridge = useCustomerBridge()
  const portalCustomer = useMemo(() => readPortalCustomerIdentity(), [])
  const displayName = bridge?.customerName ?? portalCustomer?.customerName ?? user?.name ?? 'Customer Booking Desk'
  const displayRole = bridge || portalCustomer ? 'Customer' : user?.role ?? 'CBD'

  const [searchParams, setSearchParams] = useSearchParams()
  const sectionParam = searchParams.get('section') as CustomerSection | null
  const activeSection: CustomerSection = (['overview', 'bookings', 'create', 'tracking', 'finance', 'reports'] as const).includes(
    sectionParam as CustomerSection,
  )
    ? (sectionParam as CustomerSection)
    : 'overview'
  const setActiveSection = (id: CustomerSection) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('section', id)
        return next
      },
      { replace: true },
    )

  const bookings = bridge ? bridge.bookings : BOOKINGS
  const { query, setQuery, statusTab, setStatusTab, filteredBookings, activeExceptions, activeBookings, kpiCounts } = useCustomerBookings(bookings)
  const { selectedBookingId, setSelectedBookingId, selectedBooking, detailTab, setDetailTab } = useTrackingDetail(bookings)
  const { form, setForm, message, submit } = useCreateBooking(bridge)

  const handleLogout = () => {
    logout()
    window.location.assign('/login')
  }

  return (
    <div className="optimile-customer-root min-h-screen bg-background text-text">
      <div className="flex min-h-screen">
        {!embedded && (
          <aside className="hidden w-80 shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
            <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-lg font-extrabold text-white">O</div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Optimile</p>
                <h1 className="text-lg font-extrabold text-text">Customer Dashboard</h1>
              </div>
            </div>

            <div className="border-b border-gray-200 px-5 py-4">
              <div className="rounded-lg border border-primary/10 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                    <UserCircle2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text">{displayName}</p>
                    <p className="text-xs text-gray-500">{displayRole} - Customer Operations</p>
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-5">
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
                      className={`flex w-full items-center gap-3 rounded-lg border-l-4 px-3 py-3 text-left transition ${
                        active
                          ? 'border-l-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-l-transparent text-gray-600 hover:border-l-gray-300 hover:bg-gray-100 hover:text-primary'
                      }`}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-primary' : 'text-gray-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold">{item.label}</p>
                        <p className="truncate text-xs font-semibold text-gray-400">{item.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-text">
                  <Languages className="h-4 w-4 text-primary" />
                  Language
                </div>
                <select className="mt-3 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm">
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Kannada</option>
                </select>
              </div>
            </nav>
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Optimile ERP</p>
                <h1 className="truncate text-xl font-extrabold text-text">Customer Booking Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">Bookings, tracking, exceptions, ePOD, finance, and reports.</p>
              </div>

              <div className="flex flex-col gap-3 xl:min-w-[640px] xl:flex-row xl:items-center xl:justify-end">
                <div className="relative min-w-0 flex-1 xl:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search booking ID, SO, consignee, vehicle, route"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                  />
                </div>

                <button type="button" className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-primary">
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-danger" />
                </button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <button
                  aria-label="Sign out"
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-primary"
                  onClick={handleLogout}
                  title="Sign out"
                  type="button"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1560px] space-y-6">
              {activeSection === 'overview' && (
                <OverviewSection
                  bookings={bookings}
                  activeExceptions={activeExceptions}
                  activeBookings={activeBookings}
                  kpiCounts={kpiCounts}
                  onViewExceptions={() => { setActiveSection('bookings'); setStatusTab('exceptions') }}
                  onSelectBooking={(id) => { setSelectedBookingId(id); setActiveSection('tracking') }}
                />
              )}
              {activeSection === 'bookings' && (
                <BookingsSection
                  bookings={bookings}
                  filteredBookings={filteredBookings}
                  activeExceptions={activeExceptions}
                  statusTab={statusTab}
                  setStatusTab={setStatusTab}
                  onNewBooking={() => setActiveSection('create')}
                  onSelectBooking={(id) => { setSelectedBookingId(id); setActiveSection('tracking') }}
                />
              )}
              {activeSection === 'create' && (
                <CreateBookingSection
                  bridge={bridge}
                  displayName={displayName}
                  form={form}
                  setForm={setForm}
                  message={message}
                  onSubmit={() => submit((id) => { setSelectedBookingId(id); setActiveSection('bookings') })}
                  onCreated={(id) => { setSelectedBookingId(id); setActiveSection('bookings') }}
                />
              )}
              {activeSection === 'tracking' && (
                <TrackingSection
                  bookings={bookings}
                  selectedBooking={selectedBooking}
                  selectedBookingId={selectedBookingId}
                  setSelectedBookingId={setSelectedBookingId}
                  detailTab={detailTab}
                  setDetailTab={setDetailTab}
                  bridge={bridge}
                  onCreateBooking={() => setActiveSection('create')}
                />
              )}
              {activeSection === 'finance' && <FinanceSection />}
              {activeSection === 'reports' && <ReportsSection />}
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
