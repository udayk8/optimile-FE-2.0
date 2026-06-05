import { AuthProvider } from '@shared-auth'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { MockStoreProvider } from '../shared/store/mock-store'
import { SessionProvider } from '../shared/auth/session-context'
import { ThemeProvider } from '../components/layout/theme-provider'
import { BookingLayout } from '../layouts/booking/booking-layout'
import { BookingListPage } from '../modules/tms/booking/BookingList'
import { CreateBookingPage } from '../modules/tms/booking/CreateBooking'
import { RateApprovalQueuePage } from '../modules/tms/booking/RateApprovalQueue'
import { AssignmentQueuePage } from '../modules/tms/booking/AssignmentQueue'
import { LiveTrackingPlaceholderPage, PODCompletedPage } from '../modules/tms/booking/BookingSupportPages'
import { BookingDetailsPage } from '../modules/tms/booking/BookingDetails'
import { BookingDocumentsPage } from '../modules/tms/booking/BookingDocumentsPage'
import { BookingLRViewPage } from '../modules/tms/booking/BookingLRView'
import { CustomerBridgeProvider } from '../integration/CustomerBridgeProvider'

const SESSION_CONTEXT_KEY = 'optimile.session.context'

type CustomerSession = {
  loginType: string
  customerId: string
  customerName: string
  tenantId?: string
}

function readCustomerSession(): CustomerSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_CONTEXT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CustomerSession>
    if (parsed.loginType !== 'CUSTOMER' || !parsed.customerId) return null
    return parsed as CustomerSession
  } catch {
    return null
  }
}

/**
 * Wraps BookingLayout with CustomerBridgeProvider when the active session
 * belongs to a customer login. For operator sessions it renders BookingLayout
 * directly with no bridge — preserving existing behaviour.
 */
function TenantBookingShell() {
  const { tenantId = '' } = useParams<{ tenantId: string }>()
  const customerSession = readCustomerSession()

  if (customerSession) {
    return (
      <CustomerBridgeProvider
        tenantId={tenantId}
        customerId={customerSession.customerId}
        customerName={customerSession.customerName}
      >
        <BookingLayout />
      </CustomerBridgeProvider>
    )
  }

  return <BookingLayout />
}

function TmsBookingRoutes() {
  return (
    <Routes>
      <Route
        element={
          <ThemeProvider>
            <SessionProvider>
              <MockStoreProvider>
                <Outlet />
              </MockStoreProvider>
            </SessionProvider>
          </ThemeProvider>
        }
      >
        <Route index element={<Navigate to="tenant/tenant-northstar/bookings" replace />} />
        <Route path="tenant/:tenantId" element={<TenantBookingShell />}>
          <Route path="bookings" element={<BookingListPage />} />
          <Route path="bookings/create" element={<CreateBookingPage />} />
          <Route path="bookings/rate-approval" element={<RateApprovalQueuePage />} />
          <Route path="bookings/assignment" element={<AssignmentQueuePage />} />
          <Route path="bookings/live-tracking" element={<LiveTrackingPlaceholderPage />} />
          <Route path="bookings/completed" element={<PODCompletedPage />} />
          <Route path="bookings/:bookingId/edit" element={<CreateBookingPage />} />
          <Route path="bookings/:bookingId/documents" element={<BookingDocumentsPage />} />
          <Route path="bookings/:bookingId/lr" element={<BookingLRViewPage />} />
          <Route path="bookings/:bookingId" element={<BookingDetailsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="tenant/tenant-northstar/bookings" replace />} />
      </Route>
    </Routes>
  )
}

export default function TmsBookingApp({ standalone = false }: { standalone?: boolean }) {
  const routes = <TmsBookingRoutes />

  if (standalone) {
    return (
      <AuthProvider>
        <BrowserRouter>
          {routes}
        </BrowserRouter>
      </AuthProvider>
    )
  }

  return routes
}

