import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useVendorAuth } from '@vendor/hooks/useVendorAuth'
import { useAppStore } from '@vendor/stores/app.store'
import { useModuleNavigate } from '@vendor/hooks/useModuleRoute'
import { useAuctionNotificationsSync } from '@vendor/integration/auctionBridge'
import { useVendorNotificationsSync } from '@vendor/integration/vendorNotificationsSync'

// Simple bell on the top right of every vendor page (standalone AND embedded
// inside the tenant shell, where the standalone topbar bell isn't rendered).
// Click opens a small popover with the latest items and a View-all action
// that lands on the notifications page.
function NotificationBell() {
  const navigate = useModuleNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const notifications = useAppStore((state) => state.notifications)
  const unreadCount = notifications.filter((n) => !n.isRead).length
  const latest = [...notifications]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 4)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // The notifications page itself doesn't need the bell.
  if (pathname.endsWith('/notifications')) return null

  return (
    <div className="relative z-20 -mb-2 flex justify-end" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-[340px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <p className="px-1 text-sm font-semibold text-text">Notifications</p>
          {latest.length === 0 ? (
            <p className="mt-2 px-1 pb-1 text-xs text-gray-500">No notifications yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100">
              {latest.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-1.5 py-2 text-left transition hover:bg-gray-50"
                    onClick={() => {
                      setOpen(false)
                      navigate(n.deepLink || '/vendor/notifications')
                    }}
                  >
                    <span className="flex items-start gap-2">
                      {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-text">{n.title}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-gray-500">{n.message}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-gray-50"
            onClick={() => {
              setOpen(false)
              navigate('/vendor/notifications')
            }}
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
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
      <NotificationBell />
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
