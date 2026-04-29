import { useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
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

  if (!isAuthenticated && getSelectedPortal() === 'vendor' && getAuthMode()) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm text-[#64748B]">Loading vendor workspace...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Suspended / Blacklisted banners */}
        {vendor?.status === 'SUSPENDED' && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-center text-sm text-amber-700">
            ⚠️ Your account is <strong>suspended</strong>. You cannot accept indents or participate in sourcing events.
          </div>
        )}
        {vendor?.status === 'BLACKLISTED' && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-center text-sm text-red-700">
            🚫 Your account is <strong>blacklisted</strong>. Access is restricted to viewing existing records only.
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
