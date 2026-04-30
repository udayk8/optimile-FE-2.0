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
} from '@shared-auth'
import './styles.css'

const AdminApp    = lazy(() => import('@admin/app/AdminApp'))
const VendorApp   = lazy(() => import('@vendor/app/VendorApp'))
const FleetApp    = lazy(() => import('@fleet/app/FleetApp'))
const DriverApp   = lazy(() => import('@driver/app/DriverApp'))
const CustomerApp = lazy(() => import('@customer/app/CustomerApp'))

const Fallback = (
  <div style={{ alignItems: 'center', color: '#64748b', display: 'flex', fontSize: 14, justifyContent: 'center', minHeight: '100vh' }}>
    Loading…
  </div>
)

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
            <Route path="/auction/*"  element={<ProtectedRoute portal="auction"><AdminApp /></ProtectedRoute>} />
            <Route path="/vendor/*"   element={<ProtectedRoute portal="vendor"><VendorApp /></ProtectedRoute>} />
            <Route path="/fleet/*"    element={<ProtectedRoute portal="fleet"><FleetApp /></ProtectedRoute>} />
            <Route path="/driver/*"   element={<ProtectedRoute portal="driver"><DriverApp /></ProtectedRoute>} />
            <Route path="/customer/*" element={<ProtectedRoute portal="customer"><CustomerApp /></ProtectedRoute>} />

            {/* Legacy redirects */}
            <Route path="/admin/*"                  element={<Navigate to="/auction/dashboard" replace />} />
            <Route path="/admin/fleet-management/*" element={<Navigate to="/fleet" replace />} />

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
