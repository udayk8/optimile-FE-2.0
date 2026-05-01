import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut } from 'lucide-react'
import { useVendorAuth } from '@vendor/hooks/useVendorAuth'

import { cn } from '@vendor/lib/cn'
import { formatDateTime } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'

const PAGE_TITLES: Record<string, string> = {
  '/vendor': 'Dashboard',
  '/vendor/sourcing': 'Sourcing',
  '/vendor/contracts': 'Contracts',
  '/vendor/trips': 'Trips',
  '/vendor/expenses': 'Expenses',
  '/vendor/fleet': 'Fleet',
  '/vendor/invoices': 'Invoices',
  '/vendor/profile': 'Profile',
}

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path)) return title
  }
  return 'Dashboard'
}

export function TopBar() {
  const { logout, logoutVendorStore, user, vendor } = useVendorAuth()
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const pageTitle = getPageTitle(location.pathname)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsNotificationsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleNotificationClick = (deepLink: string) => {
    setIsNotificationsOpen(false)
    navigate(deepLink)
  }

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left — Module label + Page name */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-medium text-gray-500">Vendor Portal</span>
        <span className="text-gray-300">/</span>
        <h2 className="text-[15px] font-semibold text-text">{pageTitle}</h2>
      </div>

      {/* Right — Notifications + User */}
      <div className="flex items-center gap-4">
        {/* Notification */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((open) => !open)}
            className={cn(
              'relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-100',
              isNotificationsOpen && 'bg-gray-100 ring-2 ring-primary/10'
            )}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={isNotificationsOpen}
          >
            <Bell className="h-[18px] w-[18px] text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-3 w-[360px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-text">Notifications</h3>
                  <p className="text-xs text-gray-600">{unreadCount} unread update{unreadCount === 1 ? '' : 's'}</p>
                </div>
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="text-xs font-medium text-primary hover:text-secondary"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => {
                      markNotificationRead(notification.id)
                      handleNotificationClick(notification.deepLink)
                    }}
                    className="flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-gray-100"
                  >
                    <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', notification.isRead ? 'bg-gray-300' : 'bg-primary')} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-text">{notification.title}</span>
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                          {notification.type}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-gray-600">{notification.message}</span>
                      <span className="mt-1 block text-[11px] text-gray-500">{formatDateTime(notification.createdAt)}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen(false)
                    navigate('/vendor/notifications')
                  }}
                  className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
            {vendor?.tradingName?.charAt(0) || 'V'}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium leading-tight text-text">{vendor?.tradingName || user?.name || 'Vendor'}</div>
            <div className="text-[11px] leading-tight text-gray-500">{user?.role || 'Vendor'} Admin</div>
          </div>
          <button
            onClick={() => {
              logoutVendorStore()
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
