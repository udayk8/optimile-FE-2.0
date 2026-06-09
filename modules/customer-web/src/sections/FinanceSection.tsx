import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Check,
  CircleDollarSign,
  Download,
  FileText,
  MessageSquare,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  X,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Badge } from '@shared-ui/badge'
import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import type { Booking } from '../shared/customer-types'
import { currency } from '../shared/customer-types'
import type {
  CustomerInvoiceDispute,
  CustomerInvoiceStatus,
  CustomerInvoiceView,
} from '../integration/customer-data-bridge'

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  bookings:        Booking[]
  onViewBooking?:  (bookingId: string) => void
  initialTab?:     InvoiceTab
  // Live AR invoices issued by the 3PL (embedded mode). When present they replace
  // the mock/booking-derived list and the action buttons are wired to the bridge.
  invoices?:               CustomerInvoiceView[]
  onApprove?:              (invoiceId: string) => void
  onDispute?:              (invoiceId: string, reason: string) => void
  onRequestResubmission?:  (invoiceId: string, message?: string) => void
  onReject?:               (invoiceId: string, reason?: string) => void
  onReplyToDispute?:       (invoiceId: string, message: string) => void
}

// ─── Unified row shape (live bridge invoices + mock fallback share it) ──────────

type Row = {
  invoiceId:   string
  bookingId:   string
  salesOrder:  string
  route:       string
  invoiceDate: string
  dueDate:     string
  amount:      number
  status:      CustomerInvoiceStatus
  agingDays:   number
  dispute?:    CustomerInvoiceDispute
  live:        boolean   // true ⇒ from the shared store, actions enabled
}

// ─── Mock invoice data (standalone fallback only) ───────────────────────────────

