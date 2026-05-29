import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useVendorAuth } from '@vendor/hooks/useVendorAuth'

export function VendorRouteWrapper({ children }: { children: ReactNode }) {
  const { vendor } = useVendorAuth()
  const location = useLocation()
  const onOnboarding = location.pathname.startsWith('/vendor/onboarding')

  return (
    <>
      {vendor?.status === 'SUSPENDED' && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          ⚠️ Your account is <strong>suspended</strong>. You cannot accept indents or participate in sourcing events.
        </div>
      )}
      {vendor?.status === 'ONBOARDING_INCOMPLETE' && !onOnboarding && (
        <div className="mb-4 flex items-center justify-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <span>Your vendor profile is incomplete. Finish onboarding to unlock full access.</span>
          <Link to="/vendor/onboarding" className="font-medium underline">
            Continue setup
          </Link>
        </div>
      )}
      {vendor?.status === 'UNDER_REVIEW' && (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-700">
          Your vendor profile is under review.
        </div>
      )}
      {vendor?.status === 'REJECTED' && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          Your vendor profile was rejected. Update the profile and resubmit for review.
        </div>
      )}
      {vendor?.status === 'BLACKLISTED' && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          🚫 Your account is <strong>blacklisted</strong>. Access is restricted to viewing existing records only.
        </div>
      )}
      {children}
    </>
  )
}
