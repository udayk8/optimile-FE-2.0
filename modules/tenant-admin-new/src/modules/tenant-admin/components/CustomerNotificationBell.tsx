import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useCustomerTenantDataBridge } from '../integration/customer-bridge-adapter'

type Notif = { id: string; message: string; time: string; bookingId?: string }

function useCustomerNotifications(): Notif[] {
  const bridge = useCustomerTenantDataBridge()
  return useMemo<Notif[]>(() => {
    if (!bridge) return []
    const result: Notif[] = []
    bridge.bookings.filter((b) => b.status === 'IN_TRANSIT_EXCEPTION').forEach((b) => {
      result.push({ id: `exc-${b.id}`, message: `Exception on ${b.id}: ${b.exceptionNote ?? 'Active exception reported.'}`, time: b.lastUpdate, bookingId: b.id })
    })
    bridge.bookings.filter((b) => b.status === 'IN_TRANSIT_DELAYED').forEach((b) => {
      result.push({ id: `del-${b.id}`, message: `${b.id} is running late — revised ETA: ${b.eta}`, time: b.lastUpdate, bookingId: b.id })
    })
    result.push({ id: 'inv-overdue', message: '2 invoices overdue — Rs 70,800 outstanding.', time: 'Jun 5, 2026' })
    return result
  }, [bridge])
}

/**
 * Customer notification bell for the TMS tenant-shell top bar.
 * Mirrors HeaderNotificationBell (vendor) — same badge style, same popover layout.
 */
export function CustomerNotificationBell() {
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)
  const notifications = useCustomerNotifications()
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length
  const latest = notifications.slice(0, 4)

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
        aria-label="Customer notifications"
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
          <p className="px-1 text-sm font-semibold text-gray-900">Customer Notifications</p>
          {latest.length === 0 ? (
            <p className="mt-2 px-1 pb-1 text-xs text-gray-500">No notifications.</p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100">
              {latest.map((n) => {
                const isRead = readIds.has(n.id)
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg px-1.5 py-2 text-left transition hover:bg-gray-50"
                      onClick={() => setReadIds((prev) => new Set([...prev, n.id]))}
                    >
                      <span className="flex items-start gap-2">
                        {!isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />}
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-gray-900 leading-snug">{n.message}</span>
                          <span className="mt-0.5 block text-[11px] text-gray-500">{n.time}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <button
            type="button"
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-900 transition hover:bg-gray-50"
            onClick={() => {
              setReadIds(new Set(notifications.map((n) => n.id)))
              setOpen(false)
            }}
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  )
}
