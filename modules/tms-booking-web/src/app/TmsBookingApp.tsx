import { AuthProvider } from '@shared-auth'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { MockStoreProvider } from '../store/mock-store'
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

function TmsBookingRoutes() {
  return (
    <Routes>
      <Route
        element={
          <ThemeProvider>
            <MockStoreProvider>
              <Outlet />
            </MockStoreProvider>
          </ThemeProvider>
        }
      >
        <Route index element={<Navigate to="tenant/tenant-northstar/bookings" replace />} />
        <Route path="tenant/:tenantId" element={<BookingLayout />}>
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
