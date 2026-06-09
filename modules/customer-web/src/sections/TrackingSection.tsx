import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Copy,
  Download,
  FileText,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Route,
  Truck,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { Badge } from '@shared-ui/badge'
import { Button } from '@shared-ui/button'
import { Card, CardContent } from '@shared-ui/card'
import type { CustomerDataBridge } from '../integration/customer-data-bridge'
import { STATUS_META, canCustomerCancelBooking, canCustomerEditBooking, currency } from '../shared/customer-types'
import type { Booking, CustomerSection, DetailTab } from '../shared/customer-types'
import { readPortalCustomerIdentity } from '../shared/portal-session'

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  selectedBooking: Booking | undefined
  detailTab: DetailTab
  setDetailTab: (tab: DetailTab) => void
  bridge: CustomerDataBridge | null
  onCreateBooking: () => void
  setActiveSection: (s: CustomerSection) => void
  onEditBooking?: (bookingId: string) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_TRACKING_STATUSES = new Set([
  'DISPATCHED', 'READY_FOR_DISPATCH',
  'IN_TRANSIT', 'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION',
])

const TABS: DetailTab[] = ['overview', 'track', 'deliveries', 'timeline', 'documents']

const TAB_LABELS: Record<DetailTab, string> = {
  overview:   'Overview',
  track:      'Live Tracking',
  deliveries: 'Deliveries',
  timeline:   'Timeline',
  documents:  'Documents',
}

