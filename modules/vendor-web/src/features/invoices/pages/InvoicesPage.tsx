import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useModuleNavigate as useNavigate } from '@vendor/hooks/useModuleRoute'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Card, CardContent } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate, formatDateTime } from '@vendor/lib/date-utils'
import { downloadElementAsPdf } from '@vendor/lib/pdf'
import { useVendorInvoices } from '@vendor/integration/useVendorInvoices'
import { useTenantBridge } from '@vendor/integration/tenant-data-bridge'
import { useVendorBookings } from '@vendor/integration/useVendorBookings'
import { useAppStore } from '@vendor/stores/app.store'
import { InvoicePdfDocument } from '@vendor/components/shared/InvoicePdfDocument'
import { useVendorInvoiceProfile, type VendorInvoiceProfileData } from '@vendor/integration/useVendorInvoiceProfile'
import { CalendarDays, CreditCard, Download, FileText, MessageSquareMore, Plus, RefreshCw, Search } from 'lucide-react'
import type { Dispute, Invoice, InvoiceLineItem, Trip } from '@vendor/types'

const CUSTOMER_ADDRESS =
  '161, Basavanagar Main Rd, above Reliance Trends, Vignan Nagar, Doddanekkundi Road, Bengaluru, Karnataka – 560037'

/** Renders the invoice off-screen and downloads it as a PDF on mount. */
function HiddenInvoicePdf({
  invoice,
  trips,
  profile,
  customerName,
  customerCode,
  getLrNumber,
  onDone,
}: {
  invoice: Invoice
  trips: Trip[]
  profile: VendorInvoiceProfileData
  customerName: string
  customerCode?: string
  getLrNumber: (tripId: string) => string | null
  onDone: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    void downloadElementAsPdf(ref.current, `${invoice.invoiceNumber || invoice.id}.pdf`).finally(onDone)
    // download once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div aria-hidden style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
      <InvoicePdfDocument
        ref={ref}
        invoice={invoice}
        trips={trips}
        companyName={profile.companyName}
        companyInfo={profile.companyInfo}
        bank={profile.bank}
        terms={profile.terms}
        logoUrl={profile.logoUrl}
        customerName={customerName}
        customerCode={customerCode}
        customerAddress={CUSTOMER_ADDRESS}
        getLrNumber={getLrNumber}
      />
    </div>
  )
}

type InvoiceWorkspaceTab = 'all' | 'pending' | 'approved' | 'disputed' | 'resubmission' | 'paid' | 'closed'
type StatusTab = Exclude<InvoiceWorkspaceTab, 'all'>

const INVOICE_TABS: InvoiceWorkspaceTab[] = ['all', 'pending', 'approved', 'disputed', 'resubmission', 'paid', 'closed']

function getInvoiceTab(search: string): InvoiceWorkspaceTab {
  const requested = new URLSearchParams(search).get('tab')
  return INVOICE_TABS.includes(requested as InvoiceWorkspaceTab) ? (requested as InvoiceWorkspaceTab) : 'all'
}

// The tab a single invoice belongs to is derived from its status — except a
// fully-paid invoice (its ledger receivable settled to zero by recorded
// payments) moves to the Paid tab regardless of its APPROVED status.
function tabForInvoice(invoice: Invoice, paidInvoiceIds: Set<string>): StatusTab {
  if (paidInvoiceIds.has(invoice.id)) return 'paid'
  switch (invoice.status) {
    case 'APPROVED':
      return 'approved'
    case 'DISPUTED':
      return 'disputed'
    case 'RESUBMISSION_REQUIRED':
      return 'resubmission'
    case 'CLOSED':
      return 'closed'
    default:
      return 'pending'
  }
}

const CLOSE_REASON_LABEL: Record<NonNullable<Invoice['closeReason']>, string> = {
  REJECTED: 'Rejected by finance',
  SUPERSEDED: 'Superseded by a new invoice',
  WITHDRAWN: 'Closed by vendor',
}

