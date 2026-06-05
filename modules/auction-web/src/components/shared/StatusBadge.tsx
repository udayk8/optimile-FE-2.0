import { Badge } from '@auction/components/ui/badge'
import type { BadgeProps } from '@auction/components/ui/badge'

type StatusVariant = 'success' | 'warning' | 'destructive' | 'info' | 'muted'

const STATUS_MAP: Record<string, { variant: StatusVariant; label: string }> = {
  ACTIVE: { variant: 'success', label: 'Active' },
  AWARDED: { variant: 'success', label: 'Awarded' },
  LIVE: { variant: 'info', label: 'Live' },
  UPCOMING: { variant: 'warning', label: 'Upcoming' },
  COMPLETED: { variant: 'info', label: 'Pending Award' },
  DRAFT: { variant: 'muted', label: 'Draft' },
  NO_BIDS: { variant: 'warning', label: 'No Bids' },
  EXPIRING_SOON: { variant: 'warning', label: 'Expiring Soon' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
  TERMINATED: { variant: 'destructive', label: 'Terminated' },
  EXPIRED: { variant: 'destructive', label: 'Expired' },
}

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: string
  label?: string
}

export function StatusBadge({ status, label, ...props }: StatusBadgeProps) {
  const mapped = STATUS_MAP[status] || { variant: 'muted' as StatusVariant, label: status }

  return (
    <Badge variant={mapped.variant} {...props}>
      {status === 'LIVE' && <span className="mr-1 h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current" />}
      {label || mapped.label}
    </Badge>
  )
}
