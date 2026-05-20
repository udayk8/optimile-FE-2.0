import { Badge } from '@vendor/components/ui/badge'
import type { BadgeProps } from '@vendor/components/ui/badge'

type StatusVariant = 'success' | 'warning' | 'destructive' | 'info' | 'muted'

const STATUS_MAP: Record<string, { variant: StatusVariant; label: string }> = {
  // Green statuses
  ACTIVE: { variant: 'success', label: 'Active' },
  APPROVED: { variant: 'success', label: 'Approved' },
  COMPLIANT: { variant: 'success', label: 'Compliant' },
  PAID: { variant: 'success', label: 'Paid' },
  AWARDED: { variant: 'success', label: 'Awarded' },
  RESPONDED: { variant: 'success', label: 'Responded' },
  DELIVERED: { variant: 'success', label: 'Delivered' },
  CONFIRMED: { variant: 'success', label: 'Confirmed' },
  AVAILABLE: { variant: 'success', label: 'Available' },
  VALID: { variant: 'success', label: 'Valid' },
  ACCEPTED: { variant: 'success', label: 'Accepted' },
  VERIFIED: { variant: 'success', label: 'Verified' },
  // Blue statuses
  SUBMITTED: { variant: 'info', label: 'Submitted' },
  QUOTE_SUBMITTED: { variant: 'info', label: 'Quote Submitted' },
  DISPATCHED: { variant: 'info', label: 'Dispatched' },
  IN_TRANSIT: { variant: 'info', label: 'In Transit' },
  QUOTE_REVISED: { variant: 'info', label: 'Quote Revised' },
  AT_DELIVERY: { variant: 'info', label: 'At Delivery' },
  LIVE: { variant: 'info', label: 'Live' },
  EXTENDED: { variant: 'info', label: 'Extended' },
  UNDER_REVIEW: { variant: 'info', label: 'Under Review' },
  // Amber statuses
  PENDING: { variant: 'warning', label: 'Pending' },
  INVITED: { variant: 'warning', label: 'Invited' },
  UPCOMING: { variant: 'warning', label: 'Upcoming' },
  PENDING_VERIFICATION: { variant: 'warning', label: 'Pending Verification' },
  ONBOARDING_INCOMPLETE: { variant: 'warning', label: 'Onboarding Incomplete' },
  EXPIRING_SOON: { variant: 'warning', label: 'Expiring Soon' },
  PARTIALLY_AVAILABLE: { variant: 'warning', label: 'Partially Available' },
  UNDER_MAINTENANCE: { variant: 'warning', label: 'Under Maintenance' },
  // Red statuses
  REJECTED: { variant: 'destructive', label: 'Rejected' },
  EXPIRED: { variant: 'destructive', label: 'Expired' },
  TERMINATED: { variant: 'destructive', label: 'Terminated' },
  BLOCKED: { variant: 'destructive', label: 'Blocked' },
  NOT_AWARDED: { variant: 'destructive', label: 'Not Awarded' },
  SUSPENDED: { variant: 'destructive', label: 'Suspended' },
  BLACKLISTED: { variant: 'destructive', label: 'Blacklisted' },
  DECLINED: { variant: 'destructive', label: 'Declined' },
  NOT_AVAILABLE: { variant: 'destructive', label: 'Not Available' },
  EXCEPTION: { variant: 'destructive', label: 'Exception' },
  // Gray statuses
  DRAFT: { variant: 'muted', label: 'Draft' },
  CLOSED: { variant: 'muted', label: 'Closed' },
  INACTIVE: { variant: 'muted', label: 'Inactive' },
  INVOICED: { variant: 'muted', label: 'Invoiced' },
  REVISED: { variant: 'muted', label: 'Revised' },
  SUPERSEDED: { variant: 'muted', label: 'Superseded' },
}

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: string
  label?: string
}

export function StatusBadge({ status, label, ...props }: StatusBadgeProps) {
  const mapped = STATUS_MAP[status] || { variant: 'muted' as StatusVariant, label: status }
  return (
    <Badge variant={mapped.variant} {...props}>
      {status === 'LIVE' && (
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
      )}
      {label || mapped.label}
    </Badge>
  )
}
