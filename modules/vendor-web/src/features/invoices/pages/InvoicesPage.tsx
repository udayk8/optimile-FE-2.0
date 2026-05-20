import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Card, CardContent } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { CreditCard, Plus, Download, FileText, MessageSquareWarning, X, ArrowRight, Edit2, Eye } from 'lucide-react'
import type { InvoiceStatus, DisputeStatus, InvoiceLineItem, Dispute } from '@vendor/types'

const DISPUTE_CHIP: Record<DisputeStatus, string> = {
  OPEN: 'bg-rose-50 text-rose-700 border border-rose-100',
  IN_REVIEW: 'bg-amber-50 text-amber-700 border border-amber-100',
  ACCEPTED: 'bg-green-50 text-green-700 border border-green-100',
  CANCELLED: 'bg-gray-100 text-gray-600 border border-gray-200',
  CLOSED: 'bg-gray-100 text-gray-600 border border-gray-200',
}

type InvoiceTab = 'create' | 'list'
const INVOICE_TABS: InvoiceTab[] = ['create', 'list']

function getInvoiceTab(pathname: string, search: string): InvoiceTab {
  const pathTab = pathname.split('/')[3]
  if (INVOICE_TABS.includes(pathTab as InvoiceTab)) return pathTab as InvoiceTab
  const searchTab = new URLSearchParams(search).get('tab')
  return INVOICE_TABS.includes(searchTab as InvoiceTab) ? (searchTab as InvoiceTab) : 'list'
}

