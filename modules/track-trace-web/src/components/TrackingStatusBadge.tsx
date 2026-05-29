import { Badge } from '@shared-ui'
import type { TrackingStatus } from '../types/tracking.types'

function getVariant(status: TrackingStatus) {
  switch (status) {
    case 'Completed':
    case 'Near Destination':
      return 'success' as const
    case 'Delayed':
    case 'Route Deviated':
    case 'Offline':
      return 'destructive' as const
    case 'Idle':
    case 'Stopped':
    case 'At Pickup':
    case 'Loading':
    case 'At Checkpoint':
      return 'warning' as const
    case 'Cancelled':
      return 'muted' as const
    default:
      return 'default' as const
  }
}

export function TrackingStatusBadge({
  status,
  description,
}: {
  status: TrackingStatus
  description?: string
}) {
  return (
    <div className="space-y-1">
      <Badge variant={getVariant(status)}>{status}</Badge>
      {description ? <p className="text-xs text-gray-500">{description}</p> : null}
    </div>
  )
}
