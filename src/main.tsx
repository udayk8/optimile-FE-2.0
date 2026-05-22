import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import {
  AuthProvider,
  ForgotPassword,
  LoginShell,
  ProtectedRoute,
  ResetPassword,
  useAuth,
} from '@shared-auth'
import { ModuleHost } from './shell/ModuleHost'
import { MODULE_MANIFESTS } from './shell/registry'
import { Shell } from './shell/Shell'
import { ShellHome } from './shell/ShellHome'
import './styles.css'

const TrackingApp = lazy(() => import('./tracking/TrackingApp'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const Fallback = (
  <div
    style={{
      alignItems: 'center',
      color: '#64748b',
      display: 'flex',
      fontSize: 14,
      justifyContent: 'center',
      minHeight: '100vh',
    }}
  >
    Loading…
  </div>
)

function DefaultRedirect() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return Fallback
  return <Navigate to={isAuthenticated ? '/home' : '/login'} replace />
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

            {/* Unified shell (sidebar + topbar + module outlet) */}
            <Route
              element={
                <ProtectedRoute>
                  <Shell />
                </ProtectedRoute>
              }
            >
              <Route path="/home" element={<ShellHome />} />
              {MODULE_MANIFESTS.map((manifest) => (
                <Route
                  key={manifest.key}
                  path={`${manifest.basePath.slice(1)}/*`}
                  element={<ModuleHost manifest={manifest} />}
                />
              ))}
            </Route>

            {/* Standalone visibility module — outside the shell. */}
            <Route
              path="/tracking/*"
              element={
                <ProtectedRoute portal="tracking">
                  <TrackingApp />
                </ProtectedRoute>
              }
            />

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
    <QueryClientProvider client={queryClient}>
      <HostRouter />
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  </React.StrictMode>,
)
