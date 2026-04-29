import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import {
  getPortalDashboardPath,
  LoginShell,
  ProtectedRoute,
  storeDemoLogin,
  storeTokenLogin,
  type Portal,
} from '@shared-auth'
import './styles.css'

const AdminApp = lazy(() => import('@admin/app/AdminApp'))
const VendorApp = lazy(() => import('@vendor/app/VendorApp'))
const FleetApp = lazy(() => import('@fleet/app/FleetApp'))
const DriverApp = lazy(() => import('@driver/app/DriverApp'))
const CustomerApp = lazy(() => import('@customer/app/CustomerApp'))

function HostLogin() {
  const navigate = useNavigate()

  const redirectToPortal = (portal: Portal) => {
    navigate(getPortalDashboardPath(portal))
  }

  return (
    <LoginShell
      defaultPortal="admin"
      defaultEmail="admin@optimile-demo.com"
      defaultPassword="demo123"
      onDemoLogin={({ portal, role }) => {
        storeDemoLogin(portal, role)
        redirectToPortal(portal)
      }}
      onSubmit={({ portal, email, password, rememberMe }) => {
        if (!email || !password) return

        storeTokenLogin(portal)
        if (rememberMe) localStorage.setItem('rememberMe', 'true')
        redirectToPortal(portal)
      }}
    />
  )
}

function HostRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ alignItems: 'center', color: '#64748b', display: 'flex', fontSize: 14, justifyContent: 'center', minHeight: '100vh' }}>Loading portal...</div>}>
        <Routes>
          <Route path="/login" element={<HostLogin />} />
          <Route path="/admin/fleet-management/*" element={<Navigate to="/fleet" replace />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/vendor/*" element={<VendorApp />} />
          <Route path="/fleet/*" element={<ProtectedRoute portal="fleet"><FleetApp /></ProtectedRoute>} />
          <Route path="/driver/*" element={<DriverApp />} />
          <Route path="/customer/*" element={<CustomerApp />} />
          <Route path="/auction/*" element={<Navigate to="/admin/auction/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HostRouter />
  </React.StrictMode>
)
