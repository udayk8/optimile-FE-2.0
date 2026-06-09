import type { CustomerBookingStatus, CustomerBookingView } from '../integration/customer-data-bridge'

export type BookingStatus = CustomerBookingStatus
export type Booking = CustomerBookingView
export type DetailTab = 'overview' | 'track' | 'deliveries' | 'timeline' | 'documents'
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
  DELIVERED: { label: 'Completed', description: 'Delivery confirmed with ePOD.', badge: 'success', action: 'View ePOD, Download LR' },
  CANCELLED: { label: 'Cancelled', description: 'Booking cancelled with reason.', badge: 'outline', action: 'View reason' },
}

// ─── Shared status groups — single source of truth ───────────────────────────

export const ACTIVE_STATUSES: BookingStatus[] = [
  'DISPATCHED', 'READY_FOR_DISPATCH',
  'IN_TRANSIT', 'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION',
]
export const PENDING_STATUSES: BookingStatus[] = [
  'DRAFT', 'PENDING_RATE_APPROVAL', 'PENDING_AUCTION',
  'PENDING_ASSIGNMENT', 'READY_FOR_DISPATCH',
]
export const EXCEPTION_STATUSES: BookingStatus[] = [
  'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION',
]
export const TRANSIT_ONLY_STATUSES: BookingStatus[] = [
  'IN_TRANSIT', 'DISPATCHED', 'READY_FOR_DISPATCH',
]

export function canCustomerCancelBooking(status: BookingStatus): boolean {
  return ['DRAFT', 'PENDING_RATE_APPROVAL', 'PENDING_ASSIGNMENT', 'READY_FOR_DISPATCH'].includes(status)
}

export function canCustomerEditBooking(status: BookingStatus): boolean {
  return ['DRAFT', 'PENDING_RATE_APPROVAL', 'PENDING_ASSIGNMENT'].includes(status)
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

