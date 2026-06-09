import { AlertTriangle, ArrowRight, CircleDollarSign, PackageSearch, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@shared-ui/button'
import type { Booking, BookingStatus, CustomerSection } from '../shared/customer-types'
import { ACTIVE_STATUSES, PENDING_STATUSES, EXCEPTION_STATUSES } from '../shared/customer-types'

// ─── Props ────────────────────────────────────────────────────────────────────

// A preset injected from outside (e.g. Overview pipeline card click).
// Maps to the same group keys used in STATUS_CHIPS / CREATED_BY_CHIPS.
export type BookingFilterPreset =
  | 'all' | 'active' | 'pending' | 'exceptions' | 'completed' | 'cancelled'
  | 'erp' | 'draft' | 'assignment' | 'transit' | 'pod' | 'invoiced' | 'exception'

interface BookingsSectionProps {
  bookings:             Booking[]
  query:                string
  setQuery:             (q: string) => void
  selectedBookingId:    string
  setSelectedBookingId: (id: string) => void
  setActiveSection:     (section: CustomerSection) => void
  presetFilter?:        BookingFilterPreset
  onViewFinance?:       () => void
  onTrackBooking?:      (id: string) => void
}

// ─── Status config ────────────────────────────────────────────────────────────

interface StatusCfg {
  label:  string
  badge:  string   // pill colours
  stripe: string   // left border colour
  pulse:  boolean
}

const STATUS_CFG: Record<BookingStatus, StatusCfg> = {
  DRAFT:                 { label: 'Draft',        badge: 'bg-gray-100 text-gray-500',       stripe: 'bg-gray-300',    pulse: false },
  PENDING_RATE_APPROVAL: { label: 'Processing',   badge: 'bg-amber-100 text-amber-700',     stripe: 'bg-amber-400',   pulse: false },
  PENDING_AUCTION:       { label: 'Processing',   badge: 'bg-amber-100 text-amber-700',     stripe: 'bg-amber-400',   pulse: false },
  PENDING_ASSIGNMENT:    { label: 'Pending',      badge: 'bg-amber-100 text-amber-700',     stripe: 'bg-amber-400',   pulse: false },
  READY_FOR_DISPATCH:    { label: 'Ready',        badge: 'bg-blue-100 text-blue-700',       stripe: 'bg-blue-400',    pulse: false },
  DISPATCHED:            { label: 'Dispatched',   badge: 'bg-indigo-100 text-indigo-700',   stripe: 'bg-indigo-500',  pulse: false },
  IN_TRANSIT:            { label: 'In Transit',   badge: 'bg-primary/10 text-primary',      stripe: 'bg-primary',     pulse: false },
  IN_TRANSIT_DELAYED:    { label: 'Delayed',      badge: 'bg-orange-100 text-orange-700',   stripe: 'bg-orange-500',  pulse: true  },
  IN_TRANSIT_EXCEPTION:  { label: 'Attention',    badge: 'bg-red-100 text-danger',          stripe: 'bg-danger',      pulse: true  },
  DELIVERED:             { label: 'Delivered',    badge: 'bg-emerald-100 text-emerald-700', stripe: 'bg-emerald-500', pulse: false },
  CANCELLED:             { label: 'Cancelled',    badge: 'bg-gray-100 text-gray-400',       stripe: 'bg-gray-200',    pulse: false },
}

// ─── Freight formatter ────────────────────────────────────────────────────────

function fmtFreight(v: number): string {
  if (v >= 10_00_000) return `₹${(v / 10_00_000).toFixed(1)}L`
  if (v >= 1_000)     return `₹${(v / 1_000).toFixed(1)}K`
  return `₹${v}`
}

// ─── ETA ──────────────────────────────────────────────────────────────────────

function isEtaKnown(eta: string): boolean {
  if (!eta || eta === '-') return false
  if (/^awaiting|^under review|^pending/i.test(eta)) return false
  return true
}

function isEtaLate(booking: Booking): boolean {
  if (EXCEPTION_STATUSES.includes(booking.status)) return true
  const { eta } = booking
  if (!eta || !eta.toLowerCase().startsWith('today,')) return false
  const timePart = eta.split(',')[1]?.trim()
  if (!timePart) return false
  const parts = timePart.split(':').map(Number)
  const h = parts[0] ?? NaN
  const m = parts[1] ?? NaN
  if (Number.isNaN(h) || Number.isNaN(m)) return false
  const now = new Date()
  return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())
}

