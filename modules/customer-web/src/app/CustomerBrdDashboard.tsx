import { useMemo, useState, type ComponentType } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProtectedRoute, useAuth } from '@shared-auth'
import { Badge } from '@shared-ui/badge'
import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Languages,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  ReceiptText,
  Route,
  Search,
  Send,
  ShieldCheck,
  Truck,
  UserCircle2,
} from 'lucide-react'
import '../styles/global.css'

const SESSION_CONTEXT_KEY = 'optimile.session.context'

type PortalCustomerIdentity = { customerId?: string; customerName?: string; phone?: string }
type CustomerSection = 'overview' | 'bookings' | 'create' | 'tracking' | 'finance' | 'reports'
type BookingStatus =
  | 'DRAFT'
  | 'PENDING_RATE_APPROVAL'
  | 'PENDING_AUCTION'
  | 'PENDING_ASSIGNMENT'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'IN_TRANSIT_DELAYED'
  | 'IN_TRANSIT_EXCEPTION'
  | 'DELIVERED'
  | 'CANCELLED'

type DetailTab = 'freight' | 'track' | 'timeline' | 'load'

type Booking = {
  id: string
  salesOrder: string
  status: BookingStatus
  origin: string
  destination: string
  consignee: string
  vehicle: string
  driver: string
  driverPhone: string
  weight: number
  material: string
  quantity: string
  eta: string
  bookingDate: string
  createdBy: 'ERP' | 'Customer' | 'Ops'
  freight: number
  lrNumber: string
  progress: number
  lastUpdate: string
  avgSpeed: number
  distanceKm: number
  delayedHours?: number
  exceptionNote?: string
  epod?: {
    status: 'Captured' | 'Pending'
    method: 'OTP' | 'Photo + OTP'
    timestamp?: string
    feedback?: string
  }
  consigneeLink: 'Sent and viewed' | 'Sent' | 'Not sent'
  loadStops: Array<{
    destination: string
    material: string
    quantity: string
    weight: number
    tat: string
    pod: 'Captured' | 'Pending' | 'Not applicable'
  }>
  timeline: Array<{ label: string; time: string; state: 'done' | 'current' | 'future' | 'issue' }>
}

type StatusMeta = {
  label: string
  description: string
  badge: 'default' | 'warning' | 'success' | 'destructive' | 'info' | 'muted' | 'outline'
  action: string
}

const STATUS_META: Record<BookingStatus, StatusMeta> = {
  DRAFT: {
    label: 'Draft',
    description: 'Booking saved but not submitted.',
    badge: 'muted',
    action: 'Edit, Submit',
  },
  PENDING_RATE_APPROVAL: {
    label: 'Processing',
    description: 'Freight rate is being reviewed internally.',
    badge: 'warning',
    action: 'View only',
  },
  PENDING_AUCTION: {
    label: 'Vendor Selection',
    description: 'A transport vendor is being sourced.',
    badge: 'info',
    action: 'View only',
  },
  PENDING_ASSIGNMENT: {
    label: 'Assigning Vehicle',
    description: 'Vehicle and driver assignment is in progress.',
    badge: 'warning',
    action: 'View only',
  },
  READY_FOR_DISPATCH: {
    label: 'Ready for Dispatch',
    description: 'Vehicle and driver confirmed.',
    badge: 'default',
    action: 'View only',
  },
  DISPATCHED: {
    label: 'Dispatched',
    description: 'Vehicle is heading to pickup location.',
    badge: 'info',
    action: 'Track',
  },
  IN_TRANSIT: {
    label: 'In Transit',
    description: 'Goods loaded and en route.',
    badge: 'default',
    action: 'Track, View ETA',
  },
  IN_TRANSIT_DELAYED: {
    label: 'Delayed',
    description: 'ETA has slipped by more than 2 hours.',
    badge: 'destructive',
    action: 'Track, View revised ETA',
  },
  IN_TRANSIT_EXCEPTION: {
    label: 'Exception',
    description: 'Operational issue reported.',
    badge: 'destructive',
    action: 'View exception',
  },
  DELIVERED: {
    label: 'Delivered',
    description: 'Delivery confirmed with ePOD.',
    badge: 'success',
    action: 'View ePOD, Download LR',
  },
  CANCELLED: {
    label: 'Cancelled',
    description: 'Booking cancelled with reason.',
    badge: 'outline',
    action: 'View reason',
  },
}