const STATUS_FILTERS: { value: InvoiceStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function InvoicesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [invoicePage, setInvoicePage] = useState(1)
  const activeTab = getInvoiceTab(location.pathname, location.search)

  // Raise Dispute modal state
  const [raiseModal, setRaiseModal] = useState<{ invoiceId: string; invoiceNumber: string; amount: number } | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  // Edit & Resubmit modal state
  const [editModalInvoiceId, setEditModalInvoiceId] = useState<string | null>(null)
  const [editedItems, setEditedItems] = useState<InvoiceLineItem[]>([])

  // View Dispute modal state
  const [viewDispute, setViewDispute] = useState<Dispute | null>(null)

  const { trips, invoices, disputes, generateInvoice, raiseDispute, resubmitInvoice } = useAppStore()

  const disputeByInvoice = useMemo(() => {
    const map: Record<string, typeof disputes[0]> = {}
    disputes.forEach((d) => { map[d.invoiceId] = d })
    return map
  }, [disputes])

  const uninvoicedBookings = trips.filter((t) => t.status === 'COMPLETED' && !t.isInvoiced)
  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false
    if (fromDate && inv.invoiceDate < fromDate) return false
    if (toDate && inv.invoiceDate > toDate) return false
    return true
  })

  const approvedInvoicesInRange = invoices.filter((inv) => {
    if (inv.status !== 'APPROVED') return false
    if (fromDate && inv.invoiceDate < fromDate) return false
    if (toDate && inv.invoiceDate > toDate) return false
    return true
  })

  const approvedSummary = useMemo(() => {
    const totalInvoiceApproved = approvedInvoicesInRange.reduce((sum, inv) => sum + inv.grandTotal, 0)
    const totalGstApproved = approvedInvoicesInRange.reduce((sum, inv) => sum + inv.gstAmount, 0)
    const approvedCount = approvedInvoicesInRange.length
    return { totalInvoiceApproved, totalGstApproved, approvedCount }
  }, [approvedInvoicesInRange])

  const invoicePageSize = 5
  const invoiceTotalPages = Math.max(1, Math.ceil(filteredInvoices.length / invoicePageSize))
  const safePage = Math.min(invoicePage, invoiceTotalPages)
  const pagedInvoices = filteredInvoices.slice((safePage - 1) * invoicePageSize, safePage * invoicePageSize)

  const editInvoice = editModalInvoiceId ? invoices.find((inv) => inv.id === editModalInvoiceId) : null
  const editSubtotal = editedItems.reduce((s, item) => s + item.lineTotal, 0)
  const editGstRate = editInvoice && editInvoice.subtotal > 0 ? editInvoice.gstAmount / editInvoice.subtotal : 0.12
  const editGst = Math.round(editSubtotal * editGstRate)
  const editTotal = editSubtotal + editGst

  const handleToggleBooking = (bookingId: string) => {
    setSelectedBookings((prev) =>
      prev.includes(bookingId) ? prev.filter((id) => id !== bookingId) : [...prev, bookingId]
    )
  }

  const handleGenerateInvoice = () => {
    generateInvoice({ tripIds: selectedBookings })
    setSelectedBookings([])
    navigate('/vendor/invoices/list')
  }

  const openRaiseModal = (e: React.MouseEvent, invoiceId: string, invoiceNumber: string, amount: number) => {
    e.stopPropagation()
    setRaiseModal({ invoiceId, invoiceNumber, amount })
    setReason('')
    setReasonError('')
  }

  const handleRaiseDispute = () => {
    if (!reason.trim()) { setReasonError('Reason is required'); return }
    if (!raiseModal) return
    raiseDispute(raiseModal.invoiceId, raiseModal.invoiceNumber, raiseModal.amount, reason.trim())
    setRaiseModal(null)
    setReason('')
    setReasonError('')
  }

  const openEditModal = (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation()
    const inv = invoices.find((i) => i.id === invoiceId)
    if (!inv) return
    setEditedItems(inv.lineItems.map((item) => ({ ...item, expenses: item.expenses.map((exp) => ({ ...exp })) })))
    setEditModalInvoiceId(invoiceId)
  }

  const handleExpenseChange = (lineIdx: number, expIdx: number, value: number) => {
    setEditedItems((prev) =>
      prev.map((item, i) => {
        if (i !== lineIdx) return item
        const newExpenses = item.expenses.map((exp, j) =>
          j !== expIdx ? exp : { ...exp, amount: Math.max(0, value) }
        )
        return { ...item, expenses: newExpenses, lineTotal: item.freightCharge + newExpenses.reduce((s, e) => s + e.amount, 0) }
      })
    )
  }

  const handleFreightChange = (lineIdx: number, value: number) => {
    setEditedItems((prev) =>
      prev.map((item, i) => {
        if (i !== lineIdx) return item
        const freightCharge = Math.max(0, value)
        return { ...item, freightCharge, lineTotal: freightCharge + item.expenses.reduce((s, e) => s + e.amount, 0) }
      })
    )
  }

  const handleResubmit = () => {
    if (!editModalInvoiceId) return
    resubmitInvoice(editModalInvoiceId, editedItems)
    setEditModalInvoiceId(null)
  }

  const tabs: { key: InvoiceTab; label: string; icon: React.ReactNode }[] = [
    { key: 'create', label: 'Create Invoice', icon: <Plus className="h-4 w-4" /> },
    { key: 'list', label: 'My Invoices', icon: <FileText className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      <HeroCard
        eyebrow="FINANCE"
        title="Invoices"
        subtitle="Manage your billing, track payments, and create new invoices"
        icon={<CreditCard className="h-5 w-5 text-primary" />}
      />

      <div className="mb-4 flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => navigate(`/vendor/invoices/${tab.key}`)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-white text-text shadow-sm' : 'text-gray-600 hover:text-primary'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Create Invoice */}
      {activeTab === 'create' && (
        <div>
          <h3 className="mb-4 text-lg font-extrabold text-text">Select Uninvoiced Bookings</h3>
          {uninvoicedBookings.length === 0 ? (
            <EmptyState icon={<CreditCard className="h-12 w-12" />} title="No uninvoiced bookings" description="Completed bookings with confirmed POD and approved expenses will appear here." />
          ) : (
            <div className="space-y-4">
              {uninvoicedBookings.map((booking) => (
                <Card key={booking.id} className="cursor-pointer border-l-4 border-l-emerald-500 hover:bg-accent/10" onClick={() => handleToggleBooking(booking.id)}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={selectedBookings.includes(booking.id)} readOnly />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{booking.id}</span>
                          <StatusBadge status="COMPLETED" />
                        </div>
                        <p className="text-sm text-gray-500">{booking.laneDetails.origin.city} → {booking.laneDetails.destination.city} · {booking.deliveredDate ? formatDate(booking.deliveredDate) : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Freight + Expenses</div>
                      <CurrencyDisplay amount={booking.freightRate + booking.expenseSummary.approved} className="text-lg font-semibold" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button className="mt-4" disabled={selectedBookings.length === 0} onClick={handleGenerateInvoice}>
                <Plus className="mr-1 h-4 w-4" /> Generate Invoice
              </Button>
            </div>
          )}
        </div>
      )}

      {/* My Invoices */}
      {activeTab === 'list' && (
        <div>
          <div className="mb-4 grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Approved Invoices</div>
                <div className="mt-2 text-2xl font-bold text-text">{approvedSummary.approvedCount}</div>
              </CardContent>
            </Card>
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
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total GST Approved</div>
                <div className="mt-2 text-2xl font-bold text-amber-700">
                  <CurrencyDisplay amount={approvedSummary.totalGstApproved} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
              {STATUS_FILTERS.map((f) => (
                <button key={f.value} onClick={() => setStatusFilter(f.value)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${statusFilter === f.value ? 'bg-white text-text shadow-sm' : 'text-gray-600 hover:text-primary'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <Input type="date" value={fromDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setFromDate(e.target.value)} className="w-[180px]" />
            <Input type="date" value={toDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setToDate(e.target.value)} className="w-[180px]" />
            {(fromDate || toDate) && (
              <Button variant="outline" size="sm" onClick={() => { setFromDate(''); setToDate('') }}>
                Clear dates
              </Button>
            )}
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            {filteredInvoices.length === 0 ? (
              <div className="p-8"><EmptyState icon={<FileText className="h-12 w-12" />} title="No invoices found" /></div>
            ) : (
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Invoice Number</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Date</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Dispute</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Bookings</th>
                    <th className="p-4 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Freight Amount</th>
                    <th className="p-4 text-right text-xs font-bold uppercase tracking-wide text-gray-500">GST</th>
                    <th className="p-4 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Total Amount</th>
                    <th className="p-4 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pagedInvoices.map((inv) => {
                    const dispute = disputeByInvoice[inv.id]
                    return (
                      <tr key={inv.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/vendor/invoices/${inv.id}`)}>
                        <td className="p-4 font-mono font-semibold">{inv.invoiceNumber || inv.id}</td>
                        <td className="p-4">{formatDate(inv.invoiceDate)}</td>
                        <td className="p-4"><StatusBadge status={inv.status} /></td>
                        <td className="p-4">
                          {dispute ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewDispute(dispute) }}
                              className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition-opacity hover:opacity-75 ${DISPUTE_CHIP[dispute.status]}`}
                            >
                              {dispute.status.replace('_', ' ')}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-4">{inv.lineItems?.length || 0}</td>
                        <td className="p-4 text-right"><CurrencyDisplay amount={inv.subtotal} className="font-medium text-text" /></td>
                        <td className="p-4 text-right"><CurrencyDisplay amount={inv.gstAmount} className="font-medium text-amber-700" /></td>
                        <td className="p-4 text-right"><CurrencyDisplay amount={inv.grandTotal} className="font-semibold" /></td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {inv.status === 'REJECTED' && !dispute && (
                              <Button size="sm" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50"
                                onClick={(e) => openRaiseModal(e, inv.id, inv.invoiceNumber, inv.grandTotal)}>
                                <MessageSquareWarning className="mr-1 h-3.5 w-3.5" />
                                Raise Dispute
                              </Button>
                            )}
                            {dispute && (dispute.status === 'OPEN' || dispute.status === 'CANCELLED') && (
                              <Button size="sm" variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50"
                                onClick={(e) => { e.stopPropagation(); setViewDispute(dispute) }}>
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                View Dispute
                              </Button>
                            )}
                            {inv.status === 'CANCELLED' && (
                              <Button size="sm" variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50"
                                onClick={(e) => openEditModal(e, inv.id)}>
                                <Edit2 className="mr-1 h-3.5 w-3.5" />
                                Edit &amp; Resubmit
                              </Button>
                            )}
                            {inv.status === 'APPROVED' && (
                              <Button size="sm" variant="ghost" title="Download invoice PDF" onClick={(e) => { e.stopPropagation(); window.alert('Downloading Invoice PDF...') }}>
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          {filteredInvoices.length > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
              <span>Showing {(safePage - 1) * invoicePageSize + 1}–{Math.min(safePage * invoicePageSize, filteredInvoices.length)} of {filteredInvoices.length}</span>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-text disabled:opacity-50" disabled={safePage === 1} onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}>Previous</button>
                <span className="rounded-lg bg-gray-50 px-3 py-1.5 font-semibold text-text">Page {safePage} of {invoiceTotalPages}</span>
                <button className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-text disabled:opacity-50" disabled={safePage === invoiceTotalPages} onClick={() => setInvoicePage((p) => Math.min(invoiceTotalPages, p + 1))}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Raise Dispute Modal */}
      {raiseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text">Raise Dispute</h3>
              <button onClick={() => setRaiseModal(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm">
              <span className="font-mono font-bold text-text">{raiseModal.invoiceNumber}</span>
              <span className="ml-2 text-gray-500">·</span>
              <span className="ml-2 text-gray-500">Amount: </span>
              <CurrencyDisplay amount={raiseModal.amount} className="font-semibold text-text" />
            </div>
            <div className="mt-4 space-y-1">
              <label className="text-sm font-semibold text-text">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value); setReasonError('') }}
                placeholder="Why are you contesting this rejection?"
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white"
              />
              {reasonError && <p className="text-xs font-semibold text-rose-600">{reasonError}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRaiseModal(null)}>Cancel</Button>
              <Button onClick={handleRaiseDispute}>
                Submit <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Dispute Modal */}
      {viewDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-primary">{viewDispute.id}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${DISPUTE_CHIP[viewDispute.status]}`}>
                  {viewDispute.status.replace('_', ' ')}
                </span>
              </div>
              <button onClick={() => setViewDispute(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">Raised {formatDate(viewDispute.raisedAt)}</p>
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Your reason</p>
              <p className="mt-1 text-sm text-gray-700">"{viewDispute.reason}"</p>
            </div>
            {viewDispute.status === 'CANCELLED' && viewDispute.notes && (
              <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Admin response</p>
                <p className="mt-1 text-sm text-orange-800">{viewDispute.notes}</p>
              </div>
            )}
            <div className="mt-5 flex justify-end">
              <Button variant="outline" onClick={() => setViewDispute(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit & Resubmit Modal */}
      {editModalInvoiceId && editInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text">Edit &amp; Resubmit</h3>
                <p className="mt-0.5 text-xs text-gray-500 font-mono">{editInvoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setEditModalInvoiceId(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-xs font-semibold text-gray-500">Update freight and expense amounts before resubmitting.</p>

            <div className="mt-4 space-y-3">
              {editedItems.map((item, lineIdx) => (
                <div key={item.tripId} className="rounded-xl border border-gray-200 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-text">{item.tripReference}</span>
                    <span className="text-xs text-gray-500">Line: <CurrencyDisplay amount={item.lineTotal} className="font-semibold text-text" /></span>
                  </div>
                  {/* Freight editable */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-600">Freight</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-400">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={item.freightCharge}
                        onChange={(e) => handleFreightChange(lineIdx, Number(e.target.value))}
                        className="w-28 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-right text-sm font-semibold text-text outline-none focus:border-primary focus:bg-white"
                      />
                    </div>
                  </div>
                  {/* Expenses editable */}
                  {item.expenses.map((exp, expIdx) => (
                    <div key={expIdx} className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-sm capitalize text-gray-600">{exp.type.replace(/_/g, ' ').toLowerCase()}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-400">₹</span>
                        <input
                          type="number"
                          min={0}
                          value={exp.amount}
                          onChange={(e) => handleExpenseChange(lineIdx, expIdx, Number(e.target.value))}
                          className="w-28 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-right text-sm font-semibold text-text outline-none focus:border-primary focus:bg-white"
                        />
                      </div>
                    </div>
                  ))}
                  {item.expenses.length === 0 && (
                    <p className="mt-2 text-xs text-gray-400">No expenses on this line.</p>
                  )}
                </div>
              ))}
            </div>

            {/* Revised totals */}
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><CurrencyDisplay amount={editSubtotal} />
              </div>
              <div className="mt-1 flex justify-between text-gray-500">
                <span>GST ({Math.round(editGstRate * 100)}%)</span><CurrencyDisplay amount={editGst} />
              </div>
              <div className="mt-2 flex justify-between border-t pt-2 font-bold">
                <span>Total</span><CurrencyDisplay amount={editTotal} className="text-primary" />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditModalInvoiceId(null)}>Cancel</Button>
              <Button onClick={handleResubmit}>
                Resubmit Invoice <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
