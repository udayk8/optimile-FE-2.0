import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
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

    if (isAuthenticated || selectedPortal !== 'auction' || !authMode) return

    const demoUser =
      isCeoRole(role ?? undefined)
        ? MOCK_USERS.find((item) => item.role === 'ADMIN')
        : MOCK_USERS.find((item) => item.role === 'PROCUREMENT') ?? MOCK_USERS[0]

    if (demoUser) {
      setAuth(demoUser, `${authMode}-admin-token`)
    }
  }, [isAuthenticated, setAuth])

  return (
    <div className="flex min-h-screen bg-background text-text">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        {user?.status === 'SUSPENDED' && (
          <div className="border-b border-warning/30 bg-warning/10 px-6 py-2.5 text-center text-sm text-warning">
            This demo user is suspended. Read-only access is recommended.
          </div>
        )}

        <TopBar />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
