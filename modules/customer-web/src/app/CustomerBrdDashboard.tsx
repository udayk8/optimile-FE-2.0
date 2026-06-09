import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCustomerBridge } from '../integration/customer-data-bridge'
import { ProtectedRoute, useAuth } from '@shared-auth'
import {
  BarChart3,
  Bell,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  X,
} from 'lucide-react'
import '../styles/global.css'
import type { CustomerSection } from '../shared/customer-types'
import { BOOKINGS } from '../shared/mock-data'
import { useCustomerBookings } from '../hooks/useCustomerBookings'
import { useTrackingDetail } from '../hooks/useTrackingDetail'
import type { DetailTab } from '../shared/customer-types'
import OverviewSection from '../sections/OverviewSection'
import BookingsSection from '../sections/BookingsSection'
import { CreateBookingSection } from '../sections/CreateBookingSection'
import { TrackingSection } from '../sections/TrackingSection'
import { FinanceSection } from '../sections/FinanceSection'
import { ReportsSection } from '../sections/ReportsSection'

// ─── Session identity ─────────────────────────────────────────────────────────

const SESSION_CONTEXT_KEY = 'optimile.session.context'

type PortalCustomerIdentity = { customerId?: string; customerName?: string; phone?: string }

function readPortalCustomerIdentity(): PortalCustomerIdentity | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_CONTEXT_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as {
      loginType?: string; customerId?: string; customerName?: string; phone?: string
    }
    if (session?.loginType !== 'CUSTOMER') return null
    return { customerId: session.customerId, customerName: session.customerName, phone: session.phone }
  } catch {
    return null
  }
}

// ─── Nav items — order: Overview → Create → Bookings → Track → Finance → Reports ──

const NAV_ITEMS: Array<{ id: CustomerSection; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'overview',  label: 'Overview',       icon: LayoutDashboard },
  { id: 'create',    label: 'Create Booking', icon: Plus            },
  { id: 'bookings',  label: 'Bookings',       icon: ClipboardList   },
  { id: 'finance',   label: 'Finance',        icon: CircleDollarSign},
  { id: 'reports',   label: 'Reports',        icon: BarChart3       },
]

const SECTION_LABELS: Record<CustomerSection, string> = {
  overview:  'Overview',
  create:    'Create Booking',
  bookings:  'Bookings',
  tracking:  'Bookings',
  finance:   'Finance',
  reports:   'Reports',
}

const VALID_SECTIONS = new Set<CustomerSection>(['overview', 'bookings', 'create', 'tracking', 'finance', 'reports'])
const VALID_TABS     = new Set<DetailTab>(['overview', 'track', 'deliveries', 'timeline', 'documents'])

// ─── Notification type ────────────────────────────────────────────────────────

