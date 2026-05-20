import React, { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@shared-auth/context/AuthContext'
import { LoginShell } from '@shared-auth/components/LoginShell'
import { ForgotPassword } from '@shared-auth/components/ForgotPassword'
import { ResetPassword } from '@shared-auth/components/ResetPassword'
import { PostLoginDashboard } from '@shared-auth/components/PostLoginDashboard'
import { ProtectedRoute } from '@shared-auth/guards/RouteGuard'
import './styles.css'

const AuctionApp = lazy(() => import('@auction/app/AdminApp'))
const VendorApp = lazy(() => import('@vendor/app/VendorApp'))
const FleetApp = lazy(() => import('@fleet/app/FleetApp'))
const CustomerApp = lazy(() => import('@customer/app/CustomerApp'))
const TrackTraceApp = lazy(() => import('@track-trace/app/TrackTraceApp'))
const PlatformAdminApp = lazy(() => import('@platform-admin/app/PlatformAdminApp'))
const TenantAdminApp = lazy(() => import('@tenant-admin/app/TenantAdminApp'))
const TmsBookingApp = lazy(() => import('@tms-booking/app/TmsBookingApp'))
const TmsDriverAppApp = lazy(() => import('@tms-driver-app/app/TmsDriverAppApp'))

const Fallback = (
  <div style={{ alignItems: 'center', color: '#64748b', display: 'flex', fontSize: 14, justifyContent: 'center', minHeight: '100vh' }}>
    Loading…
  </div>
)

interface HostErrorBoundaryProps {
  children: ReactNode
}

interface HostErrorBoundaryState {
  error: Error | null
}

class HostErrorBoundary extends Component<HostErrorBoundaryProps, HostErrorBoundaryState> {
  state: HostErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): HostErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Optimile host runtime error', error, errorInfo)
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div style={{ background: '#fff7ed', color: '#7c2d12', fontFamily: 'ui-sans-serif, system-ui, sans-serif', minHeight: '100vh', padding: '32px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #fdba74', borderRadius: '16px', margin: '0 auto', maxWidth: '720px', padding: '24px' }}>
          <h1 style={{ fontSize: '24px', margin: '0 0 12px' }}>Host app crashed while rendering</h1>
          <p style={{ lineHeight: 1.5, margin: '0 0 16px' }}>
            This usually means a shared login, auth, or routing component threw a runtime error before the page could paint.
          </p>
          <pre style={{ background: '#fff7ed', borderRadius: '12px', fontSize: '13px', margin: 0, overflowX: 'auto', padding: '16px', whiteSpace: 'pre-wrap' }}>
            {this.state.error.stack ?? this.state.error.message}
          </pre>
        </div>
      </div>
    )
  }
}

function EntryRoute() {
  const { getPostLoginRoute, isAuthenticated, loading } = useAuth()

  if (loading) return Fallback

  if (!isAuthenticated) {
    return <LoginShell />
  }

  return <Navigate to={getPostLoginRoute()} replace />
}

function HostRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={Fallback}>
          <Routes>
            {/* Auth pages */}
            <Route path="/login" element={<LoginShell />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Post-login dashboard / module selector */}
            <Route path="/modules" element={
              <ProtectedRoute>
                <PostLoginDashboard />
              </ProtectedRoute>
            } />

            {/* Module apps — all protected */}
            <Route path="/auction/*" element={<ProtectedRoute portal="auction"><AuctionApp /></ProtectedRoute>} />
            <Route path="/vendor/*" element={<ProtectedRoute portal="vendor"><VendorApp /></ProtectedRoute>} />
            <Route path="/fleet/*" element={<ProtectedRoute portal="fleet"><FleetApp /></ProtectedRoute>} />
            <Route path="/customer/*" element={<ProtectedRoute portal="customer"><CustomerApp /></ProtectedRoute>} />
            <Route path="/tracking/*" element={<ProtectedRoute portal="tracking"><TrackTraceApp /></ProtectedRoute>} />

            {/* Extracted console modules */}
            <Route path="/platform-admin/*" element={<ProtectedRoute portal="platform-admin"><PlatformAdminApp /></ProtectedRoute>} />
            <Route path="/tenant-admin/*" element={<ProtectedRoute portal="tenant-admin"><TenantAdminApp /></ProtectedRoute>} />
            <Route path="/tms/booking/*" element={<ProtectedRoute portal="tms"><TmsBookingApp /></ProtectedRoute>} />
            <Route path="/driver-app/*" element={<ProtectedRoute portal="driver-app"><TmsDriverAppApp /></ProtectedRoute>} />

            {/* Default */}
            <Route path="/" element={<EntryRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HostErrorBoundary>
      <HostRouter />
    </HostErrorBoundary>
  </React.StrictMode>
)