// ─── Alert banner ─────────────────────────────────────────────────────────────

function AlertBanner({ bookings, onOpen }: { bookings: Booking[]; onOpen: (id: string) => void }) {
  const urgent = bookings.filter((b) => EXCEPTION_STATUSES.includes(b.status))
  if (!urgent.length) return null
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-danger">
          {urgent.length} shipment{urgent.length > 1 ? 's' : ''} need{urgent.length === 1 ? 's' : ''} attention
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          {urgent.map((b) => {
            const oc = (b.origin.split(',')[0] ?? '').trim()
            const dc = (b.destination.split(',')[0] ?? '').trim()
            return (
              <button key={b.id} type="button" onClick={() => onOpen(b.id)}
                className="text-xs font-semibold text-danger underline underline-offset-2 hover:text-red-800">
                {b.id}{oc !== dc ? ` (${oc}→${dc})` : ''}
              </button>
            )
          })}
        </div>
        {urgent[0]?.exceptionNote && (
          <p className="mt-1 text-xs text-red-700">{urgent[0].exceptionNote}</p>
        )}
      </div>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.badge}`}>
      {cfg.pulse && <span aria-hidden className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-danger" />}
      {cfg.label}
    </span>
  )
}

// ─── Desktop booking row ──────────────────────────────────────────────────────

function BookingRow({ booking, isSelected, onOpen, onViewFinance, onTrackBooking }: { booking: Booking; isSelected: boolean; onOpen: () => void; onViewFinance?: () => void; onTrackBooking?: () => void }) {
  const cfg         = STATUS_CFG[booking.status]
  const originCity  = (booking.origin.split(',')[0] ?? '').trim()
  const destCity    = (booking.destination.split(',')[0] ?? '').trim()
  const sameCity    = originCity.toLowerCase() === destCity.toLowerCase()
  const etaKnown    = isEtaKnown(booking.eta)
  const etaLate     = etaKnown && isEtaLate(booking)
  const isException = EXCEPTION_STATUSES.includes(booking.status)
  const isActive    = ACTIVE_STATUSES.includes(booking.status)

  const hasVehicle  = booking.vehicle && booking.vehicle !== '-'
  const hasDriver   = booking.driver && booking.driver !== '-' && !booking.driver.startsWith('Masked')
  const hasLr       = booking.lrNumber && booking.lrNumber !== '-'

  const deliveriesDone  = (booking.loadStops ?? []).filter((s) => s.pod === 'Captured').length
  const deliveriesTotal = (booking.loadStops ?? []).length

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex w-full overflow-hidden rounded-lg border text-left transition hover:shadow-md
        ${isSelected   ? 'border-primary shadow-sm'
        : isException  ? 'border-red-200'
        : 'border-gray-200 hover:border-slate-300'}`}
    >
      {/* Status stripe */}
      <div className={`w-1 shrink-0 ${cfg.stripe}`} />

      {/* Row body — [Left: ID+consignee+route] [Mid: vehicle/LR/driver] [Right: amount+deliveries+status] */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2 bg-white px-4 py-3
        group-hover:bg-slate-50/60
        lg:flex-nowrap">

        {/* LEFT — ID + consignee + route + material chip */}
        <div className="min-w-[160px] flex-[2] min-w-0">
          <p className="truncate text-[13px] font-bold text-primary">{booking.id}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">{booking.bookingDate.slice(0, 10)}</p>
          <p className="mt-1 truncate text-[12px] font-semibold text-gray-800">{booking.consignee}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
            <span>{sameCity ? originCity : originCity}</span>
            <ArrowRight className="h-2.5 w-2.5 shrink-0" />
            <span>{sameCity ? originCity : destCity}</span>
          </p>
          {booking.material && (
            <span className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              {booking.material}
            </span>
          )}
        </div>

        {/* MIDDLE — vehicle / LR / driver */}
        <div className="min-w-[180px] flex-[2] min-w-0 space-y-0.5">
          <p className="truncate text-[12px] text-gray-700">
            <span className="text-gray-400">Vehicle: </span>
            <span className={`font-semibold ${hasVehicle ? 'text-gray-800' : 'text-amber-600'}`}>
              {hasVehicle ? booking.vehicle : 'Pending vehicle'}
            </span>
          </p>
          {hasLr && (
            <p className="truncate text-[11px] text-gray-400">
              <span>LR: </span><span className="font-medium text-gray-600">{booking.lrNumber}</span>
            </p>
          )}
          <p className="truncate text-[11px] text-gray-400">
            <span>Driver: </span>
            <span className={hasDriver ? 'font-medium text-gray-600' : 'text-gray-400'}>
              {hasDriver ? booking.driver : 'Unassigned'}
            </span>
          </p>
          {etaKnown && (
            <p className={`text-[11px] font-semibold ${etaLate ? 'text-danger' : 'text-emerald-700'}`}>
              ETA: {booking.eta}{etaLate ? ' ⚠' : ''}
            </p>
          )}
        </div>

        {/* RIGHT — freight + deliveries + status badge + track */}
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          {(booking.freight ?? 0) > 0 ? (
            <p className="text-[14px] font-bold text-gray-900">{fmtFreight(booking.freight)}</p>
          ) : (
            <p className="text-[12px] text-gray-300">—</p>
          )}
          {deliveriesTotal > 0 && (
            <p className="text-[11px] text-gray-400">{deliveriesDone}/{deliveriesTotal} deliveries done</p>
          )}
          <div className="flex items-center gap-2">
            {isActive && onTrackBooking && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onTrackBooking() }}
                className="rounded border border-primary px-2 py-0.5 text-[11px] font-semibold text-primary transition hover:bg-primary/5"
              >
                Track
              </button>
            )}
            {isActive && !onTrackBooking && (
              <span className="rounded border border-primary px-2 py-0.5 text-[11px] font-semibold text-primary">Track</span>
            )}
            {booking.status === 'DELIVERED' && onViewFinance && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onViewFinance() }}
                title="View invoice in Finance"
                className="flex items-center gap-1 rounded border border-emerald-300 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                <CircleDollarSign className="h-3 w-3" />
                Invoice
              </button>
            )}
            <StatusBadge status={booking.status} />
          </div>
        </div>

        <ArrowRight className="ml-1 h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-gray-500" />
      </div>
    </button>
  )
}

