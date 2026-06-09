import {
  AlertTriangle,
  Check,
  CircleDollarSign,
  Download,
  FileText,
  MessageSquare,
  ReceiptText,
  TrendingUp,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@shared-ui/badge'
import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import type { Booking } from '../shared/customer-types'
import { currency } from '../shared/customer-types'

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  bookings:        Booking[]
  onViewBooking?:  (bookingId: string) => void
  initialTab?:     InvoiceTab
}

// ─── Mock invoice data ────────────────────────────────────────────────────────
// TODO: Replace with real invoice data from bridge/finance-service API

type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue' | 'Disputed'

type MockInvoice = {
  invoiceId:   string
  bookingId:   string
  salesOrder:  string
  route:       string
  invoiceDate: string
  dueDate:     string
  amount:      number
  status:      InvoiceStatus
  agingDays:   number   // 0 for paid; days past due for Overdue/Disputed
}

const MOCK_INVOICES: MockInvoice[] = [
  { invoiceId: 'INV-4401', bookingId: 'BK-2401', salesOrder: 'SO-77821', route: 'Mumbai → Bengaluru',    invoiceDate: 'May 25, 2026', dueDate: 'Jun 9, 2026',  amount: 52_400, status: 'Pending',  agingDays: 0  },
  { invoiceId: 'INV-4398', bookingId: 'BK-2398', salesOrder: 'SO-77818', route: 'Pune → Coimbatore',    invoiceDate: 'May 30, 2026', dueDate: 'Jun 14, 2026', amount: 38_900, status: 'Paid',     agingDays: 0  },
  { invoiceId: 'INV-4390', bookingId: 'BK-2390', salesOrder: 'SO-77810', route: 'Nagpur → Hyderabad',   invoiceDate: 'May 18, 2026', dueDate: 'Jun 2, 2026',  amount: 44_100, status: 'Pending',  agingDays: 0  },
  { invoiceId: 'INV-4385', bookingId: 'BK-2385', salesOrder: 'SO-77805', route: 'Delhi → Jaipur',       invoiceDate: 'Apr 28, 2026', dueDate: 'May 13, 2026', amount: 41_200, status: 'Overdue',  agingDays: 25 },
  { invoiceId: 'INV-4380', bookingId: 'BK-2380', salesOrder: 'SO-77800', route: 'Chennai → Vizag',      invoiceDate: 'Apr 22, 2026', dueDate: 'May 7, 2026',  amount: 29_600, status: 'Overdue',  agingDays: 31 },
  { invoiceId: 'INV-4370', bookingId: 'BK-2370', salesOrder: 'SO-77789', route: 'Hyderabad → Nagpur',   invoiceDate: 'Apr 10, 2026', dueDate: 'Apr 25, 2026', amount: 55_100, status: 'Paid',     agingDays: 0  },
  { invoiceId: 'INV-4362', bookingId: 'BK-2362', salesOrder: 'SO-77780', route: 'Mumbai → Delhi',       invoiceDate: 'Mar 31, 2026', dueDate: 'Apr 15, 2026', amount: 67_800, status: 'Paid',     agingDays: 0  },
  { invoiceId: 'INV-4355', bookingId: 'BK-2355', salesOrder: 'SO-77772', route: 'Pune → Ahmedabad',     invoiceDate: 'Mar 20, 2026', dueDate: 'Apr 4, 2026',  amount: 34_500, status: 'Disputed', agingDays: 63 },
  { invoiceId: 'INV-4348', bookingId: 'BK-2348', salesOrder: 'SO-77764', route: 'Bengaluru → Chennai',  invoiceDate: 'Mar 8, 2026',  dueDate: 'Mar 23, 2026', amount: 48_750, status: 'Pending',  agingDays: 0  },
  { invoiceId: 'INV-4340', bookingId: 'BK-2340', salesOrder: 'SO-77755', route: 'Kolkata → Bhubaneswar',invoiceDate: 'Feb 28, 2026', dueDate: 'Mar 15, 2026', amount: 22_300, status: 'Paid',     agingDays: 0  },
]

