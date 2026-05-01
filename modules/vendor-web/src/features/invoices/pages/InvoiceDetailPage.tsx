import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { PageHero } from '@shared-ui/page-hero'
import { formatDate } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import type { Trip } from '@vendor/types'
import { ArrowLeft, Download, FileText, ReceiptText, Route } from 'lucide-react'

export default function InvoiceDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { invoices, trips } = useAppStore()

  const invoice = useMemo(() => invoices.find((item) => item.id === params.id), [invoices, params.id])

  if (!invoice) {
    return <EmptyState title="Invoice not found" description="The selected invoice is not available in mock data." />
  }

  const linkedTrips = invoice.lineItems.reduce<Trip[]>((acc, line) => {
    const trip = trips.find((item) => item.id === line.tripId || item.id === line.tripReference)
    if (trip) acc.push(trip)
    return acc
  }, [])

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <PageHero
        eyebrow="Invoice Detail"
        title="Invoice detail"
        subtitle="Full invoice drill-down with linked trips, billing summary, and reference information."
        icon={<ReceiptText className="h-5 w-5 text-primary" />}
        action={
          <div className="flex flex-wrap gap-2">
            <span className="font-mono text-sm font-semibold text-text">{invoice.invoiceNumber || invoice.id}</span>
            <StatusBadge status={invoice.status} />
            <Button variant="outline" onClick={() => window.alert(`Mock download for ${invoice.pdfUrl}`)}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" onClick={() => navigate('/vendor/invoices/list')}>
              <ReceiptText className="mr-2 h-4 w-4" /> Back to list
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date</div>
                <div className="mt-1 text-sm font-bold text-text">{formatDate(invoice.invoiceDate)}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total bookings</div>
                <div className="mt-1 text-sm font-bold text-text">{invoice.lineItems.length}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment due</div>
                <div className="mt-1 text-sm font-bold text-text">{formatDate(invoice.paymentDueDate)}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Grand total</div>
                <div className="mt-1 text-sm font-bold text-primary"><CurrencyDisplay amount={invoice.grandTotal} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-primary" /> Linked trips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {linkedTrips.length === 0 ? (
                <EmptyState title="No linked trips" />
              ) : (
                  linkedTrips.map((trip) => (
                  <div key={trip.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{trip.id}</span>
                          {trip.status && <StatusBadge status={trip.status} />}
                          {trip.podStatus && <StatusBadge status={trip.podStatus} />}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/trips/completed/${trip.id}`)}>
                        Open trip
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Subtotal</span>
                <CurrencyDisplay amount={invoice.subtotal} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">GST</span>
                <CurrencyDisplay amount={invoice.gstAmount} />
              </div>
              <div className="flex items-center justify-between border-t pt-3 font-semibold">
                <span>Total</span>
                <CurrencyDisplay amount={invoice.grandTotal} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reference data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><span className="text-gray-500">Vendor GSTIN: </span>{invoice.vendorGstin}</div>
              <div><span className="text-gray-500">Customer GSTIN: </span>{invoice.customerGstin}</div>
              <div><span className="text-gray-500">PDF URL: </span>{invoice.pdfUrl}</div>
              <div><span className="text-gray-500">Status: </span><StatusBadge status={invoice.status} /></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
