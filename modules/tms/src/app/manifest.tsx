import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { CirclePlus, ClipboardList, FileDigit, Truck, Waypoints } from 'lucide-react'
import type { ModuleManifest } from '@shared-ui'
import { MockStoreProvider } from '../shared/store/mock-store'
import { SessionProvider } from '../shared/auth/session-context'
import { BookingListPage } from '../modules/tms/booking/BookingList'
import { CreateBookingPage } from '../modules/tms/booking/CreateBooking'
import { RateApprovalQueuePage } from '../modules/tms/booking/RateApprovalQueue'
import { AssignmentQueuePage } from '../modules/tms/booking/AssignmentQueue'
import { LiveTrackingPlaceholderPage, PODCompletedPage } from '../modules/tms/booking/BookingSupportPages'
import { BookingDetailsPage } from '../modules/tms/booking/BookingDetails'
import { BookingDocumentsPage } from '../modules/tms/booking/BookingDocumentsPage'
import { BookingLRViewPage } from '../modules/tms/booking/BookingLRView'
import type { RouteObject } from 'react-router-dom'

function TmsRouteWrapper({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <MockStoreProvider>{children}</MockStoreProvider>
    </SessionProvider>
  )
}

function TmsContent({ children }: { children: ReactNode }) {
  return <div className="min-w-0 overflow-x-hidden px-4 py-6 text-sm text-foreground sm:px-6 lg:px-8">{children}</div>
}

const TMS_BOOKING_ROOT = '/tms/booking'

type TmsRouteConfig = {
  shellPath: string
  legacyPath: string
  element: ReactNode
}

const tmsSidebarItems = [
  { label: 'Create Booking', path: `${TMS_BOOKING_ROOT}/bookings/create`, icon: CirclePlus },
  { label: 'Booking List', path: `${TMS_BOOKING_ROOT}/bookings`, icon: ClipboardList },
  { label: 'Rate Approval Queue', path: `${TMS_BOOKING_ROOT}/bookings/rate-approval`, icon: FileDigit },
  { label: 'Assignment Queue', path: `${TMS_BOOKING_ROOT}/bookings/assignment`, icon: Truck },
  { label: 'In Transit / Control Tower', path: `${TMS_BOOKING_ROOT}/bookings/live-tracking`, icon: Waypoints },
  { label: 'Completed / POD', path: `${TMS_BOOKING_ROOT}/bookings/completed`, icon: ClipboardList },
] as const

const tmsRouteConfigs: TmsRouteConfig[] = [
  { shellPath: 'bookings', legacyPath: 'tenant/:tenantId/bookings', element: <TmsContent><BookingListPage /></TmsContent> },
  { shellPath: 'bookings/create', legacyPath: 'tenant/:tenantId/bookings/create', element: <TmsContent><CreateBookingPage /></TmsContent> },
  { shellPath: 'bookings/rate-approval', legacyPath: 'tenant/:tenantId/bookings/rate-approval', element: <TmsContent><RateApprovalQueuePage /></TmsContent> },
  { shellPath: 'bookings/assignment', legacyPath: 'tenant/:tenantId/bookings/assignment', element: <TmsContent><AssignmentQueuePage /></TmsContent> },
  { shellPath: 'bookings/live-tracking', legacyPath: 'tenant/:tenantId/bookings/live-tracking', element: <TmsContent><LiveTrackingPlaceholderPage /></TmsContent> },
  { shellPath: 'bookings/completed', legacyPath: 'tenant/:tenantId/bookings/completed', element: <TmsContent><PODCompletedPage /></TmsContent> },
  { shellPath: 'bookings/:bookingId/edit', legacyPath: 'tenant/:tenantId/bookings/:bookingId/edit', element: <TmsContent><CreateBookingPage /></TmsContent> },
  { shellPath: 'bookings/:bookingId/documents', legacyPath: 'tenant/:tenantId/bookings/:bookingId/documents', element: <TmsContent><BookingDocumentsPage /></TmsContent> },
  { shellPath: 'bookings/:bookingId/lr', legacyPath: 'tenant/:tenantId/bookings/:bookingId/lr', element: <TmsContent><BookingLRViewPage /></TmsContent> },
  { shellPath: 'bookings/:bookingId', legacyPath: 'tenant/:tenantId/bookings/:bookingId', element: <TmsContent><BookingDetailsPage /></TmsContent> },
]

function withLegacyAlias(config: TmsRouteConfig): RouteObject[] {
  return [
    { path: config.shellPath, element: config.element },
    { path: config.legacyPath, element: config.element },
  ]
}

export const tmsBookingManifest: ModuleManifest = {
  key: 'tms-booking',
  label: 'TMS Booking',
  icon: Truck,
  basePath: '/tms/booking',
  sidebar: [...tmsSidebarItems],
  wrapper: TmsRouteWrapper,
  routes: [
    { index: true, element: <Navigate to={`${TMS_BOOKING_ROOT}/bookings`} replace /> },
    ...tmsRouteConfigs.flatMap(withLegacyAlias),
    { path: '*', element: <Navigate to={`${TMS_BOOKING_ROOT}/bookings`} replace /> },
  ],
}
