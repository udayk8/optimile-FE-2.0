import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut } from 'lucide-react'
import { clearAuthState, useAuth } from '@shared-auth'
import { useAuthStore } from '@vendor/stores/auth.store'

import { cn } from '@vendor/lib/cn'
import { formatDateTime } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'

const PAGE_TITLES: Record<string, string> = {
  '/home': 'Dashboard',
  '/sourcing': 'Sourcing',
  '/contracts': 'Contracts',
  '/trips': 'Trips',
  '/expenses': 'Expenses',
  '/fleet': 'Fleet',
  '/invoices': 'Invoices',
  '/profile': 'Profile',
}

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path)) return title
  }
  return 'Dashboard'
}

export function TopBar() {
  const { vendor, logout } = useAuthStore()
  const { logout: authLogout } = useAuth()
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
    <header className="sticky top-0 z-30 flex items-center justify-between h-[68px] px-6 bg-white border-b border-[#E5E7EB]">
      {/* Left — Module label + Page name */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-[#94A3B8] font-medium">Vendor Portal</span>
        <span className="text-[#E5E7EB]">/</span>
        <h2 className="text-[15px] font-semibold text-[#0F172A]">{pageTitle}</h2>
      </div>

      {/* Right — Notifications + User */}
      <div className="flex items-center gap-4">
        {/* Notification */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((open) => !open)}
            className={cn(
              'relative flex items-center justify-center w-9 h-9 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] transition-colors',
              isNotificationsOpen && 'bg-[#F8FAFC] ring-2 ring-[#2563EB]/10'
            )}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={isNotificationsOpen}
          >
            <Bell className="h-[18px] w-[18px] text-[#475569]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-[#EF4444] text-white text-[10px] font-bold px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-3 w-[360px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A]">Notifications</h3>
                  <p className="text-xs text-[#64748B]">{unreadCount} unread update{unreadCount === 1 ? '' : 's'}</p>
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
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => {
                      markNotificationRead(notification.id)
                      handleNotificationClick(notification.deepLink)
                    }}
                    className="flex w-full gap-3 border-b border-[#F1F5F9] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[#F8FAFC]"
                  >
                    <span className={cn('mt-1 h-2 w-2 rounded-full shrink-0', notification.isRead ? 'bg-[#CBD5E1]' : 'bg-[#2563EB]')} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-[#0F172A]">{notification.title}</span>
                        <span className="shrink-0 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-[#64748B]">
                          {notification.type}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-[#475569]">{notification.message}</span>
                      <span className="mt-1 block text-[11px] text-[#94A3B8]">{formatDateTime(notification.createdAt)}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="border-t border-[#E5E7EB] px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen(false)
                    navigate('/notifications')
                  }}
                  className="w-full rounded-lg bg-[#F8FAFC] px-3 py-2 text-sm font-medium text-[#2563EB] hover:bg-[#EFF6FF]"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-3 pl-3 border-l border-[#E5E7EB]">
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] font-semibold text-sm">
            {vendor?.tradingName?.charAt(0) || 'V'}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-[#0F172A] leading-tight">{vendor?.tradingName || 'Vendor'}</div>
            <div className="text-[11px] text-[#94A3B8] leading-tight">Vendor Admin</div>
          </div>
          <button
            onClick={() => { clearAuthState(); logout(); authLogout(); navigate('/login', { replace: true }) }}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F8FAFC] transition-colors ml-1"
            title="Logout"
          >
            <LogOut className="h-4 w-4 text-[#94A3B8]" />
          </button>
        </div>
      </div>
    </header>
  )
}
