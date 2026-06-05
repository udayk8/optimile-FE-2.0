import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useAppStore } from '@vendor/stores/app.store'
import { useModuleNavigate } from '@vendor/hooks/useModuleRoute'

/**
 * Vendor notification bell for a top bar. Badge shows the live unread count;
 * the popover lists the latest items and a View-all action that lands on the
 * vendor notifications page. Works in both mounts — the standalone /vendor
 * app and the tenant-shell embed (/tenant/:id/vendor-portal) — because
 * useModuleNavigate rebases the deep links onto the active mount path.
 */
export function HeaderNotificationBell() {
  const navigate = useModuleNavigate()
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[340px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <p className="px-1 text-sm font-semibold text-gray-900">Notifications</p>
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
                      {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />}
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-gray-900">{n.title}</span>
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
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-900 transition hover:bg-gray-50"
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
