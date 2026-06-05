import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useVendorAuth } from '@vendor/hooks/useVendorAuth'
import { useAppStore } from '@vendor/stores/app.store'
import { useModuleNavigate } from '@vendor/hooks/useModuleRoute'
import { useAuctionNotificationsSync } from '@vendor/integration/auctionBridge'
import { useVendorNotificationsSync } from '@vendor/integration/vendorNotificationsSync'

// Slim notification bar shown on every vendor page (standalone AND embedded
// inside the tenant shell, where the standalone topbar bell isn't rendered).
function NotificationBar() {
  const navigate = useModuleNavigate()
  const { pathname } = useLocation()
  const unreadCount = useAppStore(
    (state) => state.notifications.filter((n) => !n.isRead).length,
  )
  // The notifications page itself doesn't need the bar.
  if (pathname.endsWith('/notifications')) return null
  return (
    <button
      type="button"
      onClick={() => navigate('/vendor/notifications')}
      className={`mb-4 flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition ${
        unreadCount > 0
          ? 'border-primary/30 bg-primary/5 text-text hover:bg-primary/10'
          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
          )}
        </span>
        {unreadCount > 0 ? (
          <span>
            <strong>{unreadCount}</strong> unread notification{unreadCount > 1 ? 's' : ''}
          </span>
        ) : (
          <span>No new notifications</span>
        )}
      </span>
      <span className="font-semibold text-primary">View all</span>
    </button>
  )
}

export function VendorRouteWrapper({ children }: { children: ReactNode }) {
  const { vendor } = useVendorAuth()
  const applyVendorDataset = useAppStore((state) => state.applyVendorDataset)

  // Push auction events (live invites, outbid, ended, won/lost) into the
  // vendor notification feed.
  useAuctionNotificationsSync()
  // P0 operational events: new/expiring indents, POD due, invoice
  // rejection/resubmission, payments received, compliance expiry, account status.
  useVendorNotificationsSync(vendor?.status)

  // Scope the portal data to the logged-in vendor. Blank-listed vendors (e.g.
  // Mahesh Transport) get an empty portal; everyone else keeps the demo data.
  useEffect(() => {
    applyVendorDataset(vendor?.tradingName)
  }, [vendor?.tradingName, applyVendorDataset])

  return (
    <>
      <NotificationBar />
      {vendor?.status === 'SUSPENDED' && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          ⚠️ Your account is <strong>suspended</strong>. You cannot accept indents or participate in sourcing events.
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
