import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { Badge } from '@vendor/components/ui/badge'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDateTime } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { Bell, CheckCheck, Filter } from 'lucide-react'

type FilterMode = 'ALL' | 'UNREAD'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore()
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL')

  const filtered = useMemo(() => {
    const base = [...notifications].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    return filterMode === 'UNREAD' ? base.filter((item) => !item.isRead) : base
  }, [filterMode, notifications])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Activity</p>
          <h1 className="text-3xl font-semibold">Notifications</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={filterMode === 'ALL' ? 'default' : 'outline'} onClick={() => setFilterMode('ALL')}>
            <Filter className="mr-2 h-4 w-4" /> All
          </Button>
          <Button variant={filterMode === 'UNREAD' ? 'default' : 'outline'} onClick={() => setFilterMode('UNREAD')}>
            <Bell className="mr-2 h-4 w-4" /> Unread
          </Button>
          <Button variant="outline" onClick={markAllNotificationsRead}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No notifications" description="Nothing to show in the current filter." />
      ) : (
        <div className="space-y-3">
          {filtered.map((notification) => (
            <Card key={notification.id} className={notification.isRead ? 'bg-muted/20' : 'border-primary/20'}>
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{notification.title}</h2>
                    <Badge variant={notification.isRead ? 'muted' : 'default'}>{notification.type}</Badge>
                    {!notification.isRead && <Badge variant="destructive">Unread</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      markNotificationRead(notification.id)
                      navigate(notification.deepLink)
                    }}
                  >
                    Open
                  </Button>
                  {!notification.isRead && (
                    <Button variant="ghost" onClick={() => markNotificationRead(notification.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
