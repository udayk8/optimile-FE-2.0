import React, { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  AuthProvider,
  ForgotPassword,
  LoginShell,
  PostLoginDashboard,
  ProtectedRoute,
  ResetPassword,
  useAuth,
} from '@shared-auth'
import { ShellLayout, buildShellChildRoutes, getDefaultLandingPath } from './shell/registry'
import './styles.css'

const CustomerApp = lazy(() => import('@customer/app/CustomerApp'))
const TrackingApp = lazy(() => import('@track-trace/app/TrackTraceApp'))
const PlatformAdminApp = lazy(() => import('@platform-admin/app/PlatformAdminApp'))
const TmsBookingApp = lazy(() => import('@tms-booking/app/TmsBookingApp'))
const TmsDriverAppApp = lazy(() => import('@tms-driver-app/app/TmsDriverAppApp'))

const Fallback = (
  <div style={{ alignItems: 'center', color: '#64748b', display: 'flex', fontSize: 14, justifyContent: 'center', minHeight: '100vh' }}>
    Loading...
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

  return <Navigate to={getPostLoginRoute() || getDefaultLandingPath()} replace />
}

function DefaultRedirect() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return Fallback

  return <Navigate to={isAuthenticated ? getDefaultLandingPath() : '/login'} replace />
}

function LegacyTenantRedirect() {
  const location = useLocation()
  const nextPath = location.pathname.replace(/^\/tenant\//, '/platform-admin/tenant/')
  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />
}

function TenantAdminLoginRedirect() {
  const location = useLocation()
  return <Navigate to={`/platform-admin/tenant-login${location.search}${location.hash}`} replace />
}

function HostRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={Fallback}>
          <Routes>
            <Route path="/login" element={<LoginShell />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
              path="/modules"
              element={
                <ProtectedRoute>
                  <PostLoginDashboard />
                </ProtectedRoute>
              }
            />

            <Route element={<ShellLayout />}>
              {buildShellChildRoutes()}
            </Route>

            <Route path="/customer/*" element={<ProtectedRoute portal="customer"><CustomerApp /></ProtectedRoute>} />
            <Route path="/tracking/*" element={<ProtectedRoute portal="tracking"><TrackingApp /></ProtectedRoute>} />
            <Route path="/admin/*" element={<ProtectedRoute portal="admin"><PlatformAdminApp /></ProtectedRoute>} />
            <Route path="/platform-admin/*" element={<ProtectedRoute portal="platform-admin"><PlatformAdminApp /></ProtectedRoute>} />
            <Route path="/tenant/*" element={<ProtectedRoute portal="platform-admin"><LegacyTenantRedirect /></ProtectedRoute>} />
            <Route path="/tenant-admin/login" element={<TenantAdminLoginRedirect />} />
            <Route path="/tenant-admin/*" element={<Navigate to="/platform-admin/dashboard" replace />} />
            <Route path="/tms/booking/*" element={<ProtectedRoute portal="tms"><TmsBookingApp /></ProtectedRoute>} />
            <Route path="/driver-app/*" element={<ProtectedRoute portal="driver-app"><TmsDriverAppApp /></ProtectedRoute>} />

            <Route path="/" element={<EntryRoute />} />
            <Route path="*" element={<DefaultRedirect />} />
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
  </React.StrictMode>,
)