const NAV_ITEMS: Array<{ id: CustomerSection; label: string; description: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', description: 'KPIs, alerts, live feed', icon: LayoutDashboard },
  { id: 'bookings', label: 'Bookings', description: 'Lifecycle tabs and list', icon: ClipboardList },
  { id: 'create', label: 'Create Booking', description: 'Customer booking intake', icon: Plus },
  { id: 'tracking', label: 'Track & ePOD', description: 'ETA, milestones, POD', icon: Route },
  { id: 'finance', label: 'Finance', description: 'Invoices and aging', icon: CircleDollarSign },
  { id: 'reports', label: 'Reports', description: 'Shipment analytics exports', icon: BarChart3 },
]

const BOOKINGS: Booking[] = [
  {
    id: 'BK-2401',
    salesOrder: 'SO-77821',
    status: 'IN_TRANSIT_DELAYED',
    origin: 'Mumbai, MH',
    destination: 'Bengaluru, KA',
    consignee: 'Kanodia Cement - Bengaluru DC',
    vehicle: 'MH 12 AB 4421',
    driver: 'R. Kumar',
    driverPhone: '+91 98XX XX4321',
    weight: 24.5,
    material: 'Cement bags',
    quantity: '980 bags',
    eta: 'Today, 19:40',
    bookingDate: '2026-06-01 09:15',
    createdBy: 'Customer',
    freight: 84500,
    lrNumber: 'LR-BLR-0042',
    progress: 68,
    lastUpdate: '8 min ago',
    avgSpeed: 46,
    distanceKm: 986,
    delayedHours: 3.2,
    exceptionNote: 'Rain slowdown near Tumakuru. Revised ETA shared.',
    epod: { status: 'Pending', method: 'Photo + OTP' },
    consigneeLink: 'Sent and viewed',
    loadStops: [
      { destination: 'Bengaluru DC', material: 'Cement bags', quantity: '980 bags', weight: 24.5, tat: '2.1 days', pod: 'Pending' },
    ],
    timeline: [
      { label: 'Booking Created', time: 'Jun 1, 09:15', state: 'done' },
      { label: 'Vehicle Assigned', time: 'Jun 1, 11:20', state: 'done' },
      { label: 'Loading Completed', time: 'Jun 1, 15:45', state: 'done' },
      { label: 'In Transit', time: 'Jun 1, 16:10', state: 'done' },
      { label: 'Delay Alert', time: 'Today, 13:05', state: 'issue' },
      { label: 'ePOD Captured', time: 'Pending', state: 'future' },
    ],
  },
  {
    id: 'BK-2402',
    salesOrder: 'SO-77832',
    status: 'IN_TRANSIT',
    origin: 'Pune, MH',
    destination: 'Hyderabad, TS',
    consignee: 'Apex Retail Hub',
    vehicle: 'MH 14 CD 9012',
    driver: 'S. Patil',
    driverPhone: '+91 97XX XX1188',
    weight: 18.2,
    material: 'Consumer goods',
    quantity: '1,120 cartons',
    eta: 'Tomorrow, 08:10',
    bookingDate: '2026-06-01 13:05',
    createdBy: 'ERP',
    freight: 67200,
    lrNumber: 'LR-HYD-0039',
    progress: 44,
    lastUpdate: '5 min ago',
    avgSpeed: 58,
    distanceKm: 561,
    epod: { status: 'Pending', method: 'Photo + OTP' },
    consigneeLink: 'Sent',
    loadStops: [
      { destination: 'Hyderabad Hub', material: 'Consumer goods', quantity: '1,120 cartons', weight: 18.2, tat: '1.4 days', pod: 'Pending' },
    ],
    timeline: [
      { label: 'Booking Created', time: 'Jun 1, 13:05', state: 'done' },
      { label: 'Vehicle Assigned', time: 'Jun 1, 15:10', state: 'done' },
      { label: 'Loading Completed', time: 'Jun 1, 19:30', state: 'done' },
      { label: 'In Transit', time: 'Jun 1, 20:05', state: 'current' },
      { label: 'ePOD Captured', time: 'Pending', state: 'future' },
    ],
  },
  {
    id: 'BK-2403',
    salesOrder: 'SO-77849',
    status: 'IN_TRANSIT_EXCEPTION',
    origin: 'Indore, MP',
    destination: 'Nagpur, MH',
    consignee: 'Central Stock Point',
    vehicle: 'MP 09 EF 3320',
    driver: 'A. Khan',
    driverPhone: '+91 88XX XX9021',
    weight: 16.8,
    material: 'Auto components',
    quantity: '610 crates',
    eta: 'Today, 22:20',
    bookingDate: '2026-05-31 16:30',
    createdBy: 'Ops',
    freight: 59250,
    lrNumber: 'LR-NGP-0031',
    progress: 57,
    lastUpdate: '12 min ago',
    avgSpeed: 22,
    distanceKm: 448,
    exceptionNote: 'Vehicle breakdown reported. Replacement review in progress.',
    epod: { status: 'Pending', method: 'Photo + OTP' },
    consigneeLink: 'Sent and viewed',
    loadStops: [
      { destination: 'Nagpur Plant', material: 'Auto components', quantity: '610 crates', weight: 16.8, tat: '1.8 days', pod: 'Pending' },
    ],
    timeline: [
      { label: 'Booking Created', time: 'May 31, 16:30', state: 'done' },
      { label: 'Dispatched', time: 'Jun 1, 07:00', state: 'done' },
      { label: 'In Transit', time: 'Jun 1, 08:20', state: 'done' },
      { label: 'Breakdown Reported', time: 'Today, 10:35', state: 'issue' },
      { label: 'Replacement Vehicle', time: 'In review', state: 'current' },
    ],
  },
  {
    id: 'BK-2398',
    salesOrder: 'SO-77791',
    status: 'DELIVERED',
    origin: 'Chennai, TN',
    destination: 'Coimbatore, TN',
    consignee: 'South Zone Consignee',
    vehicle: 'TN 10 GH 5581',
    driver: 'P. Nair',
    driverPhone: '+91 90XX XX3321',
    weight: 12.4,
    material: 'Steel coils',
    quantity: '14 coils',
    eta: 'Delivered',
    bookingDate: '2026-05-29 10:10',
    createdBy: 'ERP',
    freight: 38200,
    lrNumber: 'LR-CBE-0027',
    progress: 100,
    lastUpdate: 'May 30, 18:20',
    avgSpeed: 51,
    distanceKm: 507,
    epod: { status: 'Captured', method: 'Photo + OTP', timestamp: 'May 30, 18:20', feedback: 'Delivered intact. OTP verified.' },
    consigneeLink: 'Sent and viewed',
    loadStops: [
      { destination: 'Coimbatore Warehouse', material: 'Steel coils', quantity: '14 coils', weight: 12.4, tat: '1.3 days', pod: 'Captured' },
    ],
    timeline: [
      { label: 'Booking Created', time: 'May 29, 10:10', state: 'done' },
      { label: 'Loading Completed', time: 'May 29, 15:20', state: 'done' },
      { label: 'In Transit', time: 'May 29, 16:15', state: 'done' },
      { label: 'Reached Destination', time: 'May 30, 17:45', state: 'done' },
      { label: 'ePOD Captured', time: 'May 30, 18:20', state: 'done' },
    ],
  },
  {
    id: 'BK-2404',
    salesOrder: 'SO-77867',
    status: 'PENDING_ASSIGNMENT',
    origin: 'Jaipur, RJ',
    destination: 'Delhi, DL',
    consignee: 'North Retail Depot',
    vehicle: '-',
    driver: 'Masked until assigned',
    driverPhone: '-',
    weight: 9.8,
    material: 'Tiles',
    quantity: '392 boxes',
    eta: 'Awaiting assignment',
    bookingDate: '2026-06-02 08:25',
    createdBy: 'Customer',
    freight: 24100,
    lrNumber: '-',
    progress: 12,
    lastUpdate: '18 min ago',
    avgSpeed: 0,
    distanceKm: 281,
    epod: { status: 'Pending', method: 'Photo + OTP' },
    consigneeLink: 'Not sent',
    loadStops: [
      { destination: 'Delhi Depot', material: 'Tiles', quantity: '392 boxes', weight: 9.8, tat: '1 day', pod: 'Not applicable' },
    ],
    timeline: [
      { label: 'Booking Created', time: 'Today, 08:25', state: 'done' },
      { label: 'Rate Accepted', time: 'Today, 08:28', state: 'done' },
      { label: 'Vehicle Assigned', time: 'Pending', state: 'current' },
      { label: 'Dispatch', time: 'Pending', state: 'future' },
    ],
  },
  {
    id: 'BK-2405',
    salesOrder: 'SO-77870',
    status: 'PENDING_RATE_APPROVAL',
    origin: 'Surat, GJ',
    destination: 'Ahmedabad, GJ',
    consignee: 'West Trade Hub',
    vehicle: '-',
    driver: 'Masked until assigned',
    driverPhone: '-',
    weight: 7.2,
    material: 'Textile bales',
    quantity: '220 bales',
    eta: 'Under review',
    bookingDate: '2026-06-02 11:40',
    createdBy: 'Customer',
    freight: 17800,
    lrNumber: '-',
    progress: 8,
    lastUpdate: '4 min ago',
    avgSpeed: 0,
    distanceKm: 268,
    epod: { status: 'Pending', method: 'Photo + OTP' },
    consigneeLink: 'Not sent',
    loadStops: [
      { destination: 'Ahmedabad Hub', material: 'Textile bales', quantity: '220 bales', weight: 7.2, tat: '1 day', pod: 'Not applicable' },
    ],
    timeline: [
      { label: 'Booking Created', time: 'Today, 11:40', state: 'done' },
      { label: 'Rate Approval', time: 'In review', state: 'current' },
      { label: 'Vendor Selection', time: 'Pending', state: 'future' },
    ],
  },
]