type Notif = {
  id:         string
  priority:   'High' | 'Medium'
  channel:    'in-app' | 'email' | 'sms'
  message:    string
  time:       string
  bookingId?: string
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyBookingsState({ onCreateBooking }: { onCreateBooking: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <PackageSearch className="mb-4 h-16 w-16 opacity-40 text-gray-400" />
      <h2 className="mb-2 text-xl font-semibold text-text">No shipments yet</h2>
      <p className="mb-6 max-w-sm text-sm text-gray-500">
        Create your first booking to start tracking shipments, managing deliveries, and viewing reports.
      </p>
      <button
        type="button"
        onClick={onCreateBooking}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90"
      >
        + Create First Booking
      </button>
    </div>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function CustomerDashboardShell({ embedded = false }: { embedded?: boolean } = {}) {
  const { user, logout } = useAuth()
  const bridge           = useCustomerBridge()
  const portalCustomer   = useMemo(() => readPortalCustomerIdentity(), [])
  const displayName      = bridge?.customerName ?? portalCustomer?.customerName ?? user?.name ?? 'Customer Booking Desk'
  const displayRole      = bridge || portalCustomer ? 'Customer' : user?.role ?? 'CBD'

  // ── Section routing via React Router search params ──────────────────────────
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionParam  = searchParams.get('section') as CustomerSection | null
  const activeSection = VALID_SECTIONS.has(sectionParam as CustomerSection)
    ? (sectionParam as CustomerSection)
    : 'overview'

  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false)
  const [mobileDrawerOpen,  setMobileDrawerOpen]  = useState(false)
  const [presetFilter,      setPresetFilter]      = useState<import('../sections/BookingsSection').BookingFilterPreset | undefined>(undefined)
  const [editingBookingId,  setEditingBookingId]  = useState<string | undefined>(undefined)
  const [financeInitialTab, setFinanceInitialTab] = useState<'all' | 'pending' | 'overdue' | 'paid' | 'disputed' | undefined>(undefined)
  const [shellToast,        setShellToast]        = useState<string | null>(null)
  useEffect(() => {
    if (!shellToast) return
    const t = setTimeout(() => setShellToast(null), 3000)
    return () => clearTimeout(t)
  }, [shellToast])

  const setActiveSection = (id: CustomerSection) => {
    // Clear any pipeline preset when navigating to bookings directly (not via a pipeline card)
    if (id === 'bookings') setPresetFilter(undefined)
    // Clear editing context when leaving create section
    if (id !== 'create') setEditingBookingId(undefined)
    // Clear finance tab hint when leaving finance
    if (id !== 'finance') setFinanceInitialTab(undefined)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('section', id)
      return next
    // pushState for section so browser Back works
    }, { replace: false })
  }

  // ── Bookings + search state ─────────────────────────────────────────────────
  const bookings = bridge ? bridge.bookings : BOOKINGS
  const { query, setQuery } = useCustomerBookings(bookings)
  const { selectedBookingId, setSelectedBookingId, selectedBooking, detailTab, setDetailTab } = useTrackingDetail(bookings)

  // ── Notification state ──────────────────────────────────────────────────────
  const [notifOpen,    setNotifOpen]    = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [navSearch,    setNavSearch]    = useState('')
  const [readIds,      setReadIds]      = useState<Set<string>>(new Set())
  const userMenuRef = useRef<HTMLDivElement>(null)

  const notifRef = useRef<HTMLDivElement>(null)

  // Close notification popover on Escape or outside click
  useEffect(() => {
    if (!notifOpen) return
    const onKey     = (e: KeyboardEvent) => { if (e.key === 'Escape') setNotifOpen(false) }
    const onOutside = (e: MouseEvent)    => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false) }
    document.addEventListener('keydown',  onKey)
    document.addEventListener('mousedown', onOutside)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onOutside) }
  }, [notifOpen])

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    const onOutside = (e: MouseEvent) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false) }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [userMenuOpen])

  const notifications = useMemo<Notif[]>(() => {
    const result: Notif[] = []
    bookings.filter((b) => b.status === 'IN_TRANSIT_EXCEPTION').forEach((b) => {
      result.push({
        id: `exc-${b.id}`, priority: 'High', channel: 'in-app',
        message:   `Exception on ${b.id}: ${b.exceptionNote ?? 'Active exception reported. Immediate attention required.'}`,
        time:      b.lastUpdate, bookingId: b.id,
      })
    })
    bookings.filter((b) => b.status === 'IN_TRANSIT_DELAYED').forEach((b) => {
      result.push({
        id: `del-${b.id}`, priority: 'Medium', channel: 'in-app',
        message:   `${b.id} is running ${b.delayedHours ?? 0}h late — revised ETA: ${b.eta}`,
        time:      b.lastUpdate, bookingId: b.id,
      })
    })
    // TODO: pull overdue invoice notifications from finance/invoicing service
    result.push({
      id: 'inv-overdue', priority: 'High', channel: 'email',
      message: '2 invoices are overdue — Rs 70,800 outstanding past credit days.',
      time:    'Jun 5, 2026',
    })
    return result
  }, [bookings])

  const initials    = displayName.split(' ').filter(Boolean).map((w) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length

  // ── Read id + tab from URL on mount and initialise state ────────────────────
  const initialIdRef  = useRef(searchParams.get('id'))
  const initialTabRef = useRef(searchParams.get('tab') as DetailTab | null)

  useEffect(() => {
    const id  = initialIdRef.current
    const tab = initialTabRef.current
    if (id) {
      // Validate against current bookings; fall back to first booking silently
      const validId = bookings.find((b) => b.id === id)?.id ?? bookings[0]?.id ?? ''
      setSelectedBookingId(validId)
    }
    if (tab && VALID_TABS.has(tab as DetailTab)) setDetailTab(tab)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync activeSection + selectedBookingId + detailTab into the URL bar ─────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (activeSection !== 'overview') params.set('section', activeSection)
    else                              params.delete('section')
    if (selectedBookingId)            params.set('id', selectedBookingId)
    else                              params.delete('id')
    if (detailTab !== 'overview')     params.set('tab', detailTab)
    else                              params.delete('tab')
    window.history.replaceState({}, '', `?${params.toString()}`)
  }, [activeSection, selectedBookingId, detailTab])


  const hasBookings = bookings.length > 0

  return (
    <div className="optimile-customer-root min-h-screen bg-background text-text">
      {/* ── Mobile sidebar drawer ────────────────────────────────────────── */}
      {!embedded && mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-[268px] flex-col border-r border-gray-200 bg-white shadow-xl">
            <div className="flex h-[64px] shrink-0 items-center justify-between px-4">
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">Customer</span>
              <button type="button" aria-label="Close navigation" onClick={() => setMobileDrawerOpen(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="border-b border-gray-100 px-4 pb-4">
              <p className="truncate text-base font-bold text-gray-900">{displayName}</p>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 pt-2">
              <div className="space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const Icon   = item.icon
                  const active = activeSection === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setActiveSection(item.id); setMobileDrawerOpen(false) }}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13px] transition-colors ${
                        active ? 'bg-gray-900 font-medium text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </nav>
          </aside>
        </div>
      )}

      <div className="flex min-h-screen">

        {/* ── Desktop sidebar (hidden below lg) ─────────────────────────── */}
        {!embedded && (
          <aside style={{ width: sidebarCollapsed ? 64 : 268 }} className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-gray-200 bg-white lg:flex transition-all duration-200">
            {/* Tenant chip row */}
            <div className="flex h-[64px] shrink-0 items-center justify-between px-4">
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">Customer</span>
              <button type="button" title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setSidebarCollapsed((c) => !c)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <PanelLeftClose className={`h-4 w-4 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Company + user info */}
            {!sidebarCollapsed && (
              <div className="border-b border-gray-100 px-4 pb-4">
                <p className="truncate text-base font-bold text-gray-900">{displayName}</p>
                <p className="truncate text-sm text-gray-500">{user?.email ?? ''}</p>
                <p className="text-xs text-gray-400">{displayRole}</p>
              </div>
            )}

            {/* Search navigation */}
            {!sidebarCollapsed && (
              <div className="px-4 py-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={navSearch}
                    onChange={(e) => setNavSearch(e.target.value)}
                    placeholder="Search navigation"
                    className="h-8 w-full rounded-md border border-gray-200 bg-gray-50 pl-8 pr-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3">
              {!sidebarCollapsed && (
                <button type="button" className="flex w-full items-center justify-between rounded px-3 py-2 text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
                  Customer Portal
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
              )}
              <div className="mt-0.5 space-y-0.5">
                {NAV_ITEMS.filter((item) =>
                  !navSearch || item.label.toLowerCase().includes(navSearch.toLowerCase())
                ).map((item) => {
                  const Icon   = item.icon
                  const active = activeSection === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={sidebarCollapsed ? item.label : undefined}
                      onClick={() => setActiveSection(item.id)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                        active
                          ? 'bg-gray-900 font-medium text-white'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      } ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                      {!sidebarCollapsed && item.label}
                    </button>
                  )
                })}
              </div>
            </nav>
          </aside>
        )}

        {/* ── Main content column ────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Topbar — only in standalone mode; embedded mode uses TMS shell topbar */}
          {!embedded && <header className="sticky top-0 z-20 flex h-[64px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
            {/* Left: hamburger (mobile) + current page title */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileDrawerOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 lg:hidden"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
              <p className="text-base font-semibold text-gray-900">{SECTION_LABELS[activeSection]}</p>
            </div>

            {/* Right: bell + user + settings */}
            <div className="flex items-center gap-2">
              {/* Notification bell with inline popover */}
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  aria-label={`Notifications, ${unreadCount} unread`}
                  aria-expanded={notifOpen}
                  onClick={() => setNotifOpen((v) => !v)}
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Inline notification popover */}
                {notifOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">Notifications</p>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">{unreadCount} unread</span>
                      )}
                    </div>
                    <div className="max-h-[360px] divide-y divide-gray-50 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-gray-400">All caught up!</p>
                      ) : (
                        notifications.slice(0, 4).map((notif) => {
                          const isRead = readIds.has(notif.id)
                          return (
                            <button
                              key={notif.id}
                              type="button"
                              className="flex w-full gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
                              onClick={() => {
                                setReadIds((prev) => new Set([...prev, notif.id]))
                                if (notif.bookingId) {
                                  setSelectedBookingId(notif.bookingId)
                                  setActiveSection('tracking')
                                  setNotifOpen(false)
                                }
                              }}
                            >
                              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isRead ? 'bg-transparent' : 'bg-blue-500'}`} />
                              <div className="min-w-0 flex-1">
                                <p className={`text-[13px] leading-snug ${isRead ? 'text-gray-400' : 'text-gray-800'}`}>{notif.message}</p>
                                <p className="mt-0.5 text-[11px] text-gray-400">{notif.time}</p>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                    <div className="border-t border-gray-100 px-4 py-2.5">
                      <button
                        type="button"
                        className="text-[13px] font-semibold text-blue-600 hover:underline"
                        onClick={() => setReadIds(new Set(notifications.map((n) => n.id)))}
                      >
                        Mark all as read
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User avatar + name + dropdown (logout inside) */}
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-gray-100"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {initials}
                  </div>
                  <div className="hidden text-left xl:block">
                    <p className="text-[13px] font-semibold leading-tight text-gray-800">{displayName}</p>
                    <p className="text-[11px] leading-tight text-gray-400">{displayRole}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    <button
                      type="button"
                      onClick={() => { setUserMenuOpen(false); logout?.() }}
                      className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      <LogOut className="h-4 w-4 text-gray-400" />
                      Log out
                    </button>
                  </div>
                )}
              </div>

              {/* Settings icon */}
              <button
                type="button"
                title="Settings"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setShellToast('Settings coming soon')}
              >
                <Settings className="h-[18px] w-[18px]" />
              </button>
            </div>
          </header>}

          {/* Section content */}
          <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
            <div className="mx-auto max-w-[1560px] space-y-6">

              {/* overview — empty state for 0 bookings */}
              {activeSection === 'overview' && (
                hasBookings
                  ? <OverviewSection
                      bookings={bookings}
                      setActiveSection={setActiveSection}
                      setSelectedBookingId={(id) => { setSelectedBookingId(id); setActiveSection('tracking') }}
                      setQuery={setQuery}
                      setPresetFilter={(preset) => {
                        setPresetFilter(preset as import('../sections/BookingsSection').BookingFilterPreset)
                        setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('section', 'bookings'); return n }, { replace: false })
                      }}
                      onViewFinance={(tab) => { setFinanceInitialTab(tab); setActiveSection('finance') }}
                      onGoToReports={() => setActiveSection('reports')}
                    />
                  : <EmptyBookingsState onCreateBooking={() => setActiveSection('create')} />
              )}

              {/* bookings — empty state for 0 bookings */}
              {activeSection === 'bookings' && (
                hasBookings
                  ? <BookingsSection
                      bookings={bookings}
                      query={query}
                      setQuery={setQuery}
                      selectedBookingId={selectedBookingId}
                      setSelectedBookingId={(id) => { setSelectedBookingId(id); setActiveSection('tracking') }}
                      setActiveSection={setActiveSection}
                      presetFilter={presetFilter}
                      onViewFinance={() => setActiveSection('finance')}
                      onTrackBooking={(id) => { setSelectedBookingId(id); setActiveSection('tracking') }}
                    />
                  : <EmptyBookingsState onCreateBooking={() => setActiveSection('create')} />
              )}

              {activeSection === 'create' && (
                <CreateBookingSection
                  bridge={bridge}
                  displayName={displayName}
                  editingBookingId={editingBookingId}
                  onCreated={(id) => { setSelectedBookingId(id); setActiveSection('bookings') }}
                />
              )}

              {/* tracking — empty state for 0 bookings; TrackingSection handles no-selection internally */}
              {activeSection === 'tracking' && (
                hasBookings
                  ? <TrackingSection
                      selectedBooking={selectedBooking}
                      detailTab={detailTab}
                      setDetailTab={setDetailTab}
                      bridge={bridge}
                      onCreateBooking={() => setActiveSection('create')}
                      setActiveSection={setActiveSection}
                      onEditBooking={(id) => { setEditingBookingId(id); setActiveSection('create') }}
                    />
                  : <EmptyBookingsState onCreateBooking={() => setActiveSection('create')} />
              )}

              {/* finance + reports render regardless of booking count */}
              {activeSection === 'finance'  && (
                <FinanceSection
                  bookings={bookings}
                  initialTab={financeInitialTab}
                  onViewBooking={(id) => { setSelectedBookingId(id); setActiveSection('tracking') }}
                  invoices={bridge?.invoices}
                  onApprove={bridge?.approveInvoice}
                  onDispute={bridge?.disputeInvoice}
                  onRequestResubmission={bridge?.requestResubmission}
                  onReject={bridge?.rejectInvoice}
                  onReplyToDispute={bridge?.replyToDispute}
                />
              )}
              {activeSection === 'reports'  && (
                <ReportsSection
                  bookings={bookings}
                  onGoToBookings={(preset) => {
                    setPresetFilter(preset as import('../sections/BookingsSection').BookingFilterPreset)
                    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('section', 'bookings'); return n }, { replace: false })
                  }}
                  onViewFinance={(tab) => { setFinanceInitialTab(tab); setActiveSection('finance') }}
                />
              )}

            </div>
          </main>
        </div>
      </div>

      {/* ── Mobile bottom tab bar (hidden on lg+) ─────────────────────────── */}
      {/* Shell toast */}
      {shellToast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-white shadow-lg lg:bottom-6">
          {shellToast}
        </div>
      )}

      {!embedded && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-gray-200 bg-white lg:hidden">
          {NAV_ITEMS.map((item) => {
            const Icon   = item.icon
            const active = activeSection === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold transition-colors ${
                  active ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-gray-400'}`} />
                <span className="truncate">{item.label}</span>
                {active && <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-primary" />}
              </button>
            )
          })}
        </nav>
      )}

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
