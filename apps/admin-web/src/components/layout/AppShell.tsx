import { useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { getAuthMode, getSelectedPortal, getSelectedRole, isCeoRole } from '@shared-auth'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useAuthStore } from '@admin/stores/auth.store'
import { MOCK_USERS } from '@admin/utils/mock-data'

export function AppShell() {
  const { user, isAuthenticated, setAuth } = useAuthStore()

  useEffect(() => {
    const selectedPortal = getSelectedPortal()
    const authMode = getAuthMode()
    const role = getSelectedRole()

    if (isAuthenticated || selectedPortal !== 'admin' || !authMode) return

    const demoUser =
      isCeoRole(role ?? undefined)
        ? MOCK_USERS.find((item) => item.role === 'ADMIN')
        : MOCK_USERS.find((item) => item.role === 'PROCUREMENT') ?? MOCK_USERS[0]

    if (demoUser) {
      setAuth(demoUser, `${authMode}-admin-token`)
    }
  }, [isAuthenticated, setAuth])

  if (!isAuthenticated && getSelectedPortal() === 'admin' && getAuthMode()) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm text-[#64748B]">Loading admin workspace...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        {user?.status === 'SUSPENDED' && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-center text-sm text-amber-700">
            This demo user is suspended. Read-only access is recommended.
          </div>
        )}

        <TopBar />

        <main className="flex-1 p-6">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
