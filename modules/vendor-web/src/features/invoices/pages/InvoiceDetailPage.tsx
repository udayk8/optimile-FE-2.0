import { useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useModuleNavigate as useNavigate } from '@vendor/hooks/useModuleRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { InvoicePdfDocument } from '@vendor/components/shared/InvoicePdfDocument'
import { PageHero } from '@shared-ui/page-hero'
import { formatDate } from '@vendor/lib/date-utils'
import { downloadElementAsPdf } from '@vendor/lib/pdf'
import { useTenantBridge } from '@vendor/integration/tenant-data-bridge'
import { useVendorBookings } from '@vendor/integration/useVendorBookings'
import { useVendorInvoices } from '@vendor/integration/useVendorInvoices'
import { useVendorInvoiceProfile } from '@vendor/integration/useVendorInvoiceProfile'
import { ArrowLeft, Download, FileText, MessageSquareWarning, ReceiptText, Route } from 'lucide-react'

// Customer block for the printable invoice (the tenant the vendor bills).
const CUSTOMER_ADDRESS =
  '161, Basavanagar Main Rd, above Reliance Trends, Vignan Nagar, Doddanekkundi Road, Bengaluru, Karnataka – 560037'

export default function InvoiceDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const bridge = useTenantBridge()
  const { invoices, disputes } = useVendorInvoices()
  // Merged bookings (bridge + mock) so PDF line items resolve truck/lane/dates
  // for cross-module bookings too.
  const { trips, getBookingDetail } = useVendorBookings()
  const pdfRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const invoice = useMemo(() => invoices.find((item) => item.id === params.id), [invoices, params.id])
  const dispute = useMemo(() => (invoice ? disputes.find((item) => item.invoiceId === invoice.id) : undefined), [disputes, invoice])

  if (!invoice) {
    return <EmptyState title="Invoice not found" description="The selected invoice is not available in mock data." />
  }

  const linkedBookings = invoice.lineItems.reduce<typeof trips>((acc, line) => {
    const booking = trips.find((item) => item.id === line.tripId || item.id === line.tripReference)
    if (booking) acc.push(booking)
    return acc
  }, [])

  const disputeThreadPreview = [...(dispute?.messages ?? [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(-2)

  const supersededBy = invoice.supersededByInvoiceId ? invoices.find((item) => item.id === invoice.supersededByInvoiceId) : undefined
  const supersedes = invoice.supersedesInvoiceId ? invoices.find((item) => item.id === invoice.supersedesInvoiceId) : undefined

  const invoiceProfile = useVendorInvoiceProfile()
  const customerName = bridge?.tenantName ?? 'Optimile Pvt Ltd'
  const getLrNumber = (tripId: string) => getBookingDetail(tripId)?.lrNumbers?.[0] ?? null

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadElementAsPdf(pdfRef.current, `${invoice.invoiceNumber || invoice.id}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

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
        subtitle="Full invoice drill-down with linked bookings, billing summary, and finance workflow context."
        icon={<ReceiptText className="h-5 w-5 text-primary" />}
        action={
          <div className="flex flex-wrap gap-2">
            <span className="font-mono text-sm font-semibold text-text">{invoice.invoiceNumber || invoice.id}</span>
            <StatusBadge status={invoice.status} />
            <Button variant="outline" onClick={handleDownload} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" /> {downloading ? 'Preparing…' : 'Download PDF'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/vendor/invoices')}>
              <ReceiptText className="mr-2 h-4 w-4" /> Back to list
            </Button>
          </div>
        }
      />

      {invoice.status === 'CLOSED' ? (
        <Card className="border-gray-300 bg-gray-50">
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <StatusBadge status="CLOSED" />
              {invoice.closeReason === 'REJECTED' ? 'Rejected by finance' : 'Superseded by a new invoice'}
            </div>
            {invoice.closeReason === 'REJECTED' ? (
              <p className="text-sm text-gray-600">{invoice.notes || 'Finance rejected this invoice. Create a fresh invoice from eligible bookings if needed.'}</p>
            ) : supersededBy ? (
              <p className="text-sm text-gray-600">
                Replaced by{' '}
                <button className="font-semibold text-primary hover:underline" onClick={() => navigate(`/vendor/invoices/${supersededBy.id}`)}>
                  {supersededBy.invoiceNumber}
                </button>
                .
              </p>
            ) : (
              <p className="text-sm text-gray-600">This invoice was superseded by a corrected resubmission.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {invoice.status === 'RESUBMISSION_REQUIRED' ? (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-orange-700">Finance requires a corrected invoice. Create a new invoice to replace this one — it will be closed as superseded.</p>
            <Button onClick={() => navigate('/vendor/invoices?tab=resubmission')}>Create New Invoice</Button>
          </CardContent>
        </Card>
      ) : null}

      {supersedes ? (
        <p className="text-sm text-gray-500">
          This invoice replaces{' '}
          <button className="font-semibold text-primary hover:underline" onClick={() => navigate(`/vendor/invoices/${supersedes.id}`)}>
            {supersedes.invoiceNumber}
          </button>
          .
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date</div>
                <div className="mt-1 text-sm font-bold text-text">{formatDate(invoice.invoiceDate)}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total bookings</div>
                <div className="mt-1 text-sm font-bold text-text">{invoice.lineItems.length}</div>
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
                <Route className="h-5 w-5 text-primary" /> Linked bookings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {linkedBookings.length === 0 ? (
                <EmptyState title="No linked bookings" />
              ) : (
                linkedBookings.map((booking) => (
                  <div key={booking.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{booking.id}</span>
                          {booking.status ? <StatusBadge status={booking.status} /> : null}
                          {booking.podStatus ? <StatusBadge status={booking.podStatus} /> : null}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {booking.laneDetails.origin.city} → {booking.laneDetails.destination.city}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/completed/${booking.id}`)}>
                        Open booking
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

      {/* Off-screen render of the printable invoice — captured for the PDF download. */}
      <div aria-hidden style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
        <InvoicePdfDocument
          ref={pdfRef}
          invoice={invoice}
          trips={trips}
          companyName={invoiceProfile.companyName}
          companyInfo={invoiceProfile.companyInfo}
          bank={invoiceProfile.bank}
          terms={invoiceProfile.terms}
          logoUrl={invoiceProfile.logoUrl}
          customerName={customerName}
          customerAddress={CUSTOMER_ADDRESS}
          getLrNumber={getLrNumber}
        />
      </div>

      {dispute ? (
        <Card className="border-rose-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <MessageSquareWarning className="h-5 w-5" /> Dispute Workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary">{dispute.id}</span>
              <StatusBadge status={dispute.status} />
              {dispute.responseDueAt ? <span className="text-xs text-gray-400">SLA due {formatDate(dispute.responseDueAt)}</span> : null}
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Finance reason</p>
              <p className="mt-1 text-sm text-gray-700">{dispute.reason}</p>
            </div>
            {disputeThreadPreview.length > 0 ? (
              <div className="space-y-3">
                {disputeThreadPreview.map((message) => (
                  <div key={message.id} className="rounded-xl border border-gray-100 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        {message.sender === 'VENDOR' ? 'Vendor' : 'Finance'}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(message.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{message.message}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate(`/vendor/disputes/${dispute.id}`)}>
                Open Response Thread
              </Button>
              {invoice.status === 'RESUBMISSION_REQUIRED' ? (
                <Button variant="outline" onClick={() => navigate('/vendor/invoices?tab=resubmission')}>
                  Go To Resubmission
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
