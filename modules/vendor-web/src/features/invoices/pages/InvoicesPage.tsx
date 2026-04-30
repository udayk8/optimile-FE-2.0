import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Card, CardContent } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate } from '@vendor/lib/date-utils'
import { formatCurrency } from '@vendor/lib/currency-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { CreditCard, Plus, Download, FileText, BookOpen } from 'lucide-react'
import type { InvoiceStatus } from '@vendor/types'

type InvoiceTab = 'create' | 'list' | 'ledger'

const INVOICE_TABS: InvoiceTab[] = ['create', 'list', 'ledger']

function getInvoiceTab(pathname: string, search: string): InvoiceTab {
  const pathTab = pathname.split('/')[2]
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
    navigate('/invoices/list')
  }

  return (
    <div>
      <HeroCard 
        eyebrow="FINANCE"
        title="Invoices" 
        subtitle="Manage your billing, track payments, and create new invoices"
        icon={<CreditCard className="h-5 w-5 text-[#2563EB]" />}
      />

      <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6 w-fit">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => navigate(`/invoices/${tab.key}`)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
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
                <Card key={trip.id} className="border-l-4 border-l-emerald-500 cursor-pointer hover:bg-accent/10" onClick={() => handleToggleTrip(trip.id)}>
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
                        <p className="text-sm text-muted-foreground">{trip.laneDetails.origin.city} → {trip.laneDetails.destination.city} · {trip.deliveredDate ? formatDate(trip.deliveredDate) : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Freight + Expenses</div>
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
        <div>
          <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4 overflow-x-auto">
            {STATUS_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${statusFilter === f.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            {filteredInvoices.length === 0 ? (
              <EmptyState icon={<FileText className="h-12 w-12" />} title="No invoices found" />
            ) : (
              filteredInvoices.map((inv) => (
                <Card key={inv.id} className="cursor-pointer hover:border-primary/30" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{inv.invoiceNumber || inv.id}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); window.alert('Downloading Invoice PDF...') }}><Download className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Date: </span>{formatDate(inv.invoiceDate)}</div>
                      <div><span className="text-muted-foreground">Bookings: </span>{inv.lineItems?.length || 0}</div>
                      <div><span className="text-muted-foreground">Total: </span><CurrencyDisplay amount={inv.grandTotal} className="font-semibold" /></div>
                      {inv.paymentDate && <div><span className="text-muted-foreground">Paid: </span>{formatDate(inv.paymentDate)}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Ledger */}
      {activeTab === 'ledger' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-right p-3 font-medium">Credit</th>
                <th className="text-right p-3 font-medium">Debit</th>
                <th className="text-right p-3 font-medium">Balance</th>
                <th className="text-center p-3 font-medium">Doc</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id} className="border-b hover:bg-accent/50">
                  <td className="p-3">{formatDate(entry.date)}</td>
                  <td className="p-3"><StatusBadge status={entry.entryType === 'PAYMENT_RECEIVED' || entry.entryType === 'INVOICE_APPROVED' ? 'APPROVED' : 'REJECTED'} label={entry.entryType.replace(/_/g, ' ')} /></td>
                  <td className="p-3">{entry.description}</td>
                  <td className="p-3 text-right">{entry.credit > 0 ? <CurrencyDisplay amount={entry.credit} type="credit" showSign /> : '—'}</td>
                  <td className="p-3 text-right">{entry.debit > 0 ? <CurrencyDisplay amount={entry.debit} type="debit" showSign /> : '—'}</td>
                  <td className="p-3 text-right font-mono font-medium">{formatCurrency(entry.runningBalance)}</td>
                  <td className="p-3 text-center">{entry.documentUrl && <Button size="sm" variant="ghost" onClick={() => window.alert('Downloading Receipt...')}><Download className="h-3.5 w-3.5" /></Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
