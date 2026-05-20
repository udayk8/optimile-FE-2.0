import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import {
  AuthProvider,
  LoginShell,
  ForgotPassword,
  ResetPassword,
  PostLoginDashboard,
  ProtectedRoute,
  useAuth,
  type Portal,
} from '@shared-auth'
import './styles.css'

const AuctionApp       = lazy(() => import('@auction/app/AdminApp'))
const VendorApp        = lazy(() => import('@vendor/app/VendorApp'))
const FleetApp         = lazy(() => import('@fleet/app/FleetApp'))
const CustomerApp      = lazy(() => import('@customer/app/CustomerApp'))
const PlatformAdminApp = lazy(() => import('@platform-admin/app/PlatformAdminApp'))
const TenantAdminApp   = lazy(() => import('@tenant-admin/app/TenantAdminApp'))
const TmsBookingApp    = lazy(() => import('@tms-booking/app/TmsBookingApp'))
const TmsDriverAppApp  = lazy(() => import('@tms-driver-app/app/TmsDriverAppApp'))
const TrackingApp      = lazy(() => import('./tracking/TrackingApp'))

const Fallback = (
  <div style={{ alignItems: 'center', color: '#64748b', display: 'flex', fontSize: 14, justifyContent: 'center', minHeight: '100vh' }}>
    Loading…
  </div>
)

const DEV_PORTAL = import.meta.env.VITE_START_PORTAL as Portal | undefined

function seedDirectPortalSession(portal: Portal) {
  const demoSessions: Record<Portal, { email: string; role: string }> = {
    auction: { email: 'auction@pranay.ts.com', role: 'Auction Head' },
    vendor: { email: 'vendor@pranay.ts.com', role: 'Vendor' },
    fleet: { email: 'fleet@uday.ts.com', role: 'Fleet Manager' },
    customer: { email: 'cbd@optimile.com', role: 'CBD' },
    tracking: { email: 'tracking@optimile.com', role: 'Track and Trace' },
    admin: { email: 'ceo@uday.ts.com', role: 'CEO' },
    driver: { email: 'driver@optimile.com', role: 'Driver' },
    'platform-admin': { email: 'platform-admin@optimile.com', role: 'Platform Admin' },
    'tenant-admin': { email: 'tenant-admin@optimile.com', role: 'Tenant Admin' },
    'tms-booking': { email: 'tms-booking@optimile.com', role: 'TMS' },
    'driver-app': { email: 'driver@optimile.com', role: 'Driver' },
    tms: { email: 'tms-booking@optimile.com', role: 'TMS' },
  }

  const session = demoSessions[portal]
  if (!session) return

  localStorage.setItem('authMode', 'demo')
  localStorage.setItem('selectedPortal', portal)
  localStorage.setItem('userRole', session.role)
  localStorage.setItem('optimile_demo_email', session.email)
}

function DefaultRedirect() {
  const { getPostLoginRoute, isAuthenticated, loading } = useAuth()

  if (loading) return Fallback

  return <Navigate to={isAuthenticated ? getPostLoginRoute() : '/login'} replace />
}

function HostRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={Fallback}>
          <Routes>
            {/* Auth pages */}
            <Route path="/login"           element={<LoginShell />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />

            {/* Post-login dashboard / module selector */}
            <Route path="/modules" element={
              <ProtectedRoute>
                <PostLoginDashboard />
              </ProtectedRoute>
            } />

            {/* Module apps — all protected */}
            <Route path="/auction/*"  element={<ProtectedRoute portal="auction"><AuctionApp /></ProtectedRoute>} />
            <Route path="/vendor/*"   element={<ProtectedRoute portal="vendor"><VendorApp /></ProtectedRoute>} />
            <Route path="/fleet/*"    element={<ProtectedRoute portal="fleet"><FleetApp /></ProtectedRoute>} />
            <Route path="/customer/*" element={<ProtectedRoute portal="customer"><CustomerApp /></ProtectedRoute>} />
            <Route path="/tracking/*" element={<ProtectedRoute portal="tracking"><TrackingApp /></ProtectedRoute>} />

            {/* Extracted console modules */}
            <Route path="/admin/*" element={<ProtectedRoute portal="admin"><PlatformAdminApp /></ProtectedRoute>} />
            <Route path="/platform-admin/*" element={<ProtectedRoute portal="platform-admin"><PlatformAdminApp /></ProtectedRoute>} />
            <Route path="/tenant-admin/*"   element={<ProtectedRoute portal="tenant-admin"><TenantAdminApp /></ProtectedRoute>} />
            <Route path="/tms/booking/*"    element={<ProtectedRoute portal="tms-booking"><TmsBookingApp /></ProtectedRoute>} />
            <Route path="/driver-app/*"     element={<ProtectedRoute portal="driver-app"><TmsDriverAppApp /></ProtectedRoute>} />

            {/* Default */}
            <Route path="/" element={<DefaultRedirect />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

function DirectPortalBootstrap() {
  if (DEV_PORTAL) {
    seedDirectPortalSession(DEV_PORTAL)
  }

  switch (DEV_PORTAL) {
    case 'vendor':
      return <VendorApp standalone />
    case 'auction':
      return (
        <BrowserRouter>
          <AuthProvider>
            <AuctionApp standalone />
          </AuthProvider>
        </BrowserRouter>
      )
    default:
      return <HostRouter />
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DirectPortalBootstrap />
  </React.StrictMode>
)