const CONSIGNEE_ANALYTICS = [
  { name: 'Kanodia Cement - Bengaluru DC', trips: 34, otd: 88 },
  { name: 'Apex Retail Hub', trips: 29, otd: 93 },
  { name: 'Central Stock Point', trips: 21, otd: 76 },
  { name: 'South Zone Consignee', trips: 18, otd: 96 },
]

const FINANCE_TILES = [
  { label: 'Total Freight YTD', value: 'Rs 42.8L', detail: 'Booked freight visible to customer' },
  { label: 'Pending Invoices', value: 'Rs 7.4L', detail: '12 open invoices' },
  { label: 'Average Freight / Trip', value: 'Rs 48.2K', detail: 'Across selected period' },
  { label: 'Overdue Amount', value: 'Rs 1.2L', detail: '2 invoices past credit days' },
]

const REPORTS = [
  { name: 'Shipment Summary', metrics: 'Total trips, on-time %, cancellation rate, avg TAT', exports: 'PDF, Excel, CSV' },
  { name: 'Lane Performance', metrics: 'OTD by lane, avg freight, delay frequency', exports: 'PDF, Excel, CSV' },
  { name: 'Consignee Report', metrics: 'Trips per consignee, OTD %, avg delivery time', exports: 'PDF, Excel, CSV' },
  { name: 'Freight Spend', metrics: 'Total spend, avg rate per MT, lane variance', exports: 'PDF, Excel, CSV' },
  { name: 'Exception Analysis', metrics: 'Exception count, resolution time, repeat lanes', exports: 'PDF, Excel, CSV' },
  { name: 'Invoice Aging', metrics: 'Open invoices, aging buckets, overdue amount', exports: 'PDF, Excel' },
]

