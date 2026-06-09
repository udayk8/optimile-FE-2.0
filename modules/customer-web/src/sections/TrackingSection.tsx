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
  Plus,
  Route,
  Truck,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Badge } from '@shared-ui/badge'
import { Button } from '@shared-ui/button'
import { Card, CardContent } from '@shared-ui/card'
import type { CustomerDataBridge } from '../integration/customer-data-bridge'
import { STATUS_META, canCustomerCancelBooking, canCustomerEditBooking, currency } from '../shared/customer-types'
import type { Booking, CustomerSection, DetailTab } from '../shared/customer-types'

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

function InfoBox({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${muted ? 'italic text-gray-400' : 'text-text'}`}>{value}</p>
    </div>
  )
}

// ─── Page header — mirrors TMS BookingPageHeader ──────────────────────────────

function BookingPageHeader({
  booking,
  onBack,
  onEdit,
  onCancelRequest,
  onRebook,
}: {
  booking:          Booking
  onBack:           () => void
  onEdit?:          () => void
  onCancelRequest?: () => void
  onRebook?:        () => void
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
          {booking.status === 'DELIVERED' && onRebook && (
            <Button size="sm" onClick={onRebook}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Booking (same route)
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
          <p className="mt-1 text-xs font-semibold text-gray-700">{booking.consignee}</p>
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

// ─── Route progress bar ───────────────────────────────────────────────────────

function RouteVisualization({ booking }: { booking: Booking }) {
  const originCity  = (booking.origin.split(',')[0] ?? booking.origin).trim()
  const destCity    = (booking.destination.split(',')[0] ?? booking.destination).trim()
  const isException = booking.status === 'IN_TRANSIT_EXCEPTION'
  const isDelayed   = booking.status === 'IN_TRANSIT_DELAYED'
  const isDelivered = booking.status === 'DELIVERED'

  const barColor = isException ? 'bg-danger/70' : isDelayed ? 'bg-warning' : 'bg-primary'
  const dotColor = isException ? 'bg-danger text-white' : isDelayed ? 'bg-warning text-white' : 'bg-primary text-white'
  const liveLabel = isException ? 'Exception' : isDelayed ? 'Delayed' : isDelivered ? 'Delivered' : 'Live'
  const liveDot   = isException ? 'bg-danger' : isDelayed ? 'bg-warning animate-pulse' : isDelivered ? 'bg-success' : 'bg-success animate-pulse'

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Route Progress</p>
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${liveDot}`} />
          <span className={`text-xs font-semibold ${isException ? 'text-danger' : isDelayed ? 'text-warning' : isDelivered ? 'text-success' : 'text-success'}`}>
            {liveLabel}
          </span>
        </div>
      </div>
      <div className="px-6 py-8">
        <div className="relative flex items-center gap-3">
          <div className="z-10 flex flex-col items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-sm">
              <MapPin className="h-4 w-4" />
            </div>
            <p className="max-w-[64px] break-words text-center text-[11px] font-bold text-gray-600">{originCity}</p>
          </div>
          <div className="relative flex-1">
            <div className="h-1.5 w-full rounded-full bg-gray-200" />
            <div className={`absolute left-0 top-0 h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${booking.progress}%` }} />
            {!isDelivered && (
              <div className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${Math.min(booking.progress, 94)}%` }}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full shadow-md ${dotColor}`}>
                  <Truck className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
          <div className="z-10 flex flex-col items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm ${isDelivered ? 'bg-success text-white' : 'bg-gray-300 text-white'}`}>
              {isDelivered ? <CheckCircle2 className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            </div>
            <p className="max-w-[64px] break-words text-center text-[11px] font-bold text-gray-600">{destCity}</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <span className="text-xs text-gray-400">Route completion</span>
          <span className={`text-sm font-extrabold ${isException ? 'text-danger' : isDelayed ? 'text-warning' : 'text-primary'}`}>
            {booking.progress}%
          </span>
        </div>
      </div>
      <div className="border-t border-gray-100 bg-white/60 px-4 py-2.5 text-center">
        <span className="text-[11px] text-gray-400">Map coming soon — vehicle position estimated from trip progress</span>
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

// ─── Tab: Live Tracking ───────────────────────────────────────────────────────

function LiveTrackingTab({ booking }: { booking: Booking }) {
  const countdown   = etaCountdown(booking.eta)
  const isException = booking.status === 'IN_TRANSIT_EXCEPTION'
  const isDelayed   = booking.status === 'IN_TRANSIT_DELAYED'

  if (!ACTIVE_TRACKING_STATUSES.has(booking.status)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
        <Truck className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm font-bold text-gray-600">Tracking not yet active</p>
        <p className="mt-1 text-xs text-gray-400">Live tracking will be available once the vehicle is dispatched.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <RouteVisualization booking={booking} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className={`rounded-lg border p-3 ${isDelayed ? 'border-danger/20 bg-danger/5' : 'border-gray-200 bg-gray-50'}`}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">ETA</p>
          <p className={`mt-1 text-sm font-bold ${isDelayed ? 'text-danger' : 'text-text'}`}>{booking.eta}</p>
          {countdown && <p className={`mt-0.5 text-xs font-semibold ${isDelayed ? 'text-danger' : 'text-gray-500'}`}>{countdown}</p>}
        </div>
        {isException ? (
          <div className="rounded-lg border border-danger/20 bg-danger/5 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Status</p>
            <p className="mt-1 text-sm font-bold text-danger">Needs Attention</p>
            <p className="mt-0.5 text-xs text-danger/80">Our team is working on this shipment</p>
          </div>
        ) : (
          <InfoBox label="Total Distance" value={`${booking.distanceKm} km`} />
        )}
        {booking.avgSpeed > 0 && <InfoBox label="Avg Speed" value={`${booking.avgSpeed} km/h`} />}
        <ConsigneeLinkTile value={booking.consigneeLink} />
      </div>
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

  // Auto-select sensible default tab when booking changes
  useEffect(() => {
    if (!selectedBooking) return
    if (ACTIVE_TRACKING_STATUSES.has(selectedBooking.status)) {
      setDetailTab('track')
    } else if (selectedBooking.status === 'DELIVERED') {
      setDetailTab('deliveries')
    } else {
      setDetailTab('overview')
    }
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
        onBack={() => setActiveSection('bookings')}
        onEdit={onEditBooking ? () => onEditBooking(selectedBooking.id) : undefined}
        onCancelRequest={bridge ? () => setCancelDialogOpen(true) : undefined}
        onRebook={onCreateBooking}
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