export default function InvoicesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = getInvoiceTab(location.search)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchText, setSearchText] = useState('')
  const [invoicePage, setInvoicePage] = useState(1)
  const [downloadInvoiceId, setDownloadInvoiceId] = useState<string | null>(null)

  const { invoices, disputes, closeInvoice } = useVendorInvoices()
  const ledger = useAppStore((s) => s.ledger)
  const bridge = useTenantBridge()

  // An invoice is "fully paid" when its customer-ledger receivable, opened on
  // approval, has been settled to a zero balance by the payments recorded
  // against it (payment + TDS entries).
  const paidInvoiceIds = useMemo(() => {
    const sorted = [...ledger]
      .filter((entry) => entry.ledgerType === 'CUSTOMER')
      .sort((a, b) => a.date.localeCompare(b.date))
    const opened = new Set<string>()
    const latestBalance = new Map<string, number>()
    for (const entry of sorted) {
      if (entry.entryType === 'INVOICE_APPROVED') opened.add(entry.invoiceId)
      latestBalance.set(entry.invoiceId, entry.runningBalance)
    }
    const paid = new Set<string>()
    for (const [invoiceId, balance] of latestBalance) {
      if (opened.has(invoiceId) && balance === 0) paid.add(invoiceId)
    }
    return paid
  }, [ledger])
  const { trips: allBookings, getBookingDetail } = useVendorBookings()
  // Approved driver expenses per trip — added into each invoice's totals.
  const expenseByTripId = useMemo(() => {
    const map = new Map<string, number>()
    allBookings.forEach((trip) => map.set(trip.id, trip.approvedExpenses ?? 0))
    return map
  }, [allBookings])
  const invoiceProfile = useVendorInvoiceProfile()
  const customerName = bridge?.tenantName ?? 'Optimile Pvt Ltd'
  const getLrNumber = (tripId: string) => getBookingDetail(tripId)?.lrNumbers?.[0] ?? null
  const downloadInvoice = downloadInvoiceId ? invoices.find((item) => item.id === downloadInvoiceId) : null

  const disputeByInvoice = useMemo(() => {
    const map: Record<string, Dispute | undefined> = {}
    disputes.forEach((dispute) => {
      map[dispute.invoiceId] = dispute
    })
    return map
  }, [disputes])

  const tabCounts = useMemo(() => {
    const counts: Record<InvoiceWorkspaceTab, number> = { all: invoices.length, pending: 0, approved: 0, disputed: 0, resubmission: 0, paid: 0, closed: 0 }
    invoices.forEach((invoice) => {
      counts[tabForInvoice(invoice, paidInvoiceIds)] += 1
    })
    return counts
  }, [invoices, paidInvoiceIds])

  const tabs: Array<{ key: InvoiceWorkspaceTab; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'disputed', label: 'Disputed' },
    { key: 'resubmission', label: 'Resubmission Required' },
    { key: 'paid', label: 'Paid' },
    { key: 'approved', label: 'Approved' },
    { key: 'closed', label: 'Closed' },
  ]

  const invoicesForTab = useMemo(() => {
    return invoices
      .filter((invoice) => {
        if (activeTab !== 'all' && tabForInvoice(invoice, paidInvoiceIds) !== activeTab) return false
        // Filter on the created-on date (date-only portion — createdAt carries a
        // time suffix that would break a raw string compare at the boundaries).
        const createdOn = (invoice.createdAt ?? '').slice(0, 10)
        if (fromDate && createdOn < fromDate) return false
        if (toDate && createdOn > toDate) return false
        const q = searchText.trim().toLowerCase()
        if (q && ![invoice.invoiceNumber, invoice.id, invoice.status].some((v) => (v ?? '').toLowerCase().includes(q))) return false
        return true
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [activeTab, fromDate, invoices, toDate, paidInvoiceIds, searchText])

  // Cards reflect the active date + search filter (across all tabs), so the
  // summary changes with the filter — not just the table.
  const filteredForCards = useMemo(
    () =>
      invoices.filter((invoice) => {
        const createdOn = (invoice.createdAt ?? '').slice(0, 10)
        if (fromDate && createdOn < fromDate) return false
        if (toDate && createdOn > toDate) return false
        const q = searchText.trim().toLowerCase()
        if (q && ![invoice.invoiceNumber, invoice.id, invoice.status].some((v) => (v ?? '').toLowerCase().includes(q))) return false
        return true
      }),
    [invoices, fromDate, toDate, searchText],
  )

  const approvedInvoices = filteredForCards.filter((invoice) => invoice.status === 'APPROVED')
  const approvedSummary = useMemo(() => {
    const totalInvoiceApproved = approvedInvoices.reduce((sum, invoice) => sum + invoice.grandTotal, 0)
    const totalGstApproved = approvedInvoices.reduce((sum, invoice) => sum + invoice.gstAmount, 0)
    return {
      approvedCount: approvedInvoices.length,
      totalInvoiceApproved,
      totalGstApproved,
    }
  }, [approvedInvoices])
  // Totals across the filtered invoices (all statuses) for the summary cards.
  const invoiceSummary = useMemo(
    () => ({
      totalInvoiced: filteredForCards.reduce((sum, invoice) => sum + invoice.grandTotal, 0),
      totalGst: filteredForCards.reduce((sum, invoice) => sum + invoice.gstAmount, 0),
    }),
    [filteredForCards],
  )

  const invoicePageSize = 5
  const invoiceTotalPages = Math.max(1, Math.ceil(invoicesForTab.length / invoicePageSize))
  const safePage = Math.min(invoicePage, invoiceTotalPages)
  const pagedInvoices = invoicesForTab.slice((safePage - 1) * invoicePageSize, safePage * invoicePageSize)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <HeroCard
          eyebrow="FINANCE"
          title="Invoices"
          subtitle="Track the normal invoice flow, respond to disputes, and resubmit corrections from one workspace."
          icon={<CreditCard className="h-5 w-5 text-primary" />}
        />
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setInvoicePage(1) }} className="h-10 w-[150px] rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-primary" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setInvoicePage(1) }} className="h-10 w-[150px] rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-primary" />
          {(fromDate || toDate) && (
            <Button variant="outline" size="sm" onClick={() => { setFromDate(''); setToDate(''); setInvoicePage(1) }}>Clear</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Invoice Approved</div>
            <div className="mt-2 text-2xl font-bold text-text">
              <CurrencyDisplay amount={approvedSummary.totalInvoiceApproved} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Invoiced</div>
            <div className="mt-2 text-2xl font-bold text-text">
              <CurrencyDisplay amount={invoiceSummary.totalInvoiced} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total GST Approved</div>
            <div className="mt-2 text-2xl font-bold text-amber-700">
              <CurrencyDisplay amount={approvedSummary.totalGstApproved} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setInvoicePage(1)
                  navigate(`/vendor/invoices?tab=${tab.key}`)
                }}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                  activeTab === tab.key ? 'bg-white text-text shadow-sm' : 'text-gray-600 hover:text-primary'
                }`}
              >
                {tab.label}
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{tabCounts[tab.key]}</span>
              </button>
            ))}
          </div>
          <Button onClick={() => navigate('/vendor/invoices/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        <div className="border-b border-gray-100 px-6 py-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setInvoicePage(1) }}
              placeholder="Search invoice no / status…"
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {invoicesForTab.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title={`No ${tabs.find((tab) => tab.key === activeTab)?.label.toLowerCase()} invoices`}
                description="This bucket will populate automatically as invoices move through finance review."
              />
            </div>
          ) : (
            <table className="w-full table-fixed text-center text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Invoice Number</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Date</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Created On</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Last Update</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Bookings</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Total Amount</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Action</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Dispute</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedInvoices.map((invoice) => {
                  const dispute = disputeByInvoice[invoice.id]
                  // Approved driver expenses across the invoice's trips.
                  const expense = invoice.lineItems.reduce((sum, li) => sum + (expenseByTripId.get(li.tripId) ?? 0), 0)
                  return (
                    <tr key={invoice.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/vendor/invoices/${invoice.id}`)}>
                      <td className="p-4 font-mono font-semibold">{invoice.invoiceNumber || invoice.id}</td>
                      <td className="p-4">{formatDate(invoice.invoiceDate)}</td>
                      <td className="p-4">{formatDateTime(invoice.createdAt)}</td>
                      <td className="p-4">{formatDateTime(invoice.statusUpdatedAt ?? invoice.createdAt)}</td>
                      <td className="p-4">
                        <StatusBadge status={paidInvoiceIds.has(invoice.id) ? 'PAID' : invoice.status} />
                        {invoice.status === 'CLOSED' && invoice.closeReason ? (
                          <p className="mt-1 text-xs text-gray-400">{CLOSE_REASON_LABEL[invoice.closeReason]}</p>
                        ) : null}
                      </td>
                      <td className="p-4">{invoice.lineItems.length}</td>
                      <td className="p-4">
                        <CurrencyDisplay amount={invoice.grandTotal + expense} className="font-semibold" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {invoice.status === 'RESUBMISSION_REQUIRED' ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => closeInvoice(invoice.id)}>
                                Close
                              </Button>
                              <Button size="sm" variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50" onClick={() => navigate(`/vendor/invoices/create?resubmit=${invoice.id}`)}>
                                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                                Resubmit
                              </Button>
                            </>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Download invoice PDF"
                            disabled={downloadInvoiceId === invoice.id}
                            onClick={() => setDownloadInvoiceId(invoice.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4">
                        {dispute ? (
                          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                            <StatusBadge status={dispute.status} />
                            {dispute.responseDueAt ? <p className="text-xs text-gray-400">SLA: {formatDate(dispute.responseDueAt)}</p> : null}
                            {invoice.status === 'DISPUTED' ? (
                              <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/disputes/${dispute.id}`)}>
                                <MessageSquareMore className="mr-1 h-3.5 w-3.5" />
                                Open Thread
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {invoicesForTab.length > 0 ? (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 text-sm text-gray-600">
            <span>Showing {(safePage - 1) * invoicePageSize + 1}-{Math.min(safePage * invoicePageSize, invoicesForTab.length)} of {invoicesForTab.length}</span>
            <div className="flex items-center gap-2">
              <button className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-text disabled:opacity-50" disabled={safePage === 1} onClick={() => setInvoicePage((page) => Math.max(1, page - 1))}>Previous</button>
              <span className="rounded-lg bg-gray-50 px-3 py-1.5 font-semibold text-text">Page {safePage} of {invoiceTotalPages}</span>
              <button className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-text disabled:opacity-50" disabled={safePage === invoiceTotalPages} onClick={() => setInvoicePage((page) => Math.min(invoiceTotalPages, page + 1))}>Next</button>
            </div>
          </div>
        ) : null}
      </div>

      {downloadInvoice ? (
        <HiddenInvoicePdf
          invoice={downloadInvoice}
          trips={allBookings}
          profile={invoiceProfile}
          customerName={customerName}
          customerCode={bridge?.tenantCode ?? undefined}
          getLrNumber={getLrNumber}
          onDone={() => setDownloadInvoiceId(null)}
        />
      ) : null}
    </div>
  )
}
