import { AuthProvider } from '@shared-auth'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { MockStoreProvider } from '../store/mock-store'
import { ThemeProvider } from '../components/layout/theme-provider'
import { DriverAppLayout, DriverLoginPage, DriverDashboardPage, DriverTripsPage, DriverTripDetailsPage, DriverIncidentCenterPage, DriverProfilePage } from '../modules/tms/driver-app/DriverAppPages'

function TmsDriverAppRoutes() {
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
        <Route index element={<Navigate to="tenant/tenant-northstar/driver-app/login" replace />} />
        <Route path="tenant/:tenantId/driver-app" element={<DriverAppLayout />}>
          <Route path="login" element={<DriverLoginPage />} />
          <Route path="dashboard" element={<DriverDashboardPage />} />
          <Route path="trips" element={<DriverTripsPage />} />
          <Route path="trips/:bookingId" element={<DriverTripDetailsPage />} />
          <Route path="incidents" element={<DriverIncidentCenterPage />} />
          <Route path="profile" element={<DriverProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="tenant/tenant-northstar/driver-app/login" replace />} />
      </Route>
    </Routes>
  )
}

export default function TmsDriverAppApp({ standalone = false }: { standalone?: boolean }) {
  const routes = <TmsDriverAppRoutes />

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
