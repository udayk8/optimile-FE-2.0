import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Card, CardContent } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { CreditCard, Plus, Download, FileText } from 'lucide-react'
import type { InvoiceStatus } from '@vendor/types'

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
  { value: 'PAID', label: 'Paid' },
]

export default function InvoicesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL')
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [invoicePage, setInvoicePage] = useState(1)
  const activeTab = getInvoiceTab(location.pathname, location.search)

  const { trips, invoices, generateInvoice } = useAppStore()

  const uninvoicedBookings = trips.filter((t) => t.status === 'DELIVERED' && t.podStatus === 'CONFIRMED' && !t.isInvoiced)
  const filteredInvoices = invoices.filter((inv) => statusFilter === 'ALL' || inv.status === statusFilter)
  const invoicePageSize = 5
  const invoiceTotalPages = Math.max(1, Math.ceil(filteredInvoices.length / invoicePageSize))
  const pagedInvoices = filteredInvoices.slice((Math.min(invoicePage, invoiceTotalPages) - 1) * invoicePageSize, Math.min(invoicePage, invoiceTotalPages) * invoicePageSize)

  const tabs: { key: InvoiceTab; label: string; icon: React.ReactNode }[] = [
    { key: 'create', label: 'Create Invoice', icon: <Plus className="h-4 w-4" /> },
    { key: 'list', label: 'My Invoices', icon: <FileText className="h-4 w-4" /> },
  ]

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
                <Card key={booking.id} className="border-l-4 border-l-emerald-500 cursor-pointer hover:bg-accent/10" onClick={() => handleToggleBooking(booking.id)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-gray-300" 
                        checked={selectedBookings.includes(booking.id)}
                        readOnly
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{booking.id}</span>
                          <StatusBadge status="DELIVERED" />
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
              <Button 
                className="mt-4" 
                disabled={selectedBookings.length === 0} 
                onClick={handleGenerateInvoice}
              >
                <Plus className="h-4 w-4 mr-1" /> Generate Invoice
              </Button>
            </div>
          )}
        </div>
      )}

      {/* My Invoices */}
      {activeTab === 'list' && (
        <div>
          <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
            {STATUS_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${statusFilter === f.value ? 'bg-white text-text shadow-sm' : 'text-gray-600 hover:text-primary'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            {filteredInvoices.length === 0 ? (
              <div className="p-8"><EmptyState icon={<FileText className="h-12 w-12" />} title="No invoices found" /></div>
            ) : (
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Invoice Number</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Date</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Bookings</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Paid Date</th>
                    <th className="p-4 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Total Amount</th>
                    <th className="p-4 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pagedInvoices.map((inv) => (
                    <tr key={inv.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/vendor/invoices/${inv.id}`)}>
                      <td className="p-4 font-mono font-semibold">{inv.invoiceNumber || inv.id}</td>
                      <td className="p-4">{formatDate(inv.invoiceDate)}</td>
                      <td className="p-4"><StatusBadge status={inv.status} /></td>
                      <td className="p-4">{inv.lineItems?.length || 0}</td>
                      <td className="p-4">{inv.paymentDate ? formatDate(inv.paymentDate) : '—'}</td>
                      <td className="p-4 text-right"><CurrencyDisplay amount={inv.grandTotal} className="font-semibold" /></td>
                      <td className="p-4 text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); window.alert('Downloading Invoice PDF...') }}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {filteredInvoices.length > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
              <span>Showing {(Math.min(invoicePage, invoiceTotalPages) - 1) * invoicePageSize + 1}-{Math.min(Math.min(invoicePage, invoiceTotalPages) * invoicePageSize, filteredInvoices.length)} of {filteredInvoices.length}</span>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-text disabled:opacity-50" disabled={Math.min(invoicePage, invoiceTotalPages) === 1} onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}>Previous</button>
                <span className="rounded-lg bg-gray-50 px-3 py-1.5 font-semibold text-text">Page {Math.min(invoicePage, invoiceTotalPages)} of {invoiceTotalPages}</span>
                <button className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-text disabled:opacity-50" disabled={Math.min(invoicePage, invoiceTotalPages) === invoiceTotalPages} onClick={() => setInvoicePage((p) => Math.min(invoiceTotalPages, p + 1))}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