// ─── Mobile booking card ──────────────────────────────────────────────────────

function BookingCard({ booking, isSelected, onOpen, onViewFinance, onTrackBooking }: { booking: Booking; isSelected: boolean; onOpen: () => void; onViewFinance?: () => void; onTrackBooking?: () => void }) {
  const cfg        = STATUS_CFG[booking.status]
  const originCity = (booking.origin.split(',')[0] ?? '').trim()
  const destCity   = (booking.destination.split(',')[0] ?? '').trim()
  const sameCity   = originCity.toLowerCase() === destCity.toLowerCase()
  const etaKnown   = isEtaKnown(booking.eta)
  const etaLate    = etaKnown && isEtaLate(booking)

  const hasVehicle       = booking.vehicle && booking.vehicle !== '-'
  const hasDriver        = booking.driver && booking.driver !== '-' && !booking.driver.startsWith('Masked')
  const hasLr            = booking.lrNumber && booking.lrNumber !== '-'
  const deliveriesDone   = (booking.loadStops ?? []).filter((s) => s.pod === 'Captured').length
  const deliveriesTotal  = (booking.loadStops ?? []).length
  const isActive         = ACTIVE_STATUSES.includes(booking.status)

  return (
    <button type="button" onClick={onOpen}
      className={`group flex w-full overflow-hidden rounded-lg border text-left transition
        ${isSelected ? 'border-primary' : 'border-gray-200 hover:border-slate-300'}`}>
      <div className={`w-1 shrink-0 ${cfg.stripe}`} />
      <div className="flex-1 space-y-1.5 bg-white p-3 group-hover:bg-slate-50/60">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[13px] font-bold text-primary">{booking.id}</p>
            <p className="text-[10px] text-gray-400">{booking.bookingDate.slice(0, 10)}</p>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <p className="truncate text-[12px] font-semibold text-gray-800">{booking.consignee}</p>
        <p className="flex items-center gap-1 text-[11px] text-gray-400">
          <span>{sameCity ? originCity : originCity}</span>
          <ArrowRight className="h-2.5 w-2.5" />
          <span>{sameCity ? originCity : destCity}</span>
        </p>
        {booking.material && (
          <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {booking.material}
          </span>
        )}
        <div className="space-y-0.5 border-t border-gray-100 pt-1.5 text-[11px]">
          <p className="text-gray-500">
            <span className="text-gray-400">Vehicle: </span>
            <span className={hasVehicle ? 'font-medium text-gray-700' : 'text-amber-600'}>{hasVehicle ? booking.vehicle : 'Pending vehicle'}</span>
          </p>
          {hasLr && <p className="text-gray-400">LR: <span className="font-medium text-gray-600">{booking.lrNumber}</span></p>}
          <p className="text-gray-400">Driver: <span className={hasDriver ? 'font-medium text-gray-600' : ''}>{hasDriver ? booking.driver : 'Unassigned'}</span></p>
        </div>
        <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
          <div className="space-y-0.5">
            {etaKnown && <p className={`font-semibold ${etaLate ? 'text-danger' : 'text-emerald-700'}`}>ETA: {booking.eta}{etaLate ? ' ⚠' : ''}</p>}
            {deliveriesTotal > 0 && <p className="text-gray-400">{deliveriesDone}/{deliveriesTotal} deliveries done</p>}
          </div>
          <div className="flex items-center gap-2">
            {isActive && onTrackBooking && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onTrackBooking() }} className="rounded border border-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary transition hover:bg-primary/5">Track</button>
            )}
            {isActive && !onTrackBooking && (
              <span className="rounded border border-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary">Track</span>
            )}
            {booking.status === 'DELIVERED' && onViewFinance && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onViewFinance() }}
                className="flex items-center gap-1 rounded border border-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <CircleDollarSign className="h-3 w-3" />
                Invoice
              </button>
            )}
            {(booking.freight ?? 0) > 0 && <span className="font-bold text-gray-900">{fmtFreight(booking.freight)}</span>}
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onCreateBooking }: { onCreateBooking: () => void }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-center">
      <PackageSearch className="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p className="text-sm font-semibold text-gray-600">No shipments found</p>
      <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filters.</p>
      <button type="button" onClick={onCreateBooking}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
        + New Booking
      </button>
    </div>
  )
}