const TIMELINE_STYLE = {
  done:    { icon: CheckCircle2,  ring: 'bg-success/10',  icon_color: 'text-success',  line: 'bg-success/30'  },
  current: { icon: Clock3,        ring: 'bg-warning/10',  icon_color: 'text-warning',  line: 'bg-warning/30'  },
  issue:   { icon: AlertTriangle, ring: 'bg-danger/10',   icon_color: 'text-danger',   line: 'bg-danger/30'   },
  future:  { icon: Circle,        ring: 'bg-gray-100',    icon_color: 'text-gray-300', line: 'bg-gray-200'    },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function etaCountdown(eta: string): string | null {
  const lower = eta.toLowerCase()
  if (/^(delivered|awaiting|under review)/.test(lower)) return null
  const now = new Date()
  let target: Date | null = null
  if (lower.startsWith('today,')) {
    const t = eta.split(',')[1]?.trim()
    if (t) { const [hS, mS] = t.split(':'); target = new Date(now); target.setHours(Number(hS) || 0, Number(mS) || 0, 0, 0) }
  } else if (lower.startsWith('tomorrow,')) {
    const t = eta.split(',')[1]?.trim()
    if (t) { const [hS, mS] = t.split(':'); target = new Date(now); target.setDate(now.getDate() + 1); target.setHours(Number(hS) || 0, Number(mS) || 0, 0, 0) }
  }
  if (!target) return null
  const diff = target.getTime() - now.getTime()
  const abs  = Math.abs(diff)
  const h    = Math.floor(abs / 3_600_000)
  const m    = Math.floor((abs % 3_600_000) / 60_000)
  if (diff < 0) return h > 0 ? `Overdue by ${h}h ${m}m` : `Overdue by ${m}m`
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}

// ─── Page header — mirrors TMS BookingPageHeader ──────────────────────────────

function BookingPageHeader({
  booking,
  customerName,
  onBack,
  onEdit,
  onCancelRequest,
}: {
  booking:          Booking
  customerName?:    string
  onBack:           () => void
  onEdit?:          () => void
  onCancelRequest?: () => void
}) {
  const originCity   = (booking.origin.split(',')[0] ?? booking.origin).trim()
  const destCity     = (booking.destination.split(',')[0] ?? booking.destination).trim()
  const driverKnown  = booking.driver && booking.driver !== 'Masked until assigned' && booking.driver !== 'Unassigned'
  const vehicleKnown = booking.vehicle && booking.vehicle !== '-'
  const canEdit      = canCustomerEditBooking(booking.status)
  const canCancel    = canCustomerCancelBooking(booking.status)

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Back nav + actions row */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Bookings
        </button>

        {/* Action buttons — same position as TMS BookingPageHeader actions */}
        <div className="flex items-center gap-2">
          {canEdit && onEdit && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          {canCancel && onCancelRequest && (
            <Button size="sm" variant="outline" onClick={onCancelRequest}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancel Booking
            </Button>
          )}
        </div>
      </div>

      {/* Title block */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-text">{booking.id}</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {booking.consignee} · {originCity} → {destCity}
        </p>
      </div>

      {/* Status strip — mirrors BookingSummaryStrip */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-100 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Status</p>
          <Badge variant={STATUS_META[booking.status].badge} className="mt-1">
            {STATUS_META[booking.status].label}
          </Badge>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Customer</p>
          <p className="mt-1 text-xs font-semibold text-gray-700">{customerName ?? '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Vehicle</p>
          <p className="mt-1 text-xs font-semibold text-gray-700">
            {vehicleKnown ? booking.vehicle : 'Not assigned'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Driver</p>
          <p className="mt-1 text-xs font-semibold text-gray-700">
            {driverKnown ? booking.driver : 'Not assigned'}
          </p>
        </div>
        {booking.lrNumber && booking.lrNumber !== 'Pending' && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">LR No</p>
            <p className="mt-1 text-xs font-semibold text-gray-700">{booking.lrNumber}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Freight</p>
          <p className="mt-1 text-xs font-semibold text-gray-700">{currency(booking.freight)}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Consignee link tile ───────────────────────────────────────────────────────

function ConsigneeLinkTile({ value }: { value: Booking['consigneeLink'] }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    void navigator.clipboard.writeText('https://track.optimile.in/share/demo')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Consignee Link</p>
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${value === 'Not sent' ? 'bg-gray-300' : 'bg-success'}`} />
          <span className="text-sm font-semibold text-text">{value}</span>
        </div>
        {value !== 'Not sent' ? (
          <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:underline">
            {copied
              ? <><Check className="h-3.5 w-3.5 text-success" /><span className="text-success">Copied!</span></>
              : <><Copy className="h-3.5 w-3.5" />Copy tracking link</>}
          </button>
        ) : (
          <p className="text-xs text-gray-400">Contact your account manager to share tracking with the consignee</p>
        )}
      </div>
    </div>
  )
}

// ─── Destination change panel ─────────────────────────────────────────────────

function DestinationChangePanel({ booking, bridge }: { booking: Booking; bridge: CustomerDataBridge }) {
  const sessionKey = `dest-change-submitted-${booking.id}`
  const [open, setOpen]           = useState(false)
  const [reason, setReason]       = useState('')
  const [submitted, setSubmitted] = useState(() => {
    try { return sessionStorage.getItem(sessionKey) === 'true' } catch { return false }
  })
  const pendingRequest = booking.destinationChangeRequests?.find((r) => r.status === 'PENDING')

  if (submitted || pendingRequest) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="text-sm font-bold text-warning">Destination change request submitted</p>
          <p className="mt-1 text-xs text-gray-500">
            {pendingRequest ? `Reason: ${pendingRequest.reason}` : 'Your request is under review by operations.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      {!open ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-700">Need to change the delivery destination?</p>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Request Change</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-bold text-text">Destination Change Request</p>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Reason</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer warehouse shifted, new consignee address"
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => { setOpen(false); setReason('') }}>Cancel</Button>
            <Button size="sm" onClick={() => {
              if (!reason.trim()) return
              bridge.requestDestinationChange(booking.id, reason.trim())
              try { sessionStorage.setItem(sessionKey, 'true') } catch { /* ignore */ }
              setSubmitted(true)
              setOpen(false)
            }}>Submit Request</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Overview (3-column grid, mirrors TMS) ───────────────────────────────

function OverviewTab({ booking, bridge }: { booking: Booking; bridge: CustomerDataBridge | null }) {
  const showDestChange = bridge && (booking.status === 'IN_TRANSIT' || booking.status === 'IN_TRANSIT_DELAYED')
  const driverKnown    = booking.driver && booking.driver !== 'Masked until assigned' && booking.driver !== 'Unassigned'
  const vehicleKnown   = booking.vehicle && booking.vehicle !== '-'
  const etaKnown       = booking.eta && !/^awaiting/i.test(booking.eta)

  return (
    <div className="space-y-4">
      {booking.exceptionNote && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-bold text-danger">Shipment Alert</p>
            <p className="mt-1 text-sm text-gray-600">{booking.exceptionNote}</p>
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Booking Information */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-900">Booking Information</p>
          <div className="divide-y divide-gray-100">
            <DetailRow label="Booking No"   value={booking.id} />
            <DetailRow label="Sales Order"  value={booking.salesOrder} />
            <DetailRow label="Booking Date" value={booking.bookingDate} />
            <DetailRow label="Created By"   value={booking.createdBy} />
            <DetailRow label="Lane"         value={`${(booking.origin.split(',')[0] ?? booking.origin).trim()} → ${(booking.destination.split(',')[0] ?? booking.destination).trim()}`} />
            <DetailRow label="Deliveries"   value={String(booking.loadStops.length || 1)} />
            <DetailRow label="Qty / Weight" value={`${booking.quantity} / ${booking.weight} MTS`} />
            <DetailRow label="Material"     value={booking.material} />
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-900">Vehicle Information</p>
          <div className="divide-y divide-gray-100">
            <DetailRow label="Vehicle"      value={vehicleKnown ? booking.vehicle : <span className="italic text-gray-400">Not assigned</span>} />
            <DetailRow label="Driver"       value={driverKnown  ? booking.driver  : <span className="italic text-gray-400">Not assigned</span>} />
            {driverKnown && booking.driverPhone && (
              <DetailRow label="Driver Phone" value={booking.driverPhone} />
            )}
            <DetailRow label="LR Number"    value={booking.lrNumber && booking.lrNumber !== 'Pending' ? booking.lrNumber : <span className="italic text-gray-400">Pending</span>} />
            {etaKnown && <DetailRow label="ETA" value={booking.eta} />}
            <DetailRow label="Progress"     value={`${booking.progress}%`} />
            <DetailRow label="Last Update"  value={booking.lastUpdate} />
          </div>
        </div>

        {/* Commercial Information */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-900">Commercial Information</p>
          <div className="divide-y divide-gray-100">
            <DetailRow label="Freight"    value={currency(booking.freight)} />
            <DetailRow label="Weight"     value={`${booking.weight} MTS`} />
            <DetailRow label="Consignee"  value={booking.consignee} />
            <DetailRow
              label="Status"
              value={<Badge variant={STATUS_META[booking.status].badge}>{STATUS_META[booking.status].label}</Badge>}
            />
            <div className="py-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Your Action</p>
              <p className="mt-1 text-sm font-semibold text-primary">{STATUS_META[booking.status].action}</p>
            </div>
          </div>
        </div>
      </div>

      {showDestChange && <DestinationChangePanel booking={booking} bridge={bridge} />}
    </div>
  )
}

// ─── Live route map ───────────────────────────────────────────────────────────
// Mirrors the track-and-trace trip map: a self-contained Google Maps directions
// embed driven by the booking's origin/destination. No extra dependencies — just
// an iframe + the shared VITE_GOOGLE_MAPS_API_KEY. Falls back to a placeholder
// when the key isn't configured. The embed is scaled down so Google's own
// origin/destination panel stays small while the map still fills the card.
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

// Booking addresses use Indian RTO state codes ("Mumbai, MH") that Google's
// directions embed geocodes unreliably — left unfixed it falls back to a global
// world view instead of centering on the route. Expand the code to the full
// state name and anchor to India so the embed resolves both ends and auto-fits.
const IN_STATES: Record<string, string> = {
  MH: 'Maharashtra', KA: 'Karnataka', TS: 'Telangana', TG: 'Telangana', AP: 'Andhra Pradesh',
  TN: 'Tamil Nadu', MP: 'Madhya Pradesh', RJ: 'Rajasthan', DL: 'Delhi', GJ: 'Gujarat',
  UP: 'Uttar Pradesh', WB: 'West Bengal', KL: 'Kerala', PB: 'Punjab', HR: 'Haryana',
  CG: 'Chhattisgarh', OD: 'Odisha', OR: 'Odisha', BR: 'Bihar', JH: 'Jharkhand',
  AS: 'Assam', GA: 'Goa', UK: 'Uttarakhand', UT: 'Uttarakhand', HP: 'Himachal Pradesh', JK: 'Jammu and Kashmir',
}

function geocodeQuery(place: string): string {
  const parts = place.split(',').map((p) => p.trim()).filter(Boolean)
  const lastIdx = parts.length - 1
  const last = parts[lastIdx]?.toUpperCase()
  if (last && IN_STATES[last]) parts[lastIdx] = IN_STATES[last]
  if (!parts.some((p) => /india/i.test(p))) parts.push('India')
  return parts.join(', ')
}

// ─── Tracking devices (mirrors track-trace device switcher) ────────────────────
// The customer Booking view carries no telematics inventory, so we synthesise a
// deterministic device set per booking (GPS / SIM / Driver App) — stable across
// renders for the same booking. Mirrors the track-and-trace trip-detail toggle:
// primary-first ordering, offline devices disabled, switching changes the live
// source + last-ping shown in the map header and Live Status.
type TrackDevice = { id: string; label: 'GPS' | 'SIM' | 'App'; online: boolean; lastPingMin: number }

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function buildTrackingDevices(booking: Booking): [TrackDevice, ...TrackDevice[]] {
  const seed        = hashStr(booking.id)
  const driverKnown = booking.driver && booking.driver !== 'Masked until assigned' && booking.driver !== 'Unassigned'
  const devices: [TrackDevice, ...TrackDevice[]] = [
    { id: `${booking.id}-gps`, label: 'GPS', online: true,                   lastPingMin: 1 + (seed % 4) },
    { id: `${booking.id}-sim`, label: 'SIM', online: (seed >> 3) % 5 !== 0,  lastPingMin: 3 + (seed % 9) },
  ]
  if (driverKnown) {
    devices.push({ id: `${booking.id}-app`, label: 'App', online: (seed >> 5) % 4 !== 0, lastPingMin: 2 + (seed % 6) })
  }
  return devices
}

function pingAgo(min: number): string {
  if (min < 1)  return 'now'
  if (min < 60) return `${min}m`
  const h = Math.round(min / 60)
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`
}

function TrackingDeviceSwitch({
  devices, activeId, onSelect, disabled,
}: {
  devices: TrackDevice[]; activeId: string; onSelect: (id: string) => void; disabled?: boolean
}) {
  if (devices.length === 0) return null
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Tracking Devices</span>
      <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm">
        {devices.map((d) => {
          const isActive    = d.id === activeId
          const unavailable = !d.online || disabled
          return (
            <button
              key={d.id}
              type="button"
              disabled={unavailable}
              onClick={() => onSelect(d.id)}
              title={d.online ? `Last ping ${pingAgo(d.lastPingMin)} ago` : 'Offline'}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition
                ${unavailable
                  ? 'cursor-not-allowed text-gray-300'
                  : isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {isActive && !unavailable && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              <span className="flex flex-col items-start leading-tight">
                <span>{d.label}</span>
                <span className={`text-[9px] font-medium ${unavailable ? 'text-gray-300' : isActive ? 'text-white/70' : 'text-gray-400'}`}>
                  {d.online ? `${pingAgo(d.lastPingMin)} ago` : 'Offline'}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RouteMap({
  booking, devices, activeId, onSelectDevice,
}: {
  booking: Booking; devices: TrackDevice[]; activeId: string; onSelectDevice: (id: string) => void
}) {
  // Status-aware map indicator so the badge reads correctly for every booking,
  // not just in-transit ones (live pulse only while the vehicle is moving).
  const isLive = ACTIVE_TRACKING_STATUSES.has(booking.status)
  const map =
    booking.status === 'DELIVERED' ? { label: 'Completed',     dot: 'bg-success',                  text: 'text-success' }
    : booking.status === 'CANCELLED' ? { label: 'Cancelled',    dot: 'bg-gray-400',                 text: 'text-gray-400' }
    : isLive                         ? { label: 'Tracking',      dot: 'bg-success animate-pulse',    text: 'text-success' }
    :                                  { label: 'Route preview', dot: 'bg-gray-300',                 text: 'text-gray-400' }

  // Same-origin/destination city (e.g. intra-city delivery) has no driving route,
  // which makes the directions embed fall back to a world view — show a single
  // centered "place" embed for that city instead.
  const originCity = (booking.origin.split(',')[0] ?? '').trim().toLowerCase()
  const destCity   = (booking.destination.split(',')[0] ?? '').trim().toLowerCase()
  const sameCity   = originCity.length > 0 && originCity === destCity
  const mapSrc     = sameCity
    ? `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(geocodeQuery(booking.origin))}&zoom=11`
    : `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${encodeURIComponent(geocodeQuery(booking.origin))}&destination=${encodeURIComponent(geocodeQuery(booking.destination))}&mode=driving`
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Live Map</p>
          <span className={`inline-block h-2 w-2 rounded-full ${map.dot}`} />
          <span className={`text-xs font-semibold ${map.text}`}>{map.label}</span>
        </div>
        <TrackingDeviceSwitch devices={devices} activeId={activeId} onSelect={onSelectDevice} />
      </div>
      <div className="relative h-[420px] min-h-[400px] overflow-hidden">
        {!GOOGLE_MAPS_API_KEY ? (
          <div className="flex h-full items-center justify-center bg-gray-50 p-6 text-center">
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8">
              <MapPin className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-600">Live map unavailable</p>
              <p className="mt-1 text-xs text-gray-400">Map configuration is missing. Contact your account manager.</p>
            </div>
          </div>
        ) : (
          <iframe
            title="Live route map"
            style={{
              border: 0,
              display: 'block',
              width: '153.85%',
              height: '153.85%',
              transform: 'scale(0.65)',
              transformOrigin: '0 0',
              minHeight: '538px',
            }}
            src={mapSrc}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>
    </div>
  )
}

// ─── Tab: Live Tracking ───────────────────────────────────────────────────────

function LiveTrackingTab({ booking }: { booking: Booking }) {
  const countdown   = etaCountdown(booking.eta)
  const isException = booking.status === 'IN_TRANSIT_EXCEPTION'
  const isDelayed   = booking.status === 'IN_TRANSIT_DELAYED'
  // The route map + trip ETA render for every booking (route is always known
  // from origin/destination); the live pulse and "Live Status" dot only animate
  // while the vehicle is actually moving.
  const isLive      = ACTIVE_TRACKING_STATUSES.has(booking.status)

  const vehicleKnown = booking.vehicle && booking.vehicle !== '-' && booking.vehicle !== 'Masked until assigned'
  const driverKnown  = booking.driver && booking.driver !== 'Masked until assigned' && booking.driver !== 'Unassigned'
  const hasPhone     = booking.driverPhone && booking.driverPhone !== '-'
  const driverInitials = booking.driver.split(' ').filter(Boolean).map((w) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')

  // Current location — estimated from trip progress (no GPS feed in the portal),
  // so it reflects the leg between origin and destination rather than a fake city.
  const originCity = (booking.origin.split(',')[0] ?? booking.origin).trim()
  const destCity   = (booking.destination.split(',')[0] ?? booking.destination).trim()
  const currentLocation =
    booking.status === 'DELIVERED'  ? `${destCity} · delivered`
    : booking.status === 'CANCELLED' ? '—'
    : isLive && booking.progress > 0 ? `En route · ${originCity} → ${destCity}`
    :                                  `${originCity} · at origin`

  // 3-stage progression (Booked → In Transit → Completed) — derived strictly from
  // status so it always matches the badge:
  //   • Booked     — everything before the goods move (draft, pending, ready,
  //                  dispatched-to-pickup) and cancelled (never progressed).
  //   • In Transit — the three IN_TRANSIT_* states.
  //   • Completed  — delivered.
  const inTransit = booking.status === 'IN_TRANSIT' || booking.status === 'IN_TRANSIT_DELAYED' || booking.status === 'IN_TRANSIT_EXCEPTION'
  const delivered = booking.status === 'DELIVERED'
  const activeStep = delivered ? 2 : inTransit ? 1 : 0
  const STAGES = ['Booked', 'In Transit', 'Completed'] as const

  // Progress % must agree with the stage: 0 before transit, the live figure while
  // moving, 100 once delivered. Tracked distance follows the same figure.
  const tripProgress = delivered ? 100 : inTransit ? Math.min(Math.max(booking.progress, 0), 100) : 0
  const trackedKm    = Math.round((booking.distanceKm * tripProgress) / 100)
  const remainingKm  = Math.max(0, booking.distanceKm - trackedKm)

  // Tracking-device switcher — synthesised per booking, default to the primary
  // (first, GPS) device; reset whenever a different booking is opened.
  const devices = useMemo(() => buildTrackingDevices(booking), [booking.id])
  const [activeDeviceId, setActiveDeviceId] = useState<string>(() => devices[0].id)
  useEffect(() => { setActiveDeviceId(devices[0].id) }, [devices])
  const activeDevice = devices.find((d) => d.id === activeDeviceId) ?? devices[0]

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column — Assignment + Live Status */}
        <div className="flex flex-col gap-5 lg:col-span-1">
          {/* Assignment */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center text-sm font-bold uppercase tracking-wide text-gray-500">
              <Truck className="mr-2 h-4 w-4 text-gray-400" /> Assignment
            </h3>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Vehicle</p>
                {vehicleKnown ? (
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                    <Truck className="h-7 w-7 shrink-0 text-primary" />
                    <p className="text-sm font-semibold text-text">{booking.vehicle}</p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-warning/10 p-3 text-sm font-medium text-warning">Not assigned yet</div>
                )}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Driver</p>
                {driverKnown ? (
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {driverInitials || '–'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text">{booking.driver}</p>
                      {hasPhone && <p className="truncate text-xs text-gray-500">{booking.driverPhone}</p>}
                    </div>
                    {hasPhone && (
                      <a
                        href={`tel:${booking.driverPhone}`}
                        title={`Call ${booking.driver}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-secondary"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-warning/10 p-3 text-sm font-medium text-warning">Not assigned yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Live Status */}
          <div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center text-sm font-bold uppercase tracking-wide text-gray-500">
              <span className={`mr-2 h-2.5 w-2.5 rounded-full ${isException ? 'bg-danger' : isDelayed ? 'bg-warning animate-pulse' : isLive ? 'bg-success animate-pulse' : 'bg-gray-300'}`} />
              Live Status
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-500">Current location</dt>
                <dd className="text-right font-semibold text-text">{currentLocation}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-500">Last update</dt>
                <dd className="text-right font-semibold text-text">{booking.lastUpdate || '—'}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-500">Source</dt>
                <dd className="text-right font-semibold text-text">
                  {activeDevice.label}
                  <span className="ml-1 text-xs font-medium text-gray-400">· {pingAgo(activeDevice.lastPingMin)} ago</span>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-500">Delay</dt>
                <dd className={`text-right font-semibold ${booking.delayedHours ? 'text-danger' : 'text-success'}`}>
                  {booking.delayedHours ? `+${booking.delayedHours}h` : 'On time'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-500">ETA</dt>
                <dd className={`text-right font-semibold ${isDelayed ? 'text-danger' : 'text-text'}`}>
                  {booking.eta}{countdown ? ` · ${countdown}` : ''}
                </dd>
              </div>
              {booking.avgSpeed > 0 && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">Avg speed</dt>
                  <dd className="text-right font-semibold text-text">{booking.avgSpeed} km/h</dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-500">Distance left</dt>
                <dd className="text-right font-semibold text-text">{remainingKm.toLocaleString()} km</dd>
              </div>
              {booking.exceptionNote && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">Note</dt>
                  <dd className="text-right font-semibold text-danger">{booking.exceptionNote}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Right column — Live Map + trip progress */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <RouteMap booking={booking} devices={devices} activeId={activeDeviceId} onSelectDevice={setActiveDeviceId} />

          {/* Trip progress: stage timeline + metrics */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center">
              {STAGES.map((label, idx) => {
                const done   = idx < activeStep
                const active = idx === activeStep
                return (
                  <Fragment key={label}>
                    <div className="flex min-w-0 flex-col items-center gap-1">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${done || active ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'} ${active ? 'ring-2 ring-primary/15' : ''}`}>
                        {done ? <Check className="h-3.5 w-3.5" /> : idx === 1 ? <Truck className="h-3.5 w-3.5" /> : idx === 2 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                      </div>
                      <span className={`whitespace-nowrap text-[10px] font-semibold ${active ? 'text-primary' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                        {label}
                      </span>
                    </div>
                    {idx < STAGES.length - 1 && (
                      <div className="relative mx-2 mb-3 h-0.5 flex-1">
                        <div className="absolute inset-0 rounded-full bg-gray-200" />
                        <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all" style={{ width: idx < activeStep ? '100%' : '0%' }} />
                      </div>
                    )}
                  </Fragment>
                )
              })}
            </div>

            <div className="flex items-start divide-x divide-gray-200">
              <div className="flex-1 pr-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Expected</p>
                <p className="mt-0.5 text-2xl font-extrabold leading-none text-text">
                  {booking.distanceKm.toLocaleString()}<span className="ml-1 text-[11px] font-medium text-gray-400">km</span>
                </p>
              </div>
              <div className="flex-1 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Tracked</p>
                <p className="mt-0.5 text-2xl font-extrabold leading-none text-text">
                  {trackedKm.toLocaleString()}<span className="ml-1 text-[11px] font-medium text-gray-400">km</span>
                </p>
              </div>
              <div className="flex-1 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">ETA</p>
                <p className={`mt-0.5 text-base font-extrabold leading-tight ${isDelayed ? 'text-danger' : 'text-text'}`}>{booking.eta}</p>
              </div>
              <div className="flex-1 pl-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Progress</p>
                <p className="mt-0.5 text-2xl font-extrabold leading-none text-primary">{tripProgress}%</p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${tripProgress}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConsigneeLinkTile value={booking.consigneeLink} />
    </div>
  )
}

// ─── Tab: Deliveries ─────────────────────────────────────────────────────────

function DeliveriesTab({ booking, onToast }: { booking: Booking; onToast: (msg: string) => void }) {
  const epod        = booking.epod
  const epodCaptured = epod?.status === 'Captured'
  const podCount    = booking.loadStops.filter((s) => s.pod === 'Captured').length

  return (
    <div className="space-y-5">
      {epod && (
        <div className={`rounded-lg border p-4 ${epodCaptured ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              {epodCaptured
                ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                : <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-warning" />}
              <div>
                <p className={`text-sm font-bold ${epodCaptured ? 'text-success' : 'text-warning'}`}>
                  {epodCaptured ? 'ePOD Captured' : 'ePOD Pending'}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {podCount}/{booking.loadStops.length} deliveries · {epodCaptured ? `Method: ${epod.method}` : `Capture via ${epod.method} at delivery`}
                </p>
                {epodCaptured && epod.timestamp && <p className="text-xs text-gray-500">Captured at: {epod.timestamp}</p>}
                {epodCaptured && epod.feedback && <p className="mt-1 text-xs italic text-gray-500">"{epod.feedback}"</p>}
              </div>
            </div>
            {epodCaptured && (
              <button type="button" onClick={() => onToast('ePOD download will be available once integrated with the document service')} className="flex shrink-0 items-center gap-2 rounded-lg border border-success/40 bg-white px-3 py-2 text-sm font-semibold text-success shadow-sm transition hover:bg-success/10">
                <Download className="h-4 w-4" />
                Download ePOD
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {booking.loadStops.map((stop, idx) => (
          <div key={`${stop.destination}-${idx}`} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                  {idx + 1}
                </div>
                <div>
                  <p className="font-extrabold text-text">{stop.destination}</p>
                  <p className="text-sm text-gray-500">{stop.material} · {stop.quantity}</p>
                </div>
              </div>
              <Badge variant={stop.pod === 'Captured' ? 'success' : stop.pod === 'Not applicable' ? 'muted' : 'warning'}>
                {stop.pod}
              </Badge>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Weight</p>
                <p className="mt-1 text-sm font-semibold text-text">{stop.weight} MTS</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Est. Delivery TAT</p>
                <p className="mt-1 text-sm font-semibold text-text">{stop.tat}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">POD Status</p>
                <p className={`mt-1 text-sm font-semibold ${stop.pod === 'Captured' ? 'text-success' : stop.pod === 'Not applicable' ? 'text-gray-400' : 'text-warning'}`}>
                  {stop.pod}
                </p>
              </div>
            </div>
          </div>
        ))}
        {booking.loadStops.length === 0 && (
          <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">
            No delivery points recorded yet
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Timeline ────────────────────────────────────────────────────────────

function TimelineTab({ booking }: { booking: Booking }) {
  return (
    <div className="space-y-4">
      {booking.exceptionNote && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-bold text-danger">Shipment Alert</p>
            <p className="mt-1 text-sm text-gray-600">{booking.exceptionNote}</p>
          </div>
        </div>
      )}
      <div className="space-y-0">
        {booking.timeline.map((event, i) => {
          const isLast = i === booking.timeline.length - 1
          const style  = TIMELINE_STYLE[event.state]
          const Icon   = style.icon
          return (
            <div key={`${event.label}-${i}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.ring}`}>
                  <Icon className={`h-4 w-4 ${style.icon_color}`} />
                </div>
                {!isLast && <div className={`my-1 w-px flex-1 ${style.line}`} />}
              </div>
              <div className={`min-w-0 ${!isLast ? 'pb-4' : ''}`}>
                <p className={`text-sm font-bold ${event.state === 'future' ? 'text-gray-400' : 'text-text'}`}>{event.label}</p>
                <p className={`text-xs ${event.state === 'future' ? 'text-gray-300' : 'text-gray-500'}`}>{event.time}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────

function DocumentsTab({ booking, onToast }: { booking: Booking; onToast: (msg: string) => void }) {
  if (!booking.documents?.length) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <p className="text-sm text-gray-500">
            Invoice and e-way bill documents shared by operations will appear here.
            They are typically uploaded when the shipment is dispatched.
          </p>
        </div>
        <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">
          No documents uploaded yet
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {booking.documents.map((doc, idx) => (
        <div key={idx} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Invoice Number</p>
              <p className="mt-1 text-sm font-semibold text-text">{doc.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Invoice Date</p>
              <p className="mt-1 text-sm font-semibold text-text">{doc.invoiceDate ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">eWay Bill Number</p>
              <p className="mt-1 text-sm font-semibold text-text">{doc.ewayBillNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">eWay Bill Expiry</p>
              <p className="mt-1 text-sm font-semibold text-text">{doc.ewayBillExpiry ?? '—'}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400">Uploaded at {doc.uploadedAt}</p>
            <button type="button" onClick={() => onToast('Document download will be available once integrated with the document service')} className="flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:underline">
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TrackingSection({
  selectedBooking,
  detailTab,
  setDetailTab,
  bridge,
  onCreateBooking,
  setActiveSection,
  onEditBooking,
}: Props) {

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason,     setCancelReason]     = useState('')
  const [cancelling,       setCancelling]       = useState(false)
  const [trackingToast,    setTrackingToast]    = useState<string | null>(null)
  useEffect(() => {
    if (!trackingToast) return
    const t = setTimeout(() => setTrackingToast(null), 3000)
    return () => clearTimeout(t)
  }, [trackingToast])

  function submitCancellation() {
    if (!cancelReason.trim() || !selectedBooking || !bridge) return
    setCancelling(true)
    bridge.cancelBooking(selectedBooking.id, cancelReason.trim())
    setCancelling(false)
    setCancelDialogOpen(false)
    setCancelReason('')
    setActiveSection('bookings')
  }

  // Every booking opens on the Overview tab by default
  useEffect(() => {
    if (!selectedBooking) return
    setDetailTab('overview')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBooking?.id])

  // Empty state — no bookings at all
  if (!selectedBooking) {
    return (
      <section className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
        <Route className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-3 text-base font-bold text-gray-700">No shipments to track yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Create a booking to see live tracking, timelines, and ePOD here.
        </p>
        <Button className="mt-5" onClick={onCreateBooking}>
          <Plus className="h-4 w-4" />
          Create Booking
        </Button>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      {/* Full-width page header — mirrors TMS BookingPageHeader */}
      <BookingPageHeader
        booking={selectedBooking}
        customerName={bridge?.customerName ?? readPortalCustomerIdentity()?.customerName}
        onBack={() => setActiveSection('bookings')}
        onEdit={onEditBooking ? () => onEditBooking(selectedBooking.id) : undefined}
        onCancelRequest={bridge ? () => setCancelDialogOpen(true) : undefined}
      />

      {/* Tab card — full width, no sidebar */}
      <Card>
        <CardContent className="p-3">
          <div className="space-y-4">
            {/* Tab strip — mirrors TMS Tabs component */}
            <div role="tablist" className="flex flex-wrap gap-1.5">
              {TABS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={detailTab === key}
                  onClick={() => setDetailTab(key)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    detailTab === key
                      ? 'bg-gray-900 text-white'
                      : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {TAB_LABELS[key]}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {detailTab === 'overview'   && <OverviewTab    booking={selectedBooking} bridge={bridge} />}
            {detailTab === 'track'      && <LiveTrackingTab booking={selectedBooking} />}
            {detailTab === 'deliveries' && <DeliveriesTab  booking={selectedBooking} onToast={setTrackingToast} />}
            {detailTab === 'timeline'   && <TimelineTab    booking={selectedBooking} />}
            {detailTab === 'documents'  && <DocumentsTab   booking={selectedBooking} onToast={setTrackingToast} />}
          </div>
        </CardContent>
      </Card>

      {/* ── Cancel Booking dialog — mirrors TMS cancel dialog ──────────────── */}
      {cancelDialogOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => { setCancelDialogOpen(false); setCancelReason('') }}
            aria-hidden="true"
          />
          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <h2 id="cancel-dialog-title" className="text-base font-bold text-text">Cancel Booking</h2>
            <p className="mt-1 text-sm text-gray-500">Cancellation is allowed only before dispatch begins.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Booking</label>
                <input
                  disabled
                  value={selectedBooking.id}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500"
                />
              </div>
              <div>
                <label htmlFor="cancel-reason" className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                  Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  id="cancel-reason"
                  rows={4}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter cancellation reason"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setCancelDialogOpen(false); setCancelReason('') }}>
                Close
              </Button>
              <Button
                onClick={submitCancellation}
                disabled={!cancelReason.trim() || cancelling}
              >
                {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
              </Button>
            </div>
          </div>
        </>
      )}

      {trackingToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {trackingToast}
        </div>
      )}
    </section>
  )
}
