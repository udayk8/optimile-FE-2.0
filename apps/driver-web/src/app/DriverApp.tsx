import { Navigate, useRoutes } from 'react-router-dom'
import { ProtectedRoute } from '@shared-auth'
import '../styles/global.css'

export default function DriverApp() {
  return useRoutes([
    {
      path: '/driver',
      element: (
        <ProtectedRoute portal="driver">
          <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6 text-[#0F172A]">
            <div>
              <h1 className="text-xl font-semibold">Driver Portal</h1>
              <p className="mt-2 text-sm text-[#64748B]">Driver workspace is ready for module routes.</p>
            </div>
          </div>
        </ProtectedRoute>
      ),
    },
    { path: '*', element: <Navigate to="/driver" replace /> },
  ])
}
