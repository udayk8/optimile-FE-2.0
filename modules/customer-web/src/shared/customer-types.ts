import type { CustomerBookingStatus, CustomerBookingView } from '../integration/customer-data-bridge'

export type BookingStatus = CustomerBookingStatus
export type Booking = CustomerBookingView
export type DetailTab = 'freight' | 'track' | 'timeline' | 'load' | 'documents'
export type CustomerSection = 'overview' | 'bookings' | 'create' | 'tracking' | 'finance' | 'reports'

export type StatusMeta = {
  label: string
  description: string
  badge: 'default' | 'warning' | 'success' | 'destructive' | 'info' | 'muted' | 'outline'
  action: string
}

export const STATUS_META: Record<BookingStatus, StatusMeta> = {
  DRAFT: { label: 'Draft', description: 'Booking saved but not submitted.', badge: 'muted', action: 'Edit, Submit' },
  PENDING_RATE_APPROVAL: { label: 'Processing', description: 'Freight rate is being reviewed internally.', badge: 'warning', action: 'View only' },
  PENDING_AUCTION: { label: 'Vendor Selection', description: 'A transport vendor is being sourced.', badge: 'info', action: 'View only' },
  PENDING_ASSIGNMENT: { label: 'Assigning Vehicle', description: 'Vehicle and driver assignment is in progress.', badge: 'warning', action: 'View only' },
  READY_FOR_DISPATCH: { label: 'Ready for Dispatch', description: 'Vehicle and driver confirmed.', badge: 'default', action: 'View only' },
  DISPATCHED: { label: 'Dispatched', description: 'Vehicle is heading to pickup location.', badge: 'info', action: 'Track' },
  IN_TRANSIT: { label: 'In Transit', description: 'Goods loaded and en route.', badge: 'default', action: 'Track, View ETA' },
  IN_TRANSIT_DELAYED: { label: 'Delayed', description: 'ETA has slipped by more than 2 hours.', badge: 'destructive', action: 'Track, View revised ETA' },
  IN_TRANSIT_EXCEPTION: { label: 'Exception', description: 'Operational issue reported.', badge: 'destructive', action: 'View exception' },
  DELIVERED: { label: 'Delivered', description: 'Delivery confirmed with ePOD.', badge: 'success', action: 'View ePOD, Download LR' },
  CANCELLED: { label: 'Cancelled', description: 'Booking cancelled with reason.', badge: 'outline', action: 'View reason' },
}

export function currency(value: number) {
  return `Rs ${value.toLocaleString('en-IN')}`
}

export function otdClass(value: number) {
  if (value >= 90) return 'text-success'
  if (value >= 80) return 'text-warning'
  return 'text-danger'
}

export function statusCount(list: Booking[], statuses: BookingStatus[]) {
  return list.filter((b) => statuses.includes(b.status)).length
}

export const CONSIGNEE_ANALYTICS = [
  { name: 'Kanodia Cement - Bengaluru DC', trips: 34, otd: 88 },
  { name: 'Apex Retail Hub', trips: 29, otd: 93 },
  { name: 'Central Stock Point', trips: 21, otd: 76 },
  { name: 'South Zone Consignee', trips: 18, otd: 96 },
]

export const FINANCE_TILES = [
  { label: 'Total Freight YTD', value: 'Rs 42.8L', detail: 'Booked freight visible to customer' },
  { label: 'Pending Invoices', value: 'Rs 7.4L', detail: '12 open invoices' },
  { label: 'Average Freight / Trip', value: 'Rs 48.2K', detail: 'Across selected period' },
  { label: 'Overdue Amount', value: 'Rs 1.2L', detail: '2 invoices past credit days' },
]

export const REPORTS = [
  { name: 'Shipment Summary', metrics: 'Total trips, on-time %, cancellation rate, avg TAT', exports: 'PDF, Excel, CSV' },
  { name: 'Lane Performance', metrics: 'OTD by lane, avg freight, delay frequency', exports: 'PDF, Excel, CSV' },
  { name: 'Consignee Report', metrics: 'Trips per consignee, OTD %, avg delivery time', exports: 'PDF, Excel, CSV' },
  { name: 'Freight Spend', metrics: 'Total spend, avg rate per MT, lane variance', exports: 'PDF, Excel, CSV' },
  { name: 'Exception Analysis', metrics: 'Exception count, resolution time, repeat lanes', exports: 'PDF, Excel, CSV' },
  { name: 'Invoice Aging', metrics: 'Open invoices, aging buckets, overdue amount', exports: 'PDF, Excel' },
]

export const BOOKINGS: Booking[] = [
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
