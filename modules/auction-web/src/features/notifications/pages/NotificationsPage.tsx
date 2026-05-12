import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent } from '@auction/components/ui/card'
import { formatDateTime } from '@auction/lib/date-utils'
import { useAppStore } from '@auction/stores/app.store'
import type { AuctionNotificationCategory } from '@auction/types'

const PAGE_SIZE = 10

const TYPE_LABELS: Record<AuctionNotificationCategory, string> = {
  AUCTIONS: 'Auctions',
  AWARDS: 'Awards',
  CONTRACTS: 'Contracts',
  SOURCING: 'Sourcing',
  SYSTEM: 'System',
}

const TYPE_BADGE: Record<AuctionNotificationCategory, string> = {
  AUCTIONS: 'bg-blue-50 text-blue-700',
  AWARDS: 'bg-amber-50 text-amber-700',
  CONTRACTS: 'bg-violet-50 text-violet-700',
  SOURCING: 'bg-emerald-50 text-emerald-700',
  SYSTEM: 'bg-gray-100 text-gray-600',
}

const ALL_TYPES = Object.keys(TYPE_LABELS) as AuctionNotificationCategory[]

type ReadFilter = 'ALL' | 'UNREAD'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore()

  const [readFilter, setReadFilter] = useState<ReadFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<AuctionNotificationCategory | null>(null)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() =>
    [...notifications]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .filter((n) => {
        if (readFilter === 'UNREAD' && n.isRead) return false
        if (typeFilter && n.type !== typeFilter) return false
        return true
      }),
    [notifications, readFilter, typeFilter]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const resetPage = () => setPage(1)

  return (
    <div className="space-y-5">
      <HeroCard
        eyebrow="Activity"
        title="Notifications"
        subtitle="Auction events, award deadlines, contract alerts, and sourcing updates."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant={readFilter === 'ALL' ? 'default' : 'outline'}
              onClick={() => { setReadFilter('ALL'); resetPage() }}
            >
              <Filter className="mr-2 h-4 w-4" /> All
            </Button>
            <Button
              variant={readFilter === 'UNREAD' ? 'default' : 'outline'}
              onClick={() => { setReadFilter('UNREAD'); resetPage() }}
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
          onClick={() => { setTypeFilter(null); resetPage() }}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${typeFilter === null ? 'bg-[#2563EB] text-white' : 'border border-[#E5E7EB] bg-white text-[#64748B] hover:bg-[#F8FAFC]'}`}
        >
          All Types
        </button>
        {ALL_TYPES.map((type) => {
          const count = notifications.filter((n) => n.type === type && (readFilter === 'ALL' || !n.isRead)).length
          return (
            <button
              key={type}
              onClick={() => { setTypeFilter(typeFilter === type ? null : type); resetPage() }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${typeFilter === type ? 'bg-[#2563EB] text-white' : 'border border-[#E5E7EB] bg-white text-[#64748B] hover:bg-[#F8FAFC]'}`}
            >
              {TYPE_LABELS[type]}
              {count > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${typeFilter === type ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {paginated.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CBD5E1] p-10 text-center text-sm text-[#64748B]">
          No notifications for the current filter.
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((n) => (
            <Card
              key={n.id}
              className={n.isRead ? 'bg-[#F8FAFC]' : 'border-[#DBEAFE] bg-white'}
            >
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-[#0F172A]">{n.title}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_BADGE[n.type]}`}>
                      {TYPE_LABELS[n.type]}
                    </span>
                    {!n.isRead && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">Unread</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[#475569]">{n.message}</p>
                  <p className="mt-2 text-xs text-[#94A3B8]">{formatDateTime(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      markNotificationRead(n.id)
                      navigate(n.deepLink)
                    }}
                  >
                    Open
                  </Button>
                  {!n.isRead && (
                    <Button variant="ghost" size="sm" onClick={() => markNotificationRead(n.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-4">
          <p className="text-sm text-[#64748B]">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[60px] text-center text-sm text-[#64748B]">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
