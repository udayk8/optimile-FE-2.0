import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut } from 'lucide-react'
import { useAuctionAuth } from '@auction/hooks/useAuctionAuth'
import { useAppStore } from '@auction/stores/app.store'
import { formatDateTime } from '@auction/lib/date-utils'

const PAGE_TITLES: Record<string, string> = {
  '/auction/dashboard': 'Dashboard',
  '/auction/auctions': 'Auctions',
  '/auction/contracts': 'Contracts',
  '/auction/sourcing': 'Sourcing',
  '/auction/rfq-responses': 'RFQ Responses',
  '/auction/bookings': 'Bookings',
  '/auction/notifications': 'Notifications',
}

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path)) return title
  }
  return 'Dashboard'
}

export function TopBar() {
  const { auctionUser, logout } = useAuctionAuth()
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const pageTitle = getPageTitle(location.pathname)
  const unreadCount = notifications.filter((n) => !n.isRead).length
  const initials = auctionUser?.name?.charAt(0)?.toUpperCase() ?? 'A'

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setDropdownOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-medium text-gray-500">Auction Web</span>
        <span className="text-gray-300">/</span>
        <h2 className="text-[15px] font-semibold text-[#0F172A]">{pageTitle}</h2>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notifications bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-100 ${dropdownOpen ? 'bg-gray-100 ring-2 ring-[#DBEAFE]' : ''}`}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell className="h-[18px] w-[18px] text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-[360px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A]">Notifications</h3>
                  <p className="text-xs text-gray-500">{unreadCount} unread</p>
                </div>
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {notifications.slice(0, 10).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      markNotificationRead(n.id)
                      setDropdownOpen(false)
                      navigate(n.deepLink)
                    }}
                    className="flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-gray-50"
                  >
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-gray-300' : 'bg-[#2563EB]'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-[#0F172A]">{n.title}</span>
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                          {n.type}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-gray-600">{n.message}</span>
                      <span className="mt-1 block text-[11px] text-gray-400">{formatDateTime(n.createdAt)}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate('/auction/notifications')
                  }}
                  className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-[#2563EB] hover:bg-[#DBEAFE]"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DBEAFE] text-sm font-semibold text-[#2563EB]">
            {initials}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium leading-tight text-[#0F172A]">{auctionUser?.name ?? 'Demo User'}</div>
            <div className="text-[11px] leading-tight text-gray-500">{auctionUser?.role ?? 'OPS'} · {auctionUser?.tenantName ?? 'Optimile Demo'}</div>
          </div>
          <button
            onClick={() => {
              logout()
              window.location.assign('/login')
            }}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
            title="Logout"
          >
            <LogOut className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    </header>
  )
}
