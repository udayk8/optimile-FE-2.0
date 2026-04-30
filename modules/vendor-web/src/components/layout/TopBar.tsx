import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut } from 'lucide-react'
import { clearAuthState, useAuth } from '@shared-auth'
import { useAuthStore } from '@vendor/stores/auth.store'
import { MOCK_NOTIFICATIONS } from '@vendor/utils/mock-data'
import { cn } from '@vendor/utils/cn'
import { formatDateTime } from '@vendor/utils/date-utils'

const PAGE_TITLES: Record<string, string> = {
  '/vendor/dashboard': 'Dashboard',
  '/vendor/home': 'Dashboard',
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
  const { vendor, logout } = useAuthStore()
  const { logout: authLogout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-6 backdrop-blur">
      {/* Left — Module label + Page name */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Vendor Portal</span>
        <span className="text-gray-300">/</span>
        <h2 className="text-lg font-bold text-text">{pageTitle}</h2>
      </div>

      {/* Right — Notifications + User */}
      <div className="flex items-center gap-4">
        {/* Notification */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((open) => !open)}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white transition-colors hover:bg-gray-50',
              isNotificationsOpen && 'bg-gray-50 ring-4 ring-primary/20'
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
            <div className="absolute right-0 mt-3 w-[360px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div>
                  <h3 className="text-sm font-bold text-text">Notifications</h3>
                  <p className="text-xs text-gray-600">{unreadCount} unread update{unreadCount === 1 ? '' : 's'}</p>
                </div>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {MOCK_NOTIFICATIONS.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification.deepLink)}
                    className="flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-gray-50"
                  >
                    <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', notification.isRead ? 'bg-gray-300' : 'bg-primary')} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-bold text-text">{notification.title}</span>
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
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
            {vendor?.tradingName?.charAt(0) || 'V'}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold leading-tight text-text">{vendor?.tradingName || 'Vendor'}</div>
            <div className="text-xs leading-tight text-gray-500">Vendor Admin</div>
          </div>
          <button
            onClick={() => {
              clearAuthState()
              logout()
              authLogout()
              navigate('/login', { replace: true })
            }}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-50"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    </header>
  )
}