// ─── Aging bucket config ──────────────────────────────────────────────────────

const AGING_BUCKETS = [
  { label: '0–15 days',  min: 1,  max: 15,       color: 'bg-warning/70'  },
  { label: '16–30 days', min: 16, max: 30,        color: 'bg-warning'     },
  { label: '31–45 days', min: 31, max: 45,        color: 'bg-orange-400'  },
  { label: '46–60 days', min: 46, max: 60,        color: 'bg-danger/70'   },
  { label: '60+ days',   min: 61, max: Infinity,  color: 'bg-danger'      },
]

// ─── Status display config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InvoiceStatus, { badge: string; label: string }> = {
  Paid:     { badge: 'success', label: 'Paid'     },
  Pending:  { badge: 'warning', label: 'Pending'  },
  Overdue:  { badge: 'danger',  label: 'Overdue'  },
  Disputed: { badge: 'muted',   label: 'Disputed' },
}

// ─── Tab config ───────────────────────────────────────────────────────────────

type InvoiceTab = 'all' | 'pending' | 'overdue' | 'paid' | 'disputed'
const TABS: Array<{ id: InvoiceTab; label: string; statuses: InvoiceStatus[] }> = [
  { id: 'all',      label: 'All',      statuses: ['Paid', 'Pending', 'Overdue', 'Disputed'] },
  { id: 'pending',  label: 'Pending',  statuses: ['Pending'] },
  { id: 'overdue',  label: 'Overdue',  statuses: ['Overdue'] },
  { id: 'paid',     label: 'Paid',     statuses: ['Paid'] },
  { id: 'disputed', label: 'Disputed', statuses: ['Disputed'] },
]

// ─── Dispute form ─────────────────────────────────────────────────────────────

