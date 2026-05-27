import {
  AlertTriangle,
  BellRing,
  CheckCheck,
  Clock3,
  MapPin,
  Navigation,
  ShieldAlert,
  Timer,
  UserRound,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import { Card } from '@shared-ui'
import type { TrackingAlertRecord } from '../types/alert.types'

function severityTone(severity: TrackingAlertRecord['severity']) {
  switch (severity) {
    case 'Critical':
      return {
        card: 'border-danger/25 bg-danger/5',
        badge: 'bg-danger text-white',
        icon: 'bg-danger/10 text-danger',
      }
    case 'High':
      return {
        card: 'border-warning/30 bg-warning/5',
        badge: 'bg-warning text-white',
        icon: 'bg-warning/10 text-warning',
      }
    case 'Medium':
      return {
        card: 'border-primary/20 bg-primary/5',
        badge: 'bg-primary text-white',
        icon: 'bg-primary/10 text-primary',
      }
    default:
      return {
        card: 'border-secondary/20 bg-secondary/5',
        badge: 'bg-secondary text-white',
        icon: 'bg-secondary/10 text-secondary',
      }
  }
}

function statusTone(status: TrackingAlertRecord['status']) {
  switch (status) {
    case 'Open':         return 'bg-danger/10 text-danger'
    case 'Acknowledged': return 'bg-warning/10 text-warning'
    default:             return 'bg-success/10 text-success'
  }
}

function alertIcon(type: string) {
  const t = type.toLowerCase()
  if (t.includes('sos'))                               return ShieldAlert
  if (t.includes('offline') || t.includes('stale'))   return WifiOff
  if (t.includes('overspeed') || t.includes('speed')) return Zap
  if (t.includes('deviation') || t.includes('route')) return Navigation
  if (t.includes('delay'))                             return Timer
  if (t.includes('idle'))                              return Clock3
  if (t.includes('checkpoint'))                        return MapPin
  if (t.includes('geofence'))                          return MapPin
  if (t.includes('online'))                            return Wifi
  return BellRing
}

function formatRelativeAge(timestamp: string) {
  const diffMs = new Date(timestamp).getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute')
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour')
  return formatter.format(Math.round(diffHours / 24), 'day')
}

type TrackingAlertCardProps = {
  alert: TrackingAlertRecord
  compact?: boolean
  selected?: boolean
  onSelectTrip?: (tripId: string) => void
}

export function TrackingAlertCard({ alert, compact = false, selected = false, onSelectTrip }: TrackingAlertCardProps) {
  const tone = severityTone(alert.severity)
  const latestRemark = alert.remarks?.[alert.remarks.length - 1]
  const clickable = Boolean(onSelectTrip)
  const Icon = alertIcon(alert.type)

  return (
    <Card
      className={`p-4 ${tone.card} ${selected ? 'ring-2 ring-inset ring-primary/25' : ''} ${clickable ? 'cursor-pointer transition hover:brightness-95' : ''}`}
      onClick={clickable ? () => onSelectTrip?.(alert.tripId) : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide ${tone.badge}`}>
              {alert.severity}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(alert.status)}`}>
              {alert.status}
            </span>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-gray-600">
              {formatRelativeAge(alert.createdAt)}
            </span>
          </div>

          <div className="mt-3">
            <p className="text-sm font-extrabold text-text">{alert.type}</p>
            <p className="mt-1 text-sm leading-6 text-text">{alert.message}</p>
          </div>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className={`mt-4 grid gap-3 text-sm text-gray-700 ${compact ? 'grid-cols-2' : 'md:grid-cols-3'}`}>
        <div className="rounded-xl bg-white/80 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Trip</p>
          <p className="mt-1 font-semibold text-text">{alert.tripId}</p>
          <p className="text-xs text-gray-500">{alert.vehicleNumber}</p>
        </div>
        <div className="rounded-xl bg-white/80 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Location</p>
          <p className="mt-1 font-semibold text-text">{alert.location}</p>
          <p className="text-xs text-gray-500">{new Date(alert.createdAt).toLocaleString()}</p>
        </div>
        {!compact && (
          <div className="rounded-xl bg-white/80 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Ownership</p>
            <p className="mt-1 font-semibold text-text">{alert.assignedTo ?? 'Unassigned'}</p>
            <p className="text-xs text-gray-500">
              {alert.assignedTo ? 'Active owner on alert' : 'Needs operator assignment'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {clickable && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
            {selected ? 'Focused on map' : 'Focus trip on map'}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 font-semibold text-gray-600">
          <UserRound className="h-3.5 w-3.5" />
          {alert.assignedTo ?? 'Assignment pending'}
        </span>
        {alert.status === 'Acknowledged' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 font-semibold text-warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            Under investigation
          </span>
        )}
        {alert.status === 'Resolved' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 font-semibold text-success">
            <CheckCheck className="h-3.5 w-3.5" />
            {alert.resolvedBy ? `Resolved by ${alert.resolvedBy}` : 'Resolved'}
          </span>
        )}
      </div>

      {latestRemark && (
        <div className="mt-4 rounded-xl border border-white/80 bg-white/70 px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Latest remark</p>
          <p className="mt-1 text-sm leading-6 text-text">{latestRemark}</p>
        </div>
      )}
    </Card>
  )
}
