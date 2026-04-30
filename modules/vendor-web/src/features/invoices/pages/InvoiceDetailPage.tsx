import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
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
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-semibold">{invoice.invoiceNumber || invoice.id}</span>
                <StatusBadge status={invoice.status} />
              </div>
              <h1 className="mt-2 text-3xl font-semibold">Invoice detail</h1>
              <p className="mt-2 text-muted-foreground">Keep the web billing flow, but add full invoice drill-down and trip linkage.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => window.alert(`Mock download for ${invoice.pdfUrl}`)}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
              <Button variant="outline" onClick={() => navigate('/invoices/list')}>
                <ReceiptText className="mr-2 h-4 w-4" /> Back to list
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Date</div>
                <div className="mt-1 font-medium">{formatDate(invoice.invoiceDate)}</div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Total bookings</div>
                <div className="mt-1 font-medium">{invoice.lineItems.length}</div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Payment due</div>
                <div className="mt-1 font-medium">{formatDate(invoice.paymentDueDate)}</div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Grand total</div>
                <div className="mt-1 font-semibold text-primary"><CurrencyDisplay amount={invoice.grandTotal} /></div>
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
                  <div key={trip.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{trip.id}</span>
                          {trip.status && <StatusBadge status={trip.status} />}
                          {trip.podStatus && <StatusBadge status={trip.podStatus} />}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/trips/completed/${trip.id}`)}>
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
                <span className="text-muted-foreground">Subtotal</span>
                <CurrencyDisplay amount={invoice.subtotal} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">GST</span>
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
              <div><span className="text-muted-foreground">Vendor GSTIN: </span>{invoice.vendorGstin}</div>
              <div><span className="text-muted-foreground">Customer GSTIN: </span>{invoice.customerGstin}</div>
              <div><span className="text-muted-foreground">PDF URL: </span>{invoice.pdfUrl}</div>
              <div><span className="text-muted-foreground">Status: </span><StatusBadge status={invoice.status} /></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
