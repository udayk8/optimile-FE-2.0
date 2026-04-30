import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { getAuthMode, getSelectedPortal } from '@shared-auth'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useAuthStore } from '@vendor/stores/auth.store'
import { MOCK_VENDOR } from '@vendor/utils/mock-data'

export function AppShell() {
  const { vendor, isAuthenticated, setAuth } = useAuthStore()

  useEffect(() => {
    const selectedPortal = getSelectedPortal()
    const authMode = getAuthMode()

    if (isAuthenticated || selectedPortal !== 'vendor' || !authMode) return

    setAuth({ ...MOCK_VENDOR, status: 'ACTIVE' }, `${authMode}-vendor-token`)
  }, [isAuthenticated, setAuth])

  return (
    <div className="flex min-h-screen bg-white text-text">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Suspended / Blacklisted banners */}
        {vendor?.status === 'SUSPENDED' && (
          <div className="border-b border-warning/30 bg-warning/10 px-6 py-2.5 text-center text-sm text-warning">
            ⚠️ Your account is <strong>suspended</strong>. You cannot accept indents or participate in sourcing events.
          </div>
        )}
        {vendor?.status === 'BLACKLISTED' && (
          <div className="border-b border-danger/30 bg-danger/10 px-6 py-2.5 text-center text-sm text-danger">
            🚫 Your account is <strong>blacklisted</strong>. Access is restricted to viewing existing records only.
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