const MOCK_INVOICES: Row[] = [
  { invoiceId: 'INV-4401', bookingId: 'BK-2401', salesOrder: 'SO-77821', route: 'Mumbai → Bengaluru',    invoiceDate: 'May 25, 2026', dueDate: 'Jun 9, 2026',  amount: 52_400, status: 'Pending',  agingDays: 0,  live: false },
  { invoiceId: 'INV-4398', bookingId: 'BK-2398', salesOrder: 'SO-77818', route: 'Pune → Coimbatore',    invoiceDate: 'May 30, 2026', dueDate: 'Jun 14, 2026', amount: 38_900, status: 'Paid',     agingDays: 0,  live: false },
  { invoiceId: 'INV-4390', bookingId: 'BK-2390', salesOrder: 'SO-77810', route: 'Nagpur → Hyderabad',   invoiceDate: 'May 18, 2026', dueDate: 'Jun 2, 2026',  amount: 44_100, status: 'Pending',  agingDays: 0,  live: false },
  { invoiceId: 'INV-4385', bookingId: 'BK-2385', salesOrder: 'SO-77805', route: 'Delhi → Jaipur',       invoiceDate: 'Apr 28, 2026', dueDate: 'May 13, 2026', amount: 41_200, status: 'Overdue',  agingDays: 25, live: false },
  { invoiceId: 'INV-4380', bookingId: 'BK-2380', salesOrder: 'SO-77800', route: 'Chennai → Vizag',      invoiceDate: 'Apr 22, 2026', dueDate: 'May 7, 2026',  amount: 29_600, status: 'Overdue',  agingDays: 31, live: false },
  { invoiceId: 'INV-4370', bookingId: 'BK-2370', salesOrder: 'SO-77789', route: 'Hyderabad → Nagpur',   invoiceDate: 'Apr 10, 2026', dueDate: 'Apr 25, 2026', amount: 55_100, status: 'Paid',     agingDays: 0,  live: false },
  { invoiceId: 'INV-4362', bookingId: 'BK-2362', salesOrder: 'SO-77780', route: 'Mumbai → Delhi',       invoiceDate: 'Mar 31, 2026', dueDate: 'Apr 15, 2026', amount: 67_800, status: 'Paid',     agingDays: 0,  live: false },
  { invoiceId: 'INV-4355', bookingId: 'BK-2355', salesOrder: 'SO-77772', route: 'Pune → Ahmedabad',     invoiceDate: 'Mar 20, 2026', dueDate: 'Apr 4, 2026',  amount: 34_500, status: 'Disputed', agingDays: 63, live: false },
  { invoiceId: 'INV-4348', bookingId: 'BK-2348', salesOrder: 'SO-77764', route: 'Bengaluru → Chennai',  invoiceDate: 'Mar 8, 2026',  dueDate: 'Mar 23, 2026', amount: 48_750, status: 'Pending',  agingDays: 0,  live: false },
  { invoiceId: 'INV-4340', bookingId: 'BK-2340', salesOrder: 'SO-77755', route: 'Kolkata → Bhubaneswar',invoiceDate: 'Feb 28, 2026', dueDate: 'Mar 15, 2026', amount: 22_300, status: 'Paid',     agingDays: 0,  live: false },
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

const STATUS_CONFIG: Record<CustomerInvoiceStatus, { badge: string; label: string }> = {
  Paid:                    { badge: 'success',     label: 'Paid' },
  Pending:                 { badge: 'warning',     label: 'Pending' },
  Approved:                { badge: 'info',        label: 'Approved' },
  Overdue:                 { badge: 'destructive',  label: 'Overdue' },
  Disputed:                { badge: 'destructive',  label: 'Disputed' },
  'Resubmission Required': { badge: 'warning',     label: 'Resubmission Required' },
  Closed:                  { badge: 'muted',       label: 'Closed' },
}

// ─── Tab config (simple reviewer view) ──────────────────────────────────────────

type InvoiceTab = 'all' | 'pending' | 'approved' | 'overdue' | 'disputed' | 'paid'
const TABS: Array<{ id: InvoiceTab; label: string; statuses: CustomerInvoiceStatus[] }> = [
  { id: 'all',      label: 'All',      statuses: ['Paid', 'Pending', 'Approved', 'Overdue', 'Disputed', 'Resubmission Required', 'Closed'] },
  { id: 'pending',  label: 'Pending',  statuses: ['Pending'] },
  { id: 'approved', label: 'Approved', statuses: ['Approved'] },
  { id: 'overdue',  label: 'Overdue',  statuses: ['Overdue'] },
  { id: 'disputed', label: 'Disputed', statuses: ['Disputed', 'Resubmission Required'] },
  { id: 'paid',     label: 'Paid',     statuses: ['Paid'] },
]

const fmtTs = (iso: string) => {
  try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

// ─── Action panel (approve / dispute / resubmit / dispute thread) ───────────────

type PanelKind = 'dispute' | 'resubmit' | 'thread' | 'reject'

function ActionPanel({
  invoice, kind, colSpan, onApprove, onDispute, onRequestResubmission, onReject, onReplyToDispute, onClose,
}: {
  invoice: Row
  kind: PanelKind
  colSpan?: number
  onApprove?: (id: string) => void
  onDispute?: (id: string, reason: string) => void
  onRequestResubmission?: (id: string, message?: string) => void
  onReject?: (id: string, reason?: string) => void
  onReplyToDispute?: (id: string, message: string) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const isThread = kind === 'thread'
  const threadOpen = invoice.dispute?.status === 'OPEN'
  const title = kind === 'dispute' ? 'Raise dispute'
    : kind === 'resubmit' ? 'Request resubmission'
    : kind === 'reject' ? 'Deny / reject invoice'
    : 'Dispute thread'

  const body = (
    <div className="flex items-start gap-4">
      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-orange-800">{title} — {invoice.invoiceId}</p>
          <button type="button" onClick={onClose} className="text-orange-500 hover:text-orange-700"><X className="h-4 w-4" /></button>
        </div>

        {isThread && invoice.dispute && (
          <div className="space-y-2 rounded-lg border border-orange-200 bg-white p-3">
            {invoice.dispute.messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.sender === 'CUSTOMER' ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{m.sender === 'CUSTOMER' ? 'You' : '3PL Finance'} · {fmtTs(m.createdAt)}</span>
                <span className={`mt-0.5 max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${m.sender === 'CUSTOMER' ? 'bg-primary/10 text-text' : 'bg-gray-100 text-gray-700'}`}>{m.message}</span>
              </div>
            ))}
            {!threadOpen && <p className="text-center text-[11px] text-gray-400">This thread is closed.</p>}
          </div>
        )}

        {(kind === 'dispute' || kind === 'resubmit' || kind === 'reject' || (isThread && threadOpen)) && (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder={
                kind === 'dispute'
                  ? 'e.g. Freight amount does not match the agreed rate card for this lane. Agreed rate: Rs 38,000.'
                  : kind === 'resubmit'
                    ? 'Tell the 3PL what to correct before re-issuing (rate, lane, accessorials…).'
                    : kind === 'reject'
                      ? 'Why are you rejecting this invoice? (it will be voided and sent back to the 3PL)'
                      : 'Reply to the 3PL…'
              }
              className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-200"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const t = text.trim()
                  if (kind === 'dispute') { if (t) { onDispute?.(invoice.invoiceId, t); onClose() } }
                  else if (kind === 'resubmit') { onRequestResubmission?.(invoice.invoiceId, t || undefined); onClose() }
                  else if (kind === 'reject') { onReject?.(invoice.invoiceId, t || undefined); onClose() }
                  else { if (t) { onReplyToDispute?.(invoice.invoiceId, t); setText('') } }
                }}
              >
                {kind === 'thread' ? 'Send reply' : kind === 'dispute' ? 'Submit dispute' : kind === 'reject' ? 'Reject invoice' : 'Request resubmission'}
              </Button>
              {kind === 'thread' && (
                <>
                  <Button size="sm" onClick={() => { onApprove?.(invoice.invoiceId); onClose() }}>
                    <Check className="h-3.5 w-3.5" /> Approve &amp; close
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { onRequestResubmission?.(invoice.invoiceId); onClose() }}>
                    <RefreshCw className="h-3.5 w-3.5" /> Ask 3PL to re-issue
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  if (colSpan) {
    return <tr><td colSpan={colSpan} className="border-b border-orange-200 bg-orange-50 px-6 py-4">{body}</td></tr>
  }
  return <div className="rounded-b-lg border border-t-0 border-orange-200 bg-orange-50 p-4">{body}</div>
}

// ─── Row action buttons (status- & live-aware) ──────────────────────────────────

function RowActions({
  invoice, onDownload, onApprove, openPanel,
}: {
  invoice: Row
  onDownload: (id: string) => void
  onApprove?: (id: string) => void
  openPanel: (kind: PanelKind) => void
}) {
  const IconBtn = ({ title, onClick, tone, children }: { title: string; onClick: () => void; tone?: string; children: ReactNode }) => (
    <button type="button" title={title} onClick={onClick}
      className={`flex h-7 items-center gap-1 whitespace-nowrap rounded border bg-white px-2.5 text-xs font-semibold transition ${tone ?? 'border-gray-200 text-gray-500 hover:border-primary hover:text-primary'}`}>
      {children}
    </button>
  )
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {invoice.live && invoice.status === 'Pending' && (
        <>
          <button type="button" title="Approve this invoice" onClick={() => onApprove?.(invoice.invoiceId)}
            className="flex h-7 items-center gap-1 whitespace-nowrap rounded border border-transparent bg-success px-2.5 text-xs font-semibold text-white transition hover:bg-success/90">
            <Check className="h-3.5 w-3.5" />Approve
          </button>
          <IconBtn title="Dispute this invoice" tone="border-orange-300 text-orange-600 hover:bg-orange-50" onClick={() => openPanel('dispute')}><MessageSquare className="h-3.5 w-3.5" />Dispute</IconBtn>
          <IconBtn title="Request resubmission" onClick={() => openPanel('resubmit')}><RefreshCw className="h-3.5 w-3.5" />Resubmit</IconBtn>
          <IconBtn title="Deny / reject this invoice" tone="border-red-300 text-red-600 hover:bg-red-50" onClick={() => openPanel('reject')}><Ban className="h-3.5 w-3.5" />Deny</IconBtn>
        </>
      )}
      {invoice.live && invoice.status === 'Disputed' && (
        <>
          <button type="button" title="Approve & resolve" onClick={() => onApprove?.(invoice.invoiceId)}
            className="flex h-7 items-center gap-1 whitespace-nowrap rounded border border-transparent bg-success px-2.5 text-xs font-semibold text-white transition hover:bg-success/90">
            <Check className="h-3.5 w-3.5" />Approve
          </button>
          <IconBtn title="Open dispute thread" tone="border-orange-300 text-orange-600 hover:bg-orange-50" onClick={() => openPanel('thread')}><MessageSquare className="h-3.5 w-3.5" />Open thread</IconBtn>
          <IconBtn title="Deny / reject this invoice" tone="border-red-300 text-red-600 hover:bg-red-50" onClick={() => openPanel('reject')}><Ban className="h-3.5 w-3.5" />Deny</IconBtn>
        </>
      )}
      {invoice.status === 'Resubmission Required' && (
        <span className="flex items-center gap-1 whitespace-nowrap rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">Awaiting 3PL re-issue</span>
      )}
      <button type="button" title="Download invoice PDF" onClick={() => onDownload(invoice.invoiceId)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition hover:border-primary hover:text-primary">
        <Download className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function FinanceSection({
  bookings, onViewBooking, initialTab,
  invoices, onApprove, onDispute, onRequestResubmission, onReject, onReplyToDispute,
}: Props) {
  const [activeTab,      setActiveTab]      = useState<InvoiceTab>(initialTab ?? 'all')
  const [panel,          setPanel]          = useState<{ id: string; kind: PanelKind } | null>(null)
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const [financeToast,   setFinanceToast]   = useState<string | null>(null)
  useEffect(() => {
    if (!financeToast) return
    const t = setTimeout(() => setFinanceToast(null), 3000)
    return () => clearTimeout(t)
  }, [financeToast])

  const live = Array.isArray(invoices)

  // ── Rows: live AR invoices when bridged, else booking-derived / mock ─────────
  const rows = useMemo<Row[]>(() => {
    if (live) {
      return invoices!.map((inv) => ({
        invoiceId: inv.invoiceId,
        bookingId: inv.bookingRef,
        salesOrder: inv.bookingRef,
        route: inv.route,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        amount: inv.amount,
        status: inv.status,
        agingDays: inv.agingDays,
        dispute: inv.dispute,
        live: true,
      }))
    }
    const delivered = bookings.filter((b) => b.status === 'DELIVERED' && b.freight > 0)
    if (!delivered.length) return MOCK_INVOICES
    return delivered.map((b) => {
      const invoiceDate = b.bookingDate.slice(0, 10)
      const due = new Date(new Date(invoiceDate).getTime() + 15 * 86_400_000).toISOString().slice(0, 10)
      const isPaid = !!(b.lrNumber && b.lrNumber !== '-')
      const today = new Date().toISOString().slice(0, 10)
      const agingDays = !isPaid && due < today ? Math.floor((Date.now() - new Date(due).getTime()) / 86_400_000) : 0
      const status: CustomerInvoiceStatus = isPaid ? 'Paid' : agingDays > 0 ? 'Overdue' : 'Pending'
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
        live:        false,
      }
    })
  }, [live, invoices, bookings])

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const totalFreight = useMemo(() => bookings.reduce((sum, b) => sum + b.freight, 0), [bookings])
  const avgFreight   = bookings.length > 0 ? Math.round(totalFreight / bookings.length) : 0
  const pendingTotal = rows.filter((i) => i.status === 'Pending').reduce((s, i) => s + i.amount, 0)
  const overdueTotal = rows.filter((i) => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0)
  const overdueCount = rows.filter((i) => i.status === 'Overdue').length
  const pendingCount = rows.filter((i) => i.status === 'Pending').length

  const KPI_TILES: Array<{ label: string; value: string; detail: string; icon: typeof TrendingUp; accent: string; bg: string; onClick?: () => void }> = [
    { label: 'Total Freight YTD',  value: currency(totalFreight), detail: `${bookings.length} bookings`,       icon: TrendingUp,       accent: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Pending Invoices',   value: currency(pendingTotal), detail: `${pendingCount} open invoices`,     icon: ReceiptText,      accent: 'text-warning', bg: 'bg-warning/5', onClick: () => setActiveTab('pending') },
    { label: 'Overdue Amount',     value: currency(overdueTotal), detail: `${overdueCount} past credit days`,  icon: AlertTriangle,    accent: 'text-danger',  bg: 'bg-danger/5',  onClick: () => setActiveTab('overdue') },
    { label: 'Avg Freight / Trip', value: currency(avgFreight),   detail: 'Across current bookings',           icon: CircleDollarSign, accent: 'text-success', bg: 'bg-success/5' },
  ]

  // ── Aging buckets from open (Overdue/Disputed) invoices ─────────────────────
  const openInvoices = rows.filter((i) => i.status === 'Overdue' || i.status === 'Disputed')
  const agingData = AGING_BUCKETS.map((bucket) => {
    const inv = openInvoices.filter((i) => i.agingDays >= bucket.min && i.agingDays <= bucket.max)
    return { ...bucket, total: inv.reduce((s, i) => s + i.amount, 0), count: inv.length }
  })
  const agingMax = Math.max(...agingData.map((b) => b.total), 1)

  // ── Tab filtering ────────────────────────────────────────────────────────────
  const tabConfig = TABS.find((t) => t.id === activeTab) ?? TABS[0]!
  const tabCounts = TABS.map((t) => ({ id: t.id, count: rows.filter((i) => t.statuses.includes(i.status)).length }))
  const displayed = selectedBucket
    ? rows.filter((i) => {
        const bucket = AGING_BUCKETS.find((ab) => ab.label === selectedBucket)
        return bucket ? i.agingDays >= bucket.min && i.agingDays <= bucket.max : tabConfig.statuses.includes(i.status)
      })
    : rows.filter((i) => tabConfig.statuses.includes(i.status))

  const onDownload = (id: string) => setFinanceToast(`Invoice ${id} — PDF download coming soon`)

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-text">Finance</h2>
        <p className="mt-1 text-sm text-gray-500">Review invoices from your 3PL — approve, dispute, or request a correction.</p>
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
                <p className="mt-2 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">View invoices →</p>
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
            <p className="mt-1 text-xs text-gray-600">Please clear the balance to avoid late payment charges. Dispute below if there is a discrepancy.</p>
          </div>
        </div>
      )}

      {/* Invoice list */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Invoices</CardTitle>
            <div role="tablist" className="flex flex-wrap gap-1.5">
              {TABS.map((t) => {
                const count = tabCounts.find((c) => c.id === t.id)?.count ?? 0
                const active = activeTab === t.id
                return (
                  <button key={t.id} type="button" role="tab" aria-selected={active}
                    onClick={() => { setActiveTab(t.id); setPanel(null); setSelectedBucket(null) }}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      active ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}>
                    {t.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
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
                      <th className="px-4 py-2.5">Invoice / Booking</th>
                      <th className="px-4 py-2.5">Due Date</th>
                      <th className="px-4 py-2.5">Amount</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((invoice) => {
                      const cfg = STATUS_CONFIG[invoice.status]
                      const panelOpen = panel?.id === invoice.invoiceId
                      const [routeFrom = '', routeTo = ''] = invoice.route.split('→')
                      const fromCity = (routeFrom.split(',')[0] ?? '').trim()
                      const toCity   = (routeTo.split(',')[0] ?? '').trim()
                      return (
                        <Fragment key={invoice.invoiceId}>
                          <tr className={`border-b border-gray-100 transition-colors ${panelOpen ? 'bg-orange-50/40' : 'hover:bg-gray-50/60'}`}>
                            {/* Combined invoice + booking block (mirrors the booking row) */}
                            <td className="px-4 py-3 align-top">
                              <p className="text-sm font-bold text-text">{invoice.invoiceId}</p>
                              <p className="mt-0.5 text-[11px] text-gray-400">{invoice.invoiceDate}</p>
                              {onViewBooking ? (
                                <button type="button" onClick={() => onViewBooking(invoice.bookingId)} className="mt-1 block text-xs font-semibold text-primary underline-offset-2 hover:underline">{invoice.bookingId}</button>
                              ) : (
                                <p className="mt-1 text-xs font-semibold text-text">{invoice.bookingId}</p>
                              )}
                              {fromCity && toCity ? (
                                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                                  <span>{fromCity}</span>
                                  <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                                  <span>{toCity}</span>
                                </p>
                              ) : (
                                <p className="mt-0.5 text-[11px] text-gray-400">{invoice.route}</p>
                              )}
                            </td>
                            <td className={`whitespace-nowrap px-4 py-3 align-top text-xs font-semibold ${invoice.status === 'Overdue' ? 'text-danger' : 'text-gray-500'}`}>
                              {invoice.dueDate}
                              {invoice.agingDays > 0 && invoice.status === 'Overdue' && (
                                <span className="ml-1 rounded bg-danger/10 px-1 py-0.5 text-[10px] text-danger">+{invoice.agingDays}d</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-top text-sm font-extrabold text-text">{currency(invoice.amount)}</td>
                            <td className="whitespace-nowrap px-4 py-3 align-top"><Badge variant={cfg.badge as Parameters<typeof Badge>[0]['variant']}>{cfg.label}</Badge></td>
                            <td className="px-4 py-3 align-top">
                              <RowActions invoice={invoice} onDownload={onDownload} onApprove={onApprove}
                                openPanel={(kind) => setPanel({ id: invoice.invoiceId, kind })} />
                            </td>
                          </tr>
                          {panelOpen && (
                            <ActionPanel invoice={invoice} kind={panel!.kind} colSpan={5}
                              onApprove={onApprove} onDispute={onDispute} onRequestResubmission={onRequestResubmission} onReject={onReject} onReplyToDispute={onReplyToDispute}
                              onClose={() => setPanel(null)} />
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {displayed.map((invoice) => {
                  const cfg = STATUS_CONFIG[invoice.status]
                  const panelOpen = panel?.id === invoice.invoiceId
                  return (
                    <div key={invoice.invoiceId}>
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-extrabold text-text">{invoice.invoiceId}</p>
                            <p className="text-xs text-gray-500">
                              {onViewBooking ? (
                                <button type="button" onClick={() => onViewBooking(invoice.bookingId)} className="font-semibold text-primary underline-offset-2 hover:underline">{invoice.bookingId}</button>
                              ) : invoice.bookingId}
                            </p>
                          </div>
                          <Badge variant={cfg.badge as Parameters<typeof Badge>[0]['variant']}>{cfg.label}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{invoice.route}</p>
                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <span className="text-gray-400">Invoice date</span><span className="font-semibold text-text">{invoice.invoiceDate}</span>
                          <span className="text-gray-400">Due date</span>
                          <span className={`font-semibold ${invoice.status === 'Overdue' ? 'text-danger' : 'text-text'}`}>{invoice.dueDate}{invoice.agingDays > 0 && invoice.status === 'Overdue' ? ` (+${invoice.agingDays}d)` : ''}</span>
                          <span className="text-gray-400">Amount</span><span className="font-extrabold text-text">{currency(invoice.amount)}</span>
                        </div>
                        <div className="mt-3">
                          <RowActions invoice={invoice} onDownload={onDownload} onApprove={onApprove}
                            openPanel={(kind) => setPanel({ id: invoice.invoiceId, kind })} />
                        </div>
                      </div>
                      {panelOpen && (
                        <ActionPanel invoice={invoice} kind={panel!.kind}
                          onApprove={onApprove} onDispute={onDispute} onRequestResubmission={onRequestResubmission} onReject={onReject} onReplyToDispute={onReplyToDispute}
                          onClose={() => setPanel(null)} />
                      )}
                    </div>
                  )
                })}
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
                <div key={bucket.label}
                  onClick={() => setSelectedBucket(selectedBucket === bucket.label ? null : bucket.label)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg p-1 transition-colors ${selectedBucket === bucket.label ? 'bg-primary/5' : 'hover:bg-gray-50'}`}>
                  <p className="w-24 shrink-0 text-xs font-bold text-gray-500">{bucket.label}</p>
                  <div className="relative h-8 min-w-0 flex-1 overflow-hidden rounded bg-gray-100">
                    {bucket.total > 0 && (
                      <div className={`flex h-full items-center justify-end rounded pr-2 transition-all ${bucket.color}`}
                        style={{ width: `${(bucket.total / agingMax) * 100}%` }}
                        title={`${bucket.count} invoice${bucket.count !== 1 ? 's' : ''} · ${currency(bucket.total)}`}>
                        <span className="text-[10px] font-extrabold text-white">{currency(bucket.total)}</span>
                      </div>
                    )}
                    {bucket.total === 0 && <span className="absolute inset-y-0 left-2 flex items-center text-[10px] text-gray-400">—</span>}
                  </div>
                  <p className="w-12 shrink-0 text-right text-xs text-gray-500">{bucket.count}</p>
                </div>
              ))}
              <div className="flex justify-end gap-1 pt-1 text-[10px] text-gray-400"><span>Count →</span></div>
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
