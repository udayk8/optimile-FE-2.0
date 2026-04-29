import { useState, useEffect } from 'react'
import { cn } from '@vendor/utils/cn'
import { getCountdown, formatCountdown } from '@vendor/utils/date-utils'

interface SLACountdownProps {
  deadline: string
  className?: string
  showLabel?: boolean
}

export function SLACountdown({ deadline, className, showLabel = true }: SLACountdownProps) {
  const [countdown, setCountdown] = useState(() => getCountdown(deadline))

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdown(deadline))
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  if (countdown.isExpired) {
    return (
      <span className={cn('text-sm font-mono font-semibold text-destructive', className)}>
        {showLabel && <span className="text-xs font-sans mr-1">SLA</span>}
        EXPIRED
      </span>
    )
  }

  return (
    <span
      className={cn(
        'text-sm font-mono font-semibold',
        countdown.isUrgent ? 'text-destructive' : 'text-warning',
        className
      )}
    >
      {showLabel && <span className="text-xs font-sans mr-1">SLA</span>}
      {formatCountdown(countdown.minutes, countdown.seconds)}
    </span>
  )
}