const NOTIFICATIONS = [
  { id: 'n1', title: 'Delay alert raised for BK-2401', channel: 'In-app + SMS', priority: 'High', time: '8m ago' },
  { id: 'n2', title: 'Vehicle assigned for BK-2404 is pending', channel: 'In-app', priority: 'Medium', time: '18m ago' },
  { id: 'n3', title: 'Invoice generated for BK-2398', channel: 'Email', priority: 'Medium', time: '1h ago' },
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

function currency(value: number) {
  return `Rs ${value.toLocaleString('en-IN')}`
}

function otdClass(value: number) {
  if (value >= 90) return 'text-success'
  if (value >= 80) return 'text-warning'
  return 'text-danger'
}

function statusCount(statuses: BookingStatus[]) {
  return BOOKINGS.filter((booking) => statuses.includes(booking.status)).length
}

export function CustomerDashboardShell({ embedded = false }: { embedded?: boolean } = {}) {
  const { logout, user } = useAuth()
  const portalCustomer = useMemo(() => readPortalCustomerIdentity(), [])
  const displayName = portalCustomer?.customerName ?? user?.name ?? 'Customer Booking Desk'
  const displayRole = portalCustomer ? 'Customer' : user?.role ?? 'CBD'
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
  const [query, setQuery] = useState('')
  const [statusTab, setStatusTab] = useState('all')
  const [detailTab, setDetailTab] = useState<DetailTab>('freight')
  const [selectedBookingId, setSelectedBookingId] = useState(BOOKINGS[0]!.id)

  const selectedBooking = BOOKINGS.find((booking) => booking.id === selectedBookingId) ?? BOOKINGS[0]!
  const activeExceptions = BOOKINGS.filter((booking) => booking.status === 'IN_TRANSIT_DELAYED' || booking.status === 'IN_TRANSIT_EXCEPTION')
  const activeBookings = BOOKINGS.filter((booking) => ['DISPATCHED', 'IN_TRANSIT', 'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION'].includes(booking.status))

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return BOOKINGS.filter((booking) => {
      const matchesSearch =
        !normalizedQuery ||
        `${booking.id} ${booking.salesOrder} ${booking.consignee} ${booking.vehicle} ${booking.origin} ${booking.destination}`
          .toLowerCase()
          .includes(normalizedQuery)
      if (!matchesSearch) return false
      if (statusTab === 'all') return true
      if (statusTab === 'active') return ['DISPATCHED', 'IN_TRANSIT', 'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION'].includes(booking.status)
      if (statusTab === 'pending') return ['DRAFT', 'PENDING_RATE_APPROVAL', 'PENDING_AUCTION', 'PENDING_ASSIGNMENT', 'READY_FOR_DISPATCH'].includes(booking.status)
      if (statusTab === 'completed') return booking.status === 'DELIVERED'
      if (statusTab === 'exceptions') return ['IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION'].includes(booking.status)
      if (statusTab === 'cancelled') return booking.status === 'CANCELLED'
      return true
    })
  }, [query, statusTab])

  const kpis = [
    { label: 'Total Trips', value: BOOKINGS.length, detail: 'Date range: last 30 days', icon: ClipboardList, tone: 'text-primary' },
    { label: 'Active Trips', value: statusCount(['DISPATCHED', 'IN_TRANSIT', 'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION']), detail: '1 delayed, 1 exception', icon: Truck, tone: 'text-success' },
    { label: 'Pending POD', value: statusCount(['IN_TRANSIT', 'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION']), detail: 'Awaiting delivery proof', icon: ClipboardCheck, tone: 'text-warning' },
    { label: 'Completed', value: statusCount(['DELIVERED']), detail: '1 on-time delivery', icon: CheckCircle2, tone: 'text-success' },
    { label: 'Delayed', value: statusCount(['IN_TRANSIT_DELAYED']), detail: '+1 vs yesterday', icon: Clock3, tone: 'text-danger' },
    { label: 'Cancelled', value: statusCount(['CANCELLED']), detail: '0.0% cancellation rate', icon: AlertTriangle, tone: 'text-danger' },
    { label: 'SLA Score', value: '88%', detail: '+4% vs prior period', icon: ShieldCheck, tone: 'text-primary' },
  ]

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
                <>
                  <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                    {kpis.map((kpi) => {
                      const Icon = kpi.icon
                      return (
                        <div key={kpi.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{kpi.label}</p>
                            <Icon className={`h-4 w-4 ${kpi.tone}`} />
                          </div>
                          <p className="mt-3 text-2xl font-extrabold text-text">{kpi.value}</p>
                          <p className="mt-1 text-xs text-gray-500">{kpi.detail}</p>
                        </div>
                      )
                    })}
                  </section>

                  <section className="rounded-lg border border-danger/20 bg-danger/5 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-danger" />
                        <div>
                          <p className="font-extrabold text-text">{activeExceptions.length} active customer-visible exceptions</p>
                          <p className="mt-1 text-sm text-gray-600">
                            {statusCount(['IN_TRANSIT_DELAYED'])} delayed shipment and {statusCount(['IN_TRANSIT_EXCEPTION'])} operational exception require attention.
                          </p>
                        </div>
                      </div>
                      <Button variant="destructive" onClick={() => { setActiveSection('bookings'); setStatusTab('exceptions') }}>
                        View Exceptions
                      </Button>
                    </div>
                  </section>

                  <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <Card>
                      <CardHeader>
                        <CardTitle>Trip Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div>
                          <div className="flex h-7 overflow-hidden rounded-lg bg-gray-100">
                            {[
                              { label: 'Completed', value: 18, color: 'bg-success' },
                              { label: 'Active', value: 42, color: 'bg-primary' },
                              { label: 'Pending POD', value: 11, color: 'bg-warning' },
                              { label: 'Unfulfilled', value: 7, color: 'bg-secondary' },
                              { label: 'Cancelled', value: 2, color: 'bg-danger' },
                            ].map((item) => (
                              <div key={item.label} className={item.color} style={{ width: `${item.value}%` }} title={`${item.label}: ${item.value}`} />
                            ))}
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-5">
                            {['Completed', 'Active', 'Pending POD', 'Unfulfilled', 'Cancelled'].map((label) => (
                              <div key={label} className="text-xs font-semibold text-gray-500">{label}</div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-bold text-text">7-day booking creation trend</p>
                            <Badge variant="success">+12% week over week</Badge>
                          </div>
                          <div className="grid h-40 grid-cols-7 items-end gap-3">
                            {[38, 62, 45, 72, 52, 88, 66].map((height, index) => (
                              <div key={index} className="flex h-full flex-col justify-end gap-2">
                                <div className="rounded-t-lg bg-primary/80" style={{ height: `${height}%` }} />
                                <p className="text-center text-xs font-semibold text-gray-500">D{index + 1}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Live Shipments Feed</CardTitle>
                      </CardHeader>
                      <CardContent className="max-h-[410px] space-y-3 overflow-y-auto">
                        {activeBookings.map((booking) => (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() => { setSelectedBookingId(booking.id); setActiveSection('tracking') }}
                            className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-extrabold text-text">{booking.id}</p>
                                <p className="truncate text-sm text-gray-500">{booking.origin} to {booking.destination}</p>
                              </div>
                              <Badge variant={STATUS_META[booking.status].badge}>{STATUS_META[booking.status].label}</Badge>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                              <span>{booking.vehicle}</span>
                              <span>ETA: {booking.eta}</span>
                              <span>{booking.lastUpdate}</span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${booking.progress}%` }} />
                            </div>
                            {booking.exceptionNote && <p className="mt-2 text-xs font-semibold text-danger">{booking.exceptionNote}</p>}
                          </button>
                        ))}
                      </CardContent>
                    </Card>
                  </section>

                  <section className="grid gap-6 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Consignee Analytics</CardTitle>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left text-sm">
                          <thead className="text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                              <th className="border-b border-gray-200 py-3">Consignee</th>
                              <th className="border-b border-gray-200 py-3">Trips</th>
                              <th className="border-b border-gray-200 py-3">OTD</th>
                            </tr>
                          </thead>
                          <tbody>
                            {CONSIGNEE_ANALYTICS.map((item) => (
                              <tr key={item.name}>
                                <td className="border-b border-gray-100 py-3 font-semibold text-text">{item.name}</td>
                                <td className="border-b border-gray-100 py-3 text-gray-600">{item.trips}</td>
                                <td className={`border-b border-gray-100 py-3 font-extrabold ${otdClass(item.otd)}`}>{item.otd}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Finance Snapshot</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-2">
                        {FINANCE_TILES.map((tile) => (
                          <div key={tile.label} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{tile.label}</p>
                            <p className="mt-2 text-2xl font-extrabold text-text">{tile.value}</p>
                            <p className="mt-1 text-xs text-gray-500">{tile.detail}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </section>
                </>
              )}

              {activeSection === 'bookings' && (
                <section className="space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-text">Bookings</h2>
                      <p className="text-sm text-gray-500">Full lifecycle view aligned to BRD customer statuses.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm"><Filter className="h-4 w-4" /> Filters</Button>
                      <Button variant="outline" size="sm"><FileSpreadsheet className="h-4 w-4" /> CSV</Button>
                      <Button size="sm" onClick={() => setActiveSection('create')}><Plus className="h-4 w-4" /> New Booking</Button>
                    </div>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[
                      ['all', 'All Bookings', BOOKINGS.length],
                      ['active', 'Active', statusCount(['DISPATCHED', 'IN_TRANSIT', 'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION'])],
                      ['pending', 'Pending', statusCount(['DRAFT', 'PENDING_RATE_APPROVAL', 'PENDING_AUCTION', 'PENDING_ASSIGNMENT', 'READY_FOR_DISPATCH'])],
                      ['completed', 'Completed', statusCount(['DELIVERED'])],
                      ['exceptions', 'Exceptions', activeExceptions.length],
                      ['cancelled', 'Cancelled', statusCount(['CANCELLED'])],
                    ].map(([key, label, count]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setStatusTab(String(key))}
                        className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold ${
                          statusTab === key ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                        <span className={`rounded-full px-2 py-0.5 text-xs ${statusTab === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{count}</span>
                      </button>
                    ))}
                  </div>

                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1040px] text-left text-sm">
                          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                              <th className="px-4 py-3">Booking ID</th>
                              <th className="px-4 py-3">Route</th>
                              <th className="px-4 py-3">Vehicle</th>
                              <th className="px-4 py-3">Weight</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">ETA</th>
                              <th className="px-4 py-3">Booking Date</th>
                              <th className="px-4 py-3">Created By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredBookings.map((booking) => (
                              <tr
                                key={booking.id}
                                className="cursor-pointer border-t border-gray-100 hover:bg-primary/5"
                                onClick={() => { setSelectedBookingId(booking.id); setActiveSection('tracking') }}
                              >
                                <td className="px-4 py-4">
                                  <p className="font-extrabold text-primary">{booking.id}</p>
                                  <p className="text-xs text-gray-500">{booking.salesOrder}</p>
                                </td>
                                <td className="px-4 py-4">
                                  <p className="font-semibold text-text">{booking.origin} to {booking.destination}</p>
                                  <p className="text-xs text-gray-500">{booking.consignee}</p>
                                </td>
                                <td className="px-4 py-4 text-gray-600">{booking.vehicle}</td>
                                <td className="px-4 py-4 text-gray-600">{booking.weight} MTS</td>
                                <td className="px-4 py-4"><Badge variant={STATUS_META[booking.status].badge}>{STATUS_META[booking.status].label}</Badge></td>
                                <td className={`px-4 py-4 font-semibold ${booking.status === 'IN_TRANSIT_DELAYED' ? 'text-danger' : 'text-gray-600'}`}>{booking.eta}</td>
                                <td className="px-4 py-4 text-gray-600">{booking.bookingDate}</td>
                                <td className="px-4 py-4 text-gray-600">{booking.createdBy}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}

              {activeSection === 'create' && (
                <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
                  <Card>
                    <CardHeader>
                      <CardTitle>Customer Booking Creation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        {[
                          ['Customer', displayName],
                          ['Origin', 'Select from Location Master'],
                          ['Destination', 'Select from Location Master'],
                          ['Lane', 'Auto-derived from origin and destination'],
                          ['Commodity Type', 'Select from Commodity Master'],
                          ['Vehicle Type', 'Select from Vehicle Type Master'],
                          ['Loading Date/Time', 'Future date-time picker'],
                          ['Material Quantity & UOM', 'Numeric input with UOM'],
                          ['Goods Value', 'E-way bill required above Rs 50,000'],
                          ['Special Instructions', 'Hazmat, fragile, temperature-sensitive'],
                        ].map(([label, placeholder]) => (
                          <label key={label} className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
                            <input className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20" placeholder={placeholder} />
                          </label>
                        ))}
                      </div>
                      <div className="rounded-lg border border-primary/10 bg-primary/5 p-4">
                        <p className="text-sm font-bold text-text">Post-submission routing</p>
                        <p className="mt-1 text-sm text-gray-600">
                          Rate deviation sends the booking to Processing. Approved vendor sourcing moves to Vendor Selection. Own-fleet shipments move to Assigning Vehicle.
                        </p>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button variant="outline">Save Draft</Button>
                        <Button><Send className="h-4 w-4" /> Submit Booking</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Validation Sources</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {['Customer Master', 'Location Master', 'Lane Master', 'Commodity Master', 'Vehicle Type Master', 'Finance AR rules'].map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span className="text-sm font-semibold text-gray-700">{item}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </section>
              )}

              {(activeSection === 'tracking' || activeSection === 'finance' || activeSection === 'reports') && activeSection === 'tracking' && (
                <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle>Booking Detail Panel</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <select
                        value={selectedBookingId}
                        onChange={(event) => setSelectedBookingId(event.target.value)}
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
                      >
                        {BOOKINGS.map((booking) => <option key={booking.id} value={booking.id}>{booking.id} - {booking.consignee}</option>)}
                      </select>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xl font-extrabold text-text">{selectedBooking.id}</p>
                            <p className="text-sm text-gray-500">{selectedBooking.origin} to {selectedBooking.destination}</p>
                          </div>
                          <Badge variant={STATUS_META[selectedBooking.status].badge}>{STATUS_META[selectedBooking.status].label}</Badge>
                        </div>
                        <p className="mt-3 text-sm text-gray-600">{STATUS_META[selectedBooking.status].description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <Info label="LR Number" value={selectedBooking.lrNumber} />
                        <Info label="Freight" value={currency(selectedBooking.freight)} />
                        <Info label="Vehicle" value={selectedBooking.vehicle} />
                        <Info label="Driver" value={selectedBooking.driver} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <CardTitle>{selectedBooking.id} Details</CardTitle>
                        <div className="flex flex-wrap gap-2">
                          {[
                            ['freight', 'Freight Details'],
                            ['track', 'Track'],
                            ['timeline', 'Activity Timeline'],
                            ['load', 'Load Details'],
                          ].map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setDetailTab(key as DetailTab)}
                              className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                                detailTab === key ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {detailTab === 'freight' && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <Info label="Sales Order" value={selectedBooking.salesOrder} />
                          <Info label="Created By" value={selectedBooking.createdBy} />
                          <Info label="Booking Date" value={selectedBooking.bookingDate} />
                          <Info label="Material" value={selectedBooking.material} />
                          <Info label="Quantity" value={selectedBooking.quantity} />
                          <Info label="Weight" value={`${selectedBooking.weight} MTS`} />
                          <Info label="Driver Contact" value={`${selectedBooking.driver} / ${selectedBooking.driverPhone}`} />
                          <Info label="Customer Action" value={STATUS_META[selectedBooking.status].action} />
                        </div>
                      )}

                      {detailTab === 'track' && (
                        <div className="space-y-5">
                          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                            <div className="text-center">
                              <MapPin className="mx-auto h-10 w-10 text-primary" />
                              <p className="mt-3 font-extrabold text-text">Live GPS Map</p>
                              <p className="text-sm text-gray-500">Updated every 5-10 minutes through tracking integration.</p>
                            </div>
                          </div>
                          <div className="grid gap-3 md:grid-cols-4">
                            <Info label="ETA" value={selectedBooking.eta} />
                            <Info label="Average Speed" value={`${selectedBooking.avgSpeed} km/h`} />
                            <Info label="Total Distance" value={`${selectedBooking.distanceKm} km`} />
                            <Info label="Consignee Link" value={selectedBooking.consigneeLink} />
                          </div>
                          <div>
                            <div className="mb-2 flex justify-between text-sm font-semibold text-gray-600">
                              <span>Trip Progress</span>
                              <span>{selectedBooking.progress}%</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full bg-primary" style={{ width: `${selectedBooking.progress}%` }} />
                            </div>
                          </div>
                        </div>
                      )}

                      {detailTab === 'timeline' && (
                        <div className="space-y-3">
                          {selectedBooking.timeline.map((event) => (
                            <div key={`${event.label}-${event.time}`} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3">
                              <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                                event.state === 'done' ? 'bg-success' : event.state === 'issue' ? 'bg-danger' : event.state === 'current' ? 'bg-warning' : 'bg-gray-300'
                              }`} />
                              <div>
                                <p className="font-bold text-text">{event.label}</p>
                                <p className="text-sm text-gray-500">{event.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {detailTab === 'load' && (
                        <div className="space-y-4">
                          {selectedBooking.loadStops.map((stop) => (
                            <div key={stop.destination} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-extrabold text-text">{stop.destination}</p>
                                  <p className="text-sm text-gray-500">{stop.material} - {stop.quantity}</p>
                                </div>
                                <Badge variant={stop.pod === 'Captured' ? 'success' : 'warning'}>{stop.pod}</Badge>
                              </div>
                              <div className="mt-3 grid gap-3 md:grid-cols-3">
                                <Info label="Weight" value={`${stop.weight} MTS`} />
                                <Info label="TAT" value={stop.tat} />
                                <Info label="ePOD" value={`${selectedBooking.epod?.status ?? 'Pending'} ${selectedBooking.epod?.timestamp ?? ''}`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>
              )}

              {activeSection === 'finance' && (
                <section className="space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-text">Finance Snapshot</h2>
                    <p className="text-sm text-gray-500">Customer-facing AR visibility from freight, invoice, and payment data.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {FINANCE_TILES.map((tile) => (
                      <Card key={tile.label}>
                        <CardContent className="p-5">
                          <ReceiptText className="h-5 w-5 text-primary" />
                          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500">{tile.label}</p>
                          <p className="mt-2 text-2xl font-extrabold text-text">{tile.value}</p>
                          <p className="mt-1 text-sm text-gray-500">{tile.detail}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Invoice Aging</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-5">
                      {['0-15 days', '16-30 days', '31-45 days', '46-60 days', '60+ days'].map((bucket, index) => (
                        <div key={bucket} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{bucket}</p>
                          <p className="mt-2 text-xl font-extrabold text-text">Rs {[2.4, 3.1, 1.9, 0.8, 0.4][index] ?? 0}L</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </section>
              )}

              {activeSection === 'reports' && (
                <section className="space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-text">Reports & Analytics</h2>
                    <p className="text-sm text-gray-500">Downloadable operational and financial reports for customer teams.</p>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    {REPORTS.map((report) => (
                      <Card key={report.name}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                <p className="font-extrabold text-text">{report.name}</p>
                              </div>
                              <p className="mt-2 text-sm text-gray-600">{report.metrics}</p>
                              <p className="mt-1 text-xs font-semibold text-gray-500">Exports: {report.exports}</p>
                            </div>
                            <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
                <Card>
                  <CardHeader>
                    <CardTitle>Notifications & Alerting</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-3">
                    {NOTIFICATIONS.map((notification) => (
                      <div key={notification.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-start gap-3">
                          <Bell className="mt-0.5 h-4 w-4 text-primary" />
                          <div>
                            <p className="font-bold text-text">{notification.title}</p>
                            <p className="mt-1 text-xs text-gray-500">{notification.channel} - {notification.time}</p>
                            <Badge className="mt-3" variant={notification.priority === 'High' ? 'destructive' : 'default'}>{notification.priority}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cross-Module Sources</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      ['TMS', 'Bookings, statuses, milestones'],
                      ['Track & Trace', 'GPS, ETA, progress, geofences'],
                      ['Driver App', 'Loading, exception, ePOD capture'],
                      ['Finance AR', 'Invoice status and payment aging'],
                      ['Notification Engine', 'In-app, SMS, email alerts'],
                    ].map(([module, detail]) => (
                      <div key={module} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div>
                          <p className="text-sm font-extrabold text-text">{module}</p>
                          <p className="text-xs text-gray-500">{detail}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text">{value}</p>
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