function DisputeRow({
  invoice,
  onSubmit,
  onCancel,
}: {
  invoice: MockInvoice
  onSubmit: (invoiceId: string, reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')

  return (
    <tr>
      <td colSpan={8} className="border-b border-orange-200 bg-orange-50 px-6 py-4">
        <div className="flex items-start gap-4">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <div className="flex-1 space-y-3">
            <p className="text-sm font-bold text-orange-800">
              Raise Dispute — {invoice.invoiceId}
            </p>
            <p className="text-xs text-orange-700">
              Describe the discrepancy. Our finance team will review and respond within 2 business days.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Freight amount does not match the agreed rate card for this lane. Agreed rate: Rs 38,000."
              className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-200"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (reason.trim()) onSubmit(invoice.invoiceId, reason.trim())
                }}
              >
                Submit Dispute
              </Button>
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Invoice row (desktop) ────────────────────────────────────────────────────

function InvoiceRow({
  invoice,
  isDisputeOpen,
  isDisputeSubmitted,
  onOpenDispute,
  onCloseDispute,
  onSubmitDispute,
  onViewBooking,
  onDownload,
}: {
  invoice:             MockInvoice
  isDisputeOpen:       boolean
  isDisputeSubmitted:  boolean
  onOpenDispute:       () => void
  onCloseDispute:      () => void
  onSubmitDispute:     (id: string, reason: string) => void
  onViewBooking?:      (id: string) => void
  onDownload?:         (invoiceId: string) => void
}) {
  const cfg = STATUS_CONFIG[invoice.status]

  return (
    <>
      <tr className={`border-b border-gray-100 transition-colors ${isDisputeOpen ? 'bg-orange-50/40' : 'hover:bg-gray-50/60'}`}>
        <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-text">{invoice.invoiceId}</td>
        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
          {onViewBooking ? (
            <button
              type="button"
              onClick={() => onViewBooking(invoice.bookingId)}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {invoice.bookingId}
            </button>
          ) : (
            <span className="font-semibold text-text">{invoice.bookingId}</span>
          )}
          <span className="ml-1 text-gray-400">· {invoice.salesOrder}</span>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{invoice.route}</td>
        <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-gray-500 xl:table-cell">{invoice.invoiceDate}</td>
        <td className={`whitespace-nowrap px-4 py-3 text-xs font-semibold ${invoice.status === 'Overdue' ? 'text-danger' : 'text-gray-500'}`}>
          {invoice.dueDate}
          {invoice.agingDays > 0 && invoice.status !== 'Disputed' && (
            <span className="ml-1 rounded bg-danger/10 px-1 py-0.5 text-[10px] text-danger">+{invoice.agingDays}d</span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm font-extrabold text-text">
          {currency(invoice.amount)}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <Badge variant={cfg.badge as Parameters<typeof Badge>[0]['variant']}>{cfg.label}</Badge>
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <div className="flex items-center gap-1.5">
            {/* TODO: download invoice PDF from bridge/finance API */}
            <button
              type="button"
              title="Download invoice PDF"
              className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition hover:border-primary hover:text-primary"
              onClick={() => onDownload?.(invoice.invoiceId)}
            >
              <Download className="h-3.5 w-3.5" />
            </button>

            {invoice.status === 'Overdue' && !isDisputeSubmitted && (
              <button
                type="button"
                onClick={isDisputeOpen ? onCloseDispute : onOpenDispute}
                title={isDisputeOpen ? 'Cancel dispute' : 'Raise a dispute for this invoice'}
                className={`flex h-7 w-7 items-center justify-center rounded border transition ${
                  isDisputeOpen
                    ? 'border-orange-300 bg-orange-50 text-orange-500 hover:bg-orange-100'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-orange-300 hover:text-orange-500'
                }`}
              >
                {isDisputeOpen ? <X className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
              </button>
            )}

            {isDisputeSubmitted && (
              <span className="flex items-center gap-1 rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
                <Check className="h-3 w-3" /> Disputed
              </span>
            )}
          </div>
        </td>
      </tr>

      {isDisputeOpen && (
        <DisputeRow
          invoice={invoice}
          onSubmit={onSubmitDispute}
          onCancel={onCloseDispute}
        />
      )}
    </>
  )
}

// ─── Invoice card (mobile) ────────────────────────────────────────────────────

function InvoiceCard({ invoice, isDisputeSubmitted, onOpenDispute, onViewBooking }: {
  invoice:            MockInvoice
  isDisputeSubmitted: boolean
  onOpenDispute:      () => void
  onViewBooking?:     (id: string) => void
}) {
  const cfg = STATUS_CONFIG[invoice.status]
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-extrabold text-text">{invoice.invoiceId}</p>
          <p className="text-xs text-gray-500">
            {onViewBooking ? (
              <button type="button" onClick={() => onViewBooking(invoice.bookingId)}
                className="font-semibold text-primary underline-offset-2 hover:underline">
                {invoice.bookingId}
              </button>
            ) : invoice.bookingId}
            {' '}· {invoice.salesOrder}
          </p>
        </div>
        <Badge variant={cfg.badge as Parameters<typeof Badge>[0]['variant']}>{cfg.label}</Badge>
      </div>
      <p className="mt-2 text-sm text-gray-600">{invoice.route}</p>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-gray-400">Invoice date</span><span className="font-semibold text-text">{invoice.invoiceDate}</span>
        <span className="text-gray-400">Due date</span>
        <span className={`font-semibold ${invoice.status === 'Overdue' ? 'text-danger' : 'text-text'}`}>
          {invoice.dueDate}{invoice.agingDays > 0 && invoice.status !== 'Disputed' ? ` (+${invoice.agingDays}d)` : ''}
        </span>
        <span className="text-gray-400">Amount</span><span className="font-extrabold text-text">{currency(invoice.amount)}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => {/* TODO: download PDF */}} className="flex items-center gap-1.5 rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-primary hover:text-primary">
          <Download className="h-3.5 w-3.5" /> Download
        </button>
        {invoice.status === 'Overdue' && !isDisputeSubmitted && (
          <button type="button" onClick={onOpenDispute} className="flex items-center gap-1.5 rounded border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-50">
            <MessageSquare className="h-3.5 w-3.5" /> Raise Dispute
          </button>
        )}
        {isDisputeSubmitted && (
          <span className="flex items-center gap-1 rounded border border-orange-200 bg-orange-50 px-2 py-1.5 text-xs font-bold text-orange-600">
            <Check className="h-3 w-3" /> Disputed
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function FinanceSection({ bookings, onViewBooking, initialTab }: Props) {
  const [activeTab,        setActiveTab]        = useState<InvoiceTab>(initialTab ?? 'all')
  const [disputeOpenId,    setDisputeOpenId]    = useState<string | null>(null)
  const [disputedIds,      setDisputedIds]      = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem('customer-disputed-ids')
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>()
    } catch { return new Set<string>() }
  })
  const [mobileDisputeId,  setMobileDisputeId]  = useState<string | null>(null)
  const [mobileDisputeReason, setMobileDisputeReason] = useState('')
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const [financeToast,   setFinanceToast]   = useState<string | null>(null)
  useEffect(() => {
    if (!financeToast) return
    const t = setTimeout(() => setFinanceToast(null), 3000)
    return () => clearTimeout(t)
  }, [financeToast])

  // ── Derive invoices from real DELIVERED bookings; fall back to mock list ───
  const derivedInvoices = useMemo((): MockInvoice[] => {
    const delivered = bookings.filter((b) => b.status === 'DELIVERED' && b.freight > 0)
    if (!delivered.length) return MOCK_INVOICES
    return delivered.map((b) => {
      const invoiceDate = b.bookingDate.slice(0, 10)
      const due = new Date(new Date(invoiceDate).getTime() + 15 * 86_400_000).toISOString().slice(0, 10)
      const isPaid = !!(b.lrNumber && b.lrNumber !== '-')
      const today = new Date().toISOString().slice(0, 10)
      const agingDays = !isPaid && due < today ? Math.floor((Date.now() - new Date(due).getTime()) / 86_400_000) : 0
      const status: InvoiceStatus = isPaid ? 'Paid' : agingDays > 0 ? 'Overdue' : 'Pending'
      const origin  = (b.origin.split(',')[0] ?? b.origin).trim()
      const dest    = (b.destination.split(',')[0] ?? b.destination).trim()
      return {
        invoiceId:   `INV-${String(Number(b.id.replace(/\D/g, '')) + 2000).padStart(4, '0')}`,
        bookingId:   b.id,
        salesOrder:  b.salesOrder,
        route:       `${origin} → ${dest}`,
        invoiceDate,
        dueDate:     due,
        amount:      b.freight,
        status,
        agingDays,
      }
    })
  }, [bookings])

  // ── KPIs derived from real invoices ─────────────────────────────────────────
  const totalFreight = useMemo(
    () => bookings.reduce((sum, b) => sum + b.freight, 0),
    [bookings],
  )
  const avgFreight    = bookings.length > 0 ? Math.round(totalFreight / bookings.length) : 0
  const pendingTotal  = derivedInvoices.filter((i) => i.status === 'Pending').reduce((s, i) => s + i.amount, 0)
  const overdueTotal  = derivedInvoices.filter((i) => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0)
  const overdueCount  = derivedInvoices.filter((i) => i.status === 'Overdue').length
  const pendingCount  = derivedInvoices.filter((i) => i.status === 'Pending').length

  const KPI_TILES: Array<{
    label:   string
    value:   string
    detail:  string
    icon:    typeof TrendingUp
    accent:  string
    bg:      string
    onClick?: () => void
  }> = [
    { label: 'Total Freight YTD',  value: currency(totalFreight), detail: `${bookings.length} bookings`,       icon: TrendingUp,       accent: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Pending Invoices',   value: currency(pendingTotal), detail: `${pendingCount} open invoices`,     icon: ReceiptText,      accent: 'text-warning', bg: 'bg-warning/5', onClick: () => setActiveTab('pending') },
    { label: 'Overdue Amount',     value: currency(overdueTotal), detail: `${overdueCount} past credit days`,  icon: AlertTriangle,    accent: 'text-danger',  bg: 'bg-danger/5',  onClick: () => setActiveTab('overdue') },
    { label: 'Avg Freight / Trip', value: currency(avgFreight),   detail: 'Across current bookings',           icon: CircleDollarSign, accent: 'text-success', bg: 'bg-success/5' },
  ]

  // ── Aging buckets from open (Overdue/Disputed) invoices ─────────────────────
  const openInvoices = derivedInvoices.filter((i) => i.status === 'Overdue' || i.status === 'Disputed')
  const agingData = AGING_BUCKETS.map((bucket) => {
    const invoices = openInvoices.filter((i) => i.agingDays >= bucket.min && i.agingDays <= bucket.max)
    return { ...bucket, total: invoices.reduce((s, i) => s + i.amount, 0), count: invoices.length }
  })
  const agingMax = Math.max(...agingData.map((b) => b.total), 1)

  // ── Tab filtering ────────────────────────────────────────────────────────────
  const tabConfig   = TABS.find((t) => t.id === activeTab) ?? TABS[0]!
  const tabCounts   = TABS.map((t) => ({ id: t.id, count: derivedInvoices.filter((i) => t.statuses.includes(i.status)).length }))
  const displayed   = selectedBucket
    ? derivedInvoices.filter((i) => {
        const bucket = AGING_BUCKETS.find((ab) => ab.label === selectedBucket)
        return bucket ? i.agingDays >= bucket.min && i.agingDays <= bucket.max : tabConfig.statuses.includes(i.status)
      })
    : derivedInvoices.filter((i) => tabConfig.statuses.includes(i.status))

  // ── Dispute handlers ─────────────────────────────────────────────────────────
  function submitDispute(invoiceId: string) {
    setDisputedIds((prev) => {
      const next = new Set([...prev, invoiceId])
      try { sessionStorage.setItem('customer-disputed-ids', JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
    setDisputeOpenId(null)
    setMobileDisputeId(null)
    setMobileDisputeReason('')
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-text">Finance</h2>
          <p className="mt-1 text-sm text-gray-500">Invoice status, aging, and dispute management for your account.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setFinanceToast('Statement PDF generation coming soon')}>
          <Download className="h-4 w-4" />
          Download Statement
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_TILES.map((tile) => {
          const Icon = tile.icon
          const inner = (
            <CardContent className="p-5">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tile.bg}`}>
                <Icon className={`h-5 w-5 ${tile.accent}`} />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500">{tile.label}</p>
              <p className={`mt-1.5 text-2xl font-extrabold ${tile.label === 'Overdue Amount' && overdueTotal > 0 ? 'text-danger' : 'text-text'}`}>
                {tile.value}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">{tile.detail}</p>
              {tile.onClick && (
                <p className="mt-2 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  View invoices →
                </p>
              )}
            </CardContent>
          )
          return tile.onClick ? (
            <button key={tile.label} type="button" onClick={tile.onClick} className="group text-left transition hover:shadow-md">
              <Card className="h-full">{inner}</Card>
            </button>
          ) : (
            <Card key={tile.label}>{inner}</Card>
          )
        })}
      </div>

      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-bold text-danger">
              {overdueCount} invoice{overdueCount > 1 ? 's are' : ' is'} overdue — {currency(overdueTotal)} outstanding
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Please clear the balance to avoid late payment charges. Raise a dispute below if there is a discrepancy.
            </p>
          </div>
        </div>
      )}

      {/* Invoice list */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Invoices</CardTitle>
            {/* Tab strip */}
            <div role="tablist" className="flex flex-wrap gap-1.5">
              {TABS.map((t) => {
                const count = tabCounts.find((c) => c.id === t.id)?.count ?? 0
                const active = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => { setActiveTab(t.id); setDisputeOpenId(null) }}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      active
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {displayed.length === 0 ? (
            <div className="flex h-28 items-center justify-center gap-2 text-sm text-gray-400">
              <FileText className="h-5 w-5" />
              No invoices in this category
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-2.5">Invoice</th>
                      <th className="px-4 py-2.5">Booking / SO</th>
                      <th className="px-4 py-2.5">Route</th>
                      <th className="hidden px-4 py-2.5 xl:table-cell">Invoice Date</th>
                      <th className="px-4 py-2.5">Due Date</th>
                      <th className="px-4 py-2.5">Amount</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((invoice) => (
                      <InvoiceRow
                        key={invoice.invoiceId}
                        invoice={invoice}
                        isDisputeOpen={disputeOpenId === invoice.invoiceId}
                        isDisputeSubmitted={disputedIds.has(invoice.invoiceId)}
                        onOpenDispute={() => setDisputeOpenId(invoice.invoiceId)}
                        onCloseDispute={() => setDisputeOpenId(null)}
                        onSubmitDispute={(id, _reason) => submitDispute(id)}
                        onViewBooking={onViewBooking}
                        onDownload={(id) => setFinanceToast(`Invoice ${id} — PDF download coming soon`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {displayed.map((invoice) => (
                  <div key={invoice.invoiceId}>
                    <InvoiceCard
                      invoice={invoice}
                      isDisputeSubmitted={disputedIds.has(invoice.invoiceId)}
                      onOpenDispute={() => setMobileDisputeId(invoice.invoiceId)}
                      onViewBooking={onViewBooking}
                    />
                    {mobileDisputeId === invoice.invoiceId && (
                      <div className="rounded-b-lg border border-t-0 border-orange-200 bg-orange-50 p-4">
                        <p className="text-sm font-bold text-orange-800">Raise Dispute — {invoice.invoiceId}</p>
                        <textarea
                          value={mobileDisputeReason}
                          onChange={(e) => setMobileDisputeReason(e.target.value)}
                          rows={3}
                          placeholder="Describe the discrepancy…"
                          className="mt-2 w-full rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-200"
                        />
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={() => { if (mobileDisputeReason.trim()) submitDispute(invoice.invoiceId) }}>
                            Submit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setMobileDisputeId(null); setMobileDisputeReason('') }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Invoice aging chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoice Aging</CardTitle>
            <p className="text-xs text-gray-400">Open &amp; disputed invoices only</p>
          </div>
        </CardHeader>
        <CardContent>
          {openInvoices.length === 0 ? (
            <div className="flex h-20 items-center justify-center text-sm text-gray-400">No open invoices</div>
          ) : (
            <div className="space-y-3">
              {agingData.map((bucket) => (
                <div
                  key={bucket.label}
                  onClick={() => setSelectedBucket(selectedBucket === bucket.label ? null : bucket.label)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg p-1 transition-colors ${
                    selectedBucket === bucket.label ? 'bg-primary/5' : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="w-24 shrink-0 text-xs font-bold text-gray-500">{bucket.label}</p>
                  <div className="relative h-8 min-w-0 flex-1 overflow-hidden rounded bg-gray-100">
                    {bucket.total > 0 && (
                      <div
                        className={`flex h-full items-center justify-end rounded pr-2 transition-all ${bucket.color}`}
                        style={{ width: `${(bucket.total / agingMax) * 100}%` }}
                        title={`${bucket.count} invoice${bucket.count !== 1 ? 's' : ''} · ${currency(bucket.total)}`}
                      >
                        <span className="text-[10px] font-extrabold text-white">{currency(bucket.total)}</span>
                      </div>
                    )}
                    {bucket.total === 0 && (
                      <span className="absolute inset-y-0 left-2 flex items-center text-[10px] text-gray-400">—</span>
                    )}
                  </div>
                  <p className="w-12 shrink-0 text-right text-xs text-gray-500">{bucket.count}</p>
                </div>
              ))}
              <div className="flex justify-end gap-1 pt-1 text-[10px] text-gray-400">
                <span>Count →</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {financeToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {financeToast}
        </div>
      )}
    </section>
  )
}
