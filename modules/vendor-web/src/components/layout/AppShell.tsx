import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useVendorAuth } from '@vendor/hooks/useVendorAuth'

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, loading, vendor } = useVendorAuth()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    if (!loading && isAuthenticated && vendor?.status === 'ONBOARDING_INCOMPLETE' && !location.pathname.startsWith('/vendor/onboarding')) {
      navigate('/vendor/onboarding', { replace: true })
    }
  }, [isAuthenticated, loading, navigate, vendor?.status, location.pathname])

  if (loading || !isAuthenticated) return null

  return (
    <div className="optimile-vendor-root flex min-h-screen bg-background text-text">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Suspended / Blacklisted banners */}
        {vendor?.status === 'SUSPENDED' && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-center text-sm text-amber-700">
            ⚠️ Your account is <strong>suspended</strong>. You cannot accept indents or participate in sourcing events.
          </div>
        )}
        {vendor?.status === 'ONBOARDING_INCOMPLETE' && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-2.5 text-center text-sm text-blue-700 flex items-center justify-center gap-3">
            <span>Your vendor profile is incomplete. Finish onboarding to unlock full access.</span>
            <Link to="/vendor/onboarding" className="font-medium underline">
              Continue setup
            </Link>
          </div>
        )}
        {vendor?.status === 'UNDER_REVIEW' && (
          <div className="bg-sky-50 border-b border-sky-200 px-6 py-2.5 text-center text-sm text-sky-700">
            Your vendor profile is under review.
          </div>
        )}
        {vendor?.status === 'REJECTED' && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-center text-sm text-red-700">
            Your vendor profile was rejected. Update the profile and resubmit for review.
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
