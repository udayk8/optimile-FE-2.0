import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { Badge } from '@vendor/components/ui/badge'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { PageHero } from '@shared-ui/page-hero'
import { formatDateTime } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { Bell, CheckCheck, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import type { NotificationCategory } from '@vendor/types'

type ReadFilter = 'ALL' | 'UNREAD'

const PAGE_SIZE = 10

const TYPE_LABELS: Record<NotificationCategory, string> = {
  ONBOARDING: 'Onboarding',
  SOURCING: 'Sourcing',
  CONTRACTS: 'Contracts',
  TRIPS: 'Trips',
  INVOICES: 'Invoices',
}

const ALL_TYPES = Object.keys(TYPE_LABELS) as NotificationCategory[]

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore()

  const [readFilter, setReadFilter] = useState<ReadFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<NotificationCategory | null>(null)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return [...notifications]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .filter((n) => {
        if (readFilter === 'UNREAD' && n.isRead) return false
        if (typeFilter && n.type !== typeFilter) return false
        return true
      })
  }, [notifications, readFilter, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const setReadFilterAndReset = (f: ReadFilter) => { setReadFilter(f); setPage(1) }
  const setTypeFilterAndReset = (t: NotificationCategory | null) => { setTypeFilter(t); setPage(1) }

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Activity"
        title="Notifications"
        subtitle="Track operational alerts, workflow updates, and read-state activity from one place."
        icon={<Bell className="h-5 w-5 text-primary" />}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant={readFilter === 'ALL' ? 'default' : 'outline'}
              onClick={() => setReadFilterAndReset('ALL')}
            >
              <Filter className="mr-2 h-4 w-4" /> All
            </Button>
            <Button
              variant={readFilter === 'UNREAD' ? 'default' : 'outline'}
              onClick={() => setReadFilterAndReset('UNREAD')}
            >
              <Bell className="mr-2 h-4 w-4" />
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </Button>
            <Button variant="outline" onClick={markAllNotificationsRead}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
            </Button>
          </div>
        }
      />

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilterAndReset(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            typeFilter === null
              ? 'bg-primary text-white'
              : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Types
        </button>
        {ALL_TYPES.map((type) => {
          const count = notifications.filter((n) => n.type === type && (readFilter === 'ALL' || !n.isRead)).length
          return (
            <button
              key={type}
              onClick={() => setTypeFilterAndReset(typeFilter === type ? null : type)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                typeFilter === type
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {TYPE_LABELS[type]}
              {count > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                  typeFilter === type ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Notification list */}
      {paginated.length === 0 ? (
        <EmptyState title="No notifications" description="Nothing to show for the current filter." />
      ) : (
        <div className="space-y-3">
          {paginated.map((notification) => (
            <Card
              key={notification.id}
              className={notification.isRead ? 'bg-gray-50/60' : 'border-primary/20 bg-white'}
            >
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-text">{notification.title}</h2>
                    <Badge variant="secondary" className="rounded-full text-[11px] font-semibold uppercase tracking-wide">
                      {notification.type}
                    </Badge>
                    {!notification.isRead && (
                      <Badge variant="destructive" className="rounded-full text-[11px]">Unread</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{notification.message}</p>
                  <p className="mt-2 text-xs text-gray-400">{formatDateTime(notification.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      markNotificationRead(notification.id)
                      navigate(notification.deepLink)
                    }}
                  >
                    Open
                  </Button>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[60px] text-center text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
