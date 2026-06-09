import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, LoginShell, ProtectedRoute } from '@shared-auth'
import { CustomerDashboardShell } from './CustomerBrdDashboard'
import '../styles/global.css'

// Standalone entry for the customer portal, structured like vendor-web's App.tsx:
// AuthProvider supplies the shared auth context, /login renders the shared
// LoginShell, and the portal itself is gated behind ProtectedRoute. (No
// QueryClientProvider/Toaster — customer-web is mock/bridge driven and doesn't
// depend on react-query or sonner.)
//
// Logout is handled inside CustomerDashboardShell via useCustomerLogout (full
// reload + session-context clear); on an unauthenticated state ProtectedRoute
// redirects back to /login.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginShell />} />
          <Route
            path="/customer/*"
            element={
              <ProtectedRoute portal="customer">
                <CustomerDashboardShell />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/customer" replace />} />
          <Route path="*" element={<Navigate to="/customer" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