// ─── Filter chip definitions ──────────────────────────────────────────────────

interface FilterChip { value: string; label: string }

const STATUS_CHIPS: FilterChip[] = [
  { value: 'all',        label: 'All'            },
  { value: 'active',     label: 'In Transit'     },
  { value: 'pending',    label: 'Pending'        },
  { value: 'exceptions', label: 'Needs Attention'},
  { value: 'completed',  label: 'Delivered'      },
  { value: 'cancelled',  label: 'Cancelled'      },
]

const CREATED_BY_CHIPS: FilterChip[] = [
  { value: 'all',      label: 'All'      },
  { value: 'Customer', label: 'Customer Portal' },
  { value: 'ERP',      label: 'ERP'      },
  { value: 'Ops',      label: 'Ops'      },
]

function matchesStatus(b: Booking, selected: string[]): boolean {
  if (!selected.length) return true
  return selected.some((v) => {
    if (v === 'active')     return ACTIVE_STATUSES.includes(b.status)
    if (v === 'pending')    return PENDING_STATUSES.includes(b.status)
    if (v === 'exceptions') return EXCEPTION_STATUSES.includes(b.status)
    if (v === 'completed')  return b.status === 'DELIVERED'
    if (v === 'cancelled')  return b.status === 'CANCELLED'
    return false
  })
}

// ─── Filter dropdown panel ────────────────────────────────────────────────────

interface FilterState {
  statuses:   string[]   // empty = All
  createdBy:  string[]   // empty = All
  dateFrom:   string
  dateTo:     string
}

const EMPTY_FILTER: FilterState = { statuses: [], createdBy: [], dateFrom: '', dateTo: '' }

function filterCount(f: FilterState): number {
  return f.statuses.length + f.createdBy.length + (f.dateFrom ? 1 : 0) + (f.dateTo ? 1 : 0)
}

