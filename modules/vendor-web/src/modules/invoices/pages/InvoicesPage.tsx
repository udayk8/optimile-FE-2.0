import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHero } from '@shared-ui/page-hero'
import { Card, CardContent } from '@shared-ui/card'
import { Button } from '@shared-ui/button'
import { DataTable } from '@shared-ui/data-table'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate } from '@vendor/utils/date-utils'
import { formatCurrency } from '@vendor/utils/currency-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { CreditCard, Plus, Download, FileText, BookOpen } from 'lucide-react'
import type { Invoice, InvoiceStatus, LedgerEntry } from '@vendor/types'

type InvoiceTab = 'create' | 'list' | 'ledger'

const INVOICE_TABS: InvoiceTab[] = ['create', 'list', 'ledger']

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
  const [selectedTrips, setSelectedTrips] = useState<string[]>([])
  const activeTab = getInvoiceTab(location.pathname, location.search)

  const { trips, invoices, ledger, generateInvoice } = useAppStore()

  const uninvoicedTrips = trips.filter((t) => t.status === 'DELIVERED' && t.podStatus === 'CONFIRMED' && !t.isInvoiced)
  const filteredInvoices = invoices.filter((inv) => statusFilter === 'ALL' || inv.status === statusFilter)

  const tabs: { key: InvoiceTab; label: string; icon: React.ReactNode }[] = [
    { key: 'create', label: 'Create Invoice', icon: <Plus className="h-4 w-4" /> },
    { key: 'list', label: 'My Invoices', icon: <FileText className="h-4 w-4" /> },
    { key: 'ledger', label: 'Ledger', icon: <BookOpen className="h-4 w-4" /> },
  ]

  const handleToggleTrip = (tripId: string) => {
    setSelectedTrips((prev) => 
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId]
    )
  }

  const handleGenerateInvoice = () => {
    generateInvoice(selectedTrips)
    setSelectedTrips([])
    navigate('/vendor/invoices/list')
  }

  const invoiceColumns = [
    {
      key: 'invoice',
      header: 'Invoice',
      render: (invoice: Invoice) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-text">{invoice.invoiceNumber || invoice.id}</span>
          <StatusBadge status={invoice.status} />
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (invoice: Invoice) => formatDate(invoice.invoiceDate),
    },
    {
      key: 'bookings',
      header: 'Bookings',
      align: 'center' as const,
      render: (invoice: Invoice) => invoice.lineItems?.length || 0,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right' as const,
      render: (invoice: Invoice) => <CurrencyDisplay amount={invoice.grandTotal} className="font-semibold text-text" />,
    },
    {
      key: 'paid',
      header: 'Paid',
      render: (invoice: Invoice) => (invoice.paymentDate ? formatDate(invoice.paymentDate) : '—'),
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: () => (
        <Button size="sm" variant="ghost" onClick={() => alert('Downloading Invoice PDF...')} aria-label="Download invoice PDF">
          <Download className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]

  const ledgerColumns = [
    {
      key: 'date',
      header: 'Date',
      render: (entry: LedgerEntry) => formatDate(entry.date),
    },
    {
      key: 'type',
      header: 'Type',
      render: (entry: LedgerEntry) => (
        <StatusBadge
          status={entry.entryType === 'PAYMENT_RECEIVED' || entry.entryType === 'INVOICE_APPROVED' ? 'APPROVED' : 'REJECTED'}
          label={entry.entryType.replace(/_/g, ' ')}
        />
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (entry: LedgerEntry) => entry.description,
    },
    {
      key: 'credit',
      header: 'Credit',
      align: 'right' as const,
      render: (entry: LedgerEntry) => (entry.credit > 0 ? <CurrencyDisplay amount={entry.credit} type="credit" showSign /> : '—'),
    },
    {
      key: 'debit',
      header: 'Debit',
      align: 'right' as const,
      render: (entry: LedgerEntry) => (entry.debit > 0 ? <CurrencyDisplay amount={entry.debit} type="debit" showSign /> : '—'),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right' as const,
      render: (entry: LedgerEntry) => <span className="font-mono font-semibold text-text">{formatCurrency(entry.runningBalance)}</span>,
    },
    {
      key: 'document',
      header: 'Doc',
      align: 'center' as const,
      render: (entry: LedgerEntry) =>
        entry.documentUrl ? (
          <Button size="sm" variant="ghost" onClick={() => alert('Downloading Receipt...')} aria-label="Download receipt">
            <Download className="h-3.5 w-3.5" />
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHero 
        eyebrow="FINANCE"
        title="Invoices" 
        subtitle="Manage your billing, track payments, and create new invoices"
        icon={<CreditCard className="h-5 w-5 text-primary" />}
      />

      <div className="flex w-fit gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => navigate(`/vendor/invoices/${tab.key}`)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Create Invoice */}
      {activeTab === 'create' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Select Uninvoiced Bookings</h3>
          {uninvoicedTrips.length === 0 ? (
            <EmptyState icon={<CreditCard className="h-12 w-12" />} title="No uninvoiced bookings" description="Complete trips with confirmed POD and approved expenses will appear here." />
          ) : (
            <div className="space-y-3">
              {uninvoicedTrips.map((trip) => (
                <Card key={trip.id} className="border-l-4 border-l-success cursor-pointer hover:bg-accent/10" onClick={() => handleToggleTrip(trip.id)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-gray-300" 
                        checked={selectedTrips.includes(trip.id)}
                        readOnly
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{trip.id}</span>
                          <StatusBadge status="DELIVERED" />
                        </div>
                        <p className="text-sm text-gray-500">{trip.laneDetails.origin.city} → {trip.laneDetails.destination.city} · {trip.deliveredDate ? formatDate(trip.deliveredDate) : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Freight + Expenses</div>
                      <CurrencyDisplay amount={trip.freightRate + trip.expenseSummary.approved} className="text-lg font-semibold" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button 
                className="mt-4" 
                disabled={selectedTrips.length === 0} 
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
        <div className="space-y-4">
          <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
            {STATUS_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-2 text-sm font-bold whitespace-nowrap transition-all ${statusFilter === f.value ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <DataTable
            rows={filteredInvoices}
            columns={invoiceColumns}
            getRowKey={(invoice) => invoice.id}
            emptyState={<EmptyState icon={<FileText className="h-12 w-12" />} title="No invoices found" />}
          />
        </div>
      )}

      {/* Ledger */}
      {activeTab === 'ledger' && (
        <DataTable
          rows={ledger}
          columns={ledgerColumns}
          getRowKey={(entry) => entry.id}
          emptyState={<EmptyState icon={<BookOpen className="h-12 w-12" />} title="No ledger entries found" />}
        />
      )}
    </div>
  )
}
