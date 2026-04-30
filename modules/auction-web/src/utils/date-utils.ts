import { format, formatDistanceToNow, differenceInMinutes, differenceInSeconds, isPast } from 'date-fns'

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy, hh:mm a')
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function getCountdown(deadline: string | Date): {
  minutes: number
  seconds: number
  isExpired: boolean
  isUrgent: boolean
} {
  const target = new Date(deadline)
  const now = new Date()
  const isExpired = isPast(target)
  const totalMinutes = differenceInMinutes(target, now)
  const totalSeconds = differenceInSeconds(target, now)
  const minutes = Math.max(0, Math.floor(totalSeconds / 60))
  const seconds = Math.max(0, totalSeconds % 60)
  const isUrgent = totalMinutes < 30

  return { minutes, seconds, isExpired, isUrgent }
}

export function formatCountdown(minutes: number, seconds: number): string {
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
