import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import {
  AuthProvider,
  LoginShell,
  ForgotPassword,
  ResetPassword,
  ProtectedRoute,
  useAuth,
} from '@shared-auth'
import { ShellLayout, buildShellChildRoutes, getDefaultLandingPath } from './shell/registry'
import './styles.css'

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

function DefaultRedirect() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return Fallback

  return <Navigate to={isAuthenticated ? getDefaultLandingPath() : '/login'} replace />
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

            {/* Unified shell — all in-scope modules render inside this layout */}
            <Route element={<ShellLayout />}>
              {buildShellChildRoutes()}
            </Route>

            {/* Legacy modules still on per-module wrappers */}
            <Route path="/customer/*" element={<ProtectedRoute portal="customer"><CustomerApp /></ProtectedRoute>} />
            <Route path="/tracking/*" element={<ProtectedRoute portal="tracking"><TrackingApp /></ProtectedRoute>} />
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HostRouter />
  </React.StrictMode>
)
