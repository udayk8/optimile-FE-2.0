import { Navigate, useRoutes } from 'react-router-dom'
import { ProtectedRoute } from '@shared-auth'
import '../styles/global.css'

export default function CustomerApp() {
  return useRoutes([
    {
      path: '/customer',
      element: (
        <ProtectedRoute portal="customer">
          <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6 text-[#0F172A]">
            <div>
              <h1 className="text-xl font-semibold">Customer Portal</h1>
              <p className="mt-2 text-sm text-[#64748B]">Customer workspace is ready for module routes.</p>
            </div>
          </div>
        </ProtectedRoute>
      ),
    },
    { path: '*', element: <Navigate to="/customer" replace /> },
  ])
}