function ChipGroup({ label, chips, selected, onToggle }: {
  label:    string
  chips:    FilterChip[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => {
          const isAll      = chip.value === 'all'
          const isSelected = isAll ? selected.length === 0 : selected.includes(chip.value)
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => onToggle(chip.value)}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold transition
                ${isSelected
                  ? 'bg-slate-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FilterDropdown({ filters, onChange, onClear }: {
  filters:  FilterState
  onChange: (next: FilterState) => void
  onClear:  () => void
}) {
  function toggleStatus(value: string) {
    if (value === 'all') { onChange({ ...filters, statuses: [] }); return }
    const next = filters.statuses.includes(value)
      ? filters.statuses.filter((v) => v !== value)
      : [...filters.statuses, value]
    onChange({ ...filters, statuses: next })
  }

  function toggleCreatedBy(value: string) {
    if (value === 'all') { onChange({ ...filters, createdBy: [] }); return }
    const next = filters.createdBy.includes(value)
      ? filters.createdBy.filter((v) => v !== value)
      : [...filters.createdBy, value]
    onChange({ ...filters, createdBy: next })
  }

  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-[320px] rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[14px] font-bold text-gray-900">Filters</p>
        <button type="button" onClick={onClear} className="text-[12px] font-semibold text-primary hover:underline">Clear all</button>
      </div>
      <div className="space-y-4">
        <ChipGroup label="Status" chips={STATUS_CHIPS} selected={filters.statuses} onToggle={toggleStatus} />
        <ChipGroup label="Created By" chips={CREATED_BY_CHIPS} selected={filters.createdBy} onToggle={toggleCreatedBy} />
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">Booking Date</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Last 7 days',  days: 7  },
              { label: 'Last 30 days', days: 30 },
              { label: 'Last 90 days', days: 90 },
            ].map(({ label, days }) => {
              const to   = new Date().toISOString().slice(0, 10)
              const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
              const active = filters.dateFrom === from && filters.dateTo === to
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onChange({ ...filters, dateFrom: active ? '' : from, dateTo: active ? '' : to })}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
              className="h-8 flex-1 rounded-lg border border-gray-200 px-2 text-[12px] text-gray-700 outline-none focus:border-primary"
              placeholder="From"
            />
            <span className="text-[11px] text-gray-400">to</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
              className="h-8 flex-1 rounded-lg border border-gray-200 px-2 text-[12px] text-gray-700 outline-none focus:border-primary"
              placeholder="To"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// Maps each pipeline preset key → the FilterState it should produce
const PRESET_TO_FILTER: Record<BookingFilterPreset, FilterState> = {
  all:        { ...EMPTY_FILTER },
  active:     { ...EMPTY_FILTER, statuses: ['active']      },
  pending:    { ...EMPTY_FILTER, statuses: ['pending']     },
  assignment: { ...EMPTY_FILTER, statuses: ['pending']     },
  draft:      { ...EMPTY_FILTER, statuses: ['pending']     },
  transit:    { ...EMPTY_FILTER, statuses: ['active']      },
  pod:        { ...EMPTY_FILTER, statuses: ['active']      },
  exceptions: { ...EMPTY_FILTER, statuses: ['exceptions']  },
  exception:  { ...EMPTY_FILTER, statuses: ['exceptions']  },
  completed:  { ...EMPTY_FILTER, statuses: ['completed']   },
  invoiced:   { ...EMPTY_FILTER, statuses: ['completed']   },
  cancelled:  { ...EMPTY_FILTER, statuses: ['cancelled']   },
  erp:        { ...EMPTY_FILTER, createdBy: ['ERP']        },
}

type SortKey = 'date_desc' | 'date_asc' | 'freight_desc' | 'status'
const SORT_OPTS: Array<{ value: SortKey; label: string }> = [
  { value: 'date_desc',    label: 'Date ↓ (newest)'  },
  { value: 'date_asc',     label: 'Date ↑ (oldest)'  },
  { value: 'freight_desc', label: 'Freight ↓'        },
  { value: 'status',       label: 'Status'            },
]

export default function BookingsSection({
  bookings, query, setQuery,
  selectedBookingId, setSelectedBookingId, setActiveSection,
  presetFilter, onViewFinance, onTrackBooking,
}: BookingsSectionProps) {

  // Pagination
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)

  // Filters + sort
  const [filters,    setFilters]  = useState<FilterState>(
    presetFilter ? (PRESET_TO_FILTER[presetFilter] ?? EMPTY_FILTER) : EMPTY_FILTER
  )
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortKey,    setSortKey]    = useState<SortKey>('date_desc')
  const activeFilterCount = filterCount(filters)

  // Apply preset whenever it changes; undefined = clear all filters
  useEffect(() => {
    setFilters(presetFilter ? (PRESET_TO_FILTER[presetFilter] ?? EMPTY_FILTER) : EMPTY_FILTER)
    setPage(1)
  }, [presetFilter])

  const filteredBookings = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = bookings.filter((b) => {
      if (q && !`${b.id} ${b.salesOrder} ${b.consignee} ${b.vehicle} ${b.origin} ${b.destination} ${b.material ?? ''}`.toLowerCase().includes(q)) return false
      if (!matchesStatus(b, filters.statuses)) return false
      if (filters.createdBy.length && !filters.createdBy.includes(b.createdBy)) return false
      if (filters.dateFrom && b.bookingDate.slice(0, 10) < filters.dateFrom) return false
      if (filters.dateTo   && b.bookingDate.slice(0, 10) > filters.dateTo)   return false
      return true
    })
    return [...filtered].sort((a, b) => {
      if (sortKey === 'date_asc')     return a.bookingDate.localeCompare(b.bookingDate)
      if (sortKey === 'date_desc')    return b.bookingDate.localeCompare(a.bookingDate)
      if (sortKey === 'freight_desc') return (b.freight ?? 0) - (a.freight ?? 0)
      if (sortKey === 'status')       return a.status.localeCompare(b.status)
      return 0
    })
  }, [bookings, query, filters, sortKey])

  const totalPages   = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE))
  const safePage     = Math.min(page, totalPages)
  const pagedBookings = filteredBookings.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Reset to page 1 whenever filters/query change
  useEffect(() => { setPage(1) }, [filteredBookings.length])

  return (
    <section className="space-y-3">

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-slate-900">My Bookings</h2>
        <Button size="sm" onClick={() => setActiveSection('create')}>
          <Plus className="h-4 w-4" /> New Booking
        </Button>
      </div>

      {/* Alert banner */}
      <AlertBanner bookings={bookings} onOpen={(id) => setSelectedBookingId(id)} />

      {/* Search + Filter bar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by booking ID, vehicle, consignee or route…"
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-[13px] shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter button */}
        <div className="relative">
          {filterOpen && (
            <button type="button" aria-label="Close filters" className="fixed inset-0 z-20 cursor-default bg-transparent" onClick={() => setFilterOpen(false)} />
          )}
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={`flex h-10 items-center gap-2 rounded-xl border px-4 text-[13px] font-semibold shadow-sm transition
              ${activeFilterCount > 0
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h12M4 8h8M6 12h4" strokeLinecap="round" />
            </svg>
            Filter
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <FilterDropdown
              filters={filters}
              onChange={setFilters}
              onClear={() => { setFilters(EMPTY_FILTER); setQuery('') }}
            />
          )}
        </div>

        {/* Sort */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] text-gray-600 shadow-sm outline-none focus:border-primary"
        >
          {SORT_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Count */}
        <span className="shrink-0 text-[12px] text-slate-400">{filteredBookings.length} of {bookings.length}</span>
      </div>

      {/* List */}
      {filteredBookings.length === 0 ? (
        <EmptyState onCreateBooking={() => setActiveSection('create')} />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden space-y-1.5 lg:block">
            {pagedBookings.map((b) => (
              <BookingRow key={b.id} booking={b} isSelected={selectedBookingId === b.id} onOpen={() => setSelectedBookingId(b.id)} onViewFinance={onViewFinance} onTrackBooking={onTrackBooking ? () => onTrackBooking(b.id) : undefined} />
            ))}
          </div>
          {/* Mobile */}
          <div className="space-y-2 lg:hidden">
            {pagedBookings.map((b) => (
              <BookingCard key={b.id} booking={b} isSelected={selectedBookingId === b.id} onOpen={() => setSelectedBookingId(b.id)} onViewFinance={onViewFinance} onTrackBooking={onTrackBooking ? () => onTrackBooking(b.id) : undefined} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <p className="text-[12px] text-gray-400">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredBookings.length)} of {filteredBookings.length}
              </p>
              <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                  .reduce<(number | '…')[]>((acc, n, idx, arr) => {
                    if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('…')
                    acc.push(n)
                    return acc
                  }, [])
                  .map((item, idx) =>
                    item === '…' ? (
                      <span key={`ellipsis-${idx}`} className="flex h-8 w-8 items-center justify-center text-[12px] text-gray-300">…</span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item as number)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-semibold transition
                          ${safePage === item
                            ? 'bg-primary text-white shadow-sm'
                            : 'border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
                      >
                        {item}
                      </button>
                    )
                  )}

                {/* Next */}
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
