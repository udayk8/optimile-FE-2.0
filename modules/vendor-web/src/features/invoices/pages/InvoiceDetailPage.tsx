import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@vendor/hooks/useModuleRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { PageHero } from '@shared-ui/page-hero'
import { formatDate } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { ArrowLeft, Download, FileText, ReceiptText, Route, MessageSquareWarning, CheckCircle2, ArrowRight, X } from 'lucide-react'

const DISPUTE_CHIP: Record<string, string> = {
  OPEN: 'bg-rose-50 text-rose-700 border border-rose-100',
  IN_REVIEW: 'bg-amber-50 text-amber-700 border border-amber-100',
  ACCEPTED: 'bg-green-50 text-green-700 border border-green-100',
  CANCELLED: 'bg-gray-100 text-gray-600 border border-gray-200',
  CLOSED: 'bg-gray-100 text-gray-600 border border-gray-200',
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const invoices = useAppStore((state) => state.invoices)
  const trips = useAppStore((state) => state.trips)
  const disputes = useAppStore((state) => state.disputes)
  const raiseDispute = useAppStore((state) => state.raiseDispute)

  const invoice = useMemo(() => invoices.find((item) => item.id === params.id), [invoices, params.id])
  const dispute = useMemo(
    () => (invoice ? disputes.find((d) => d.invoiceId === invoice.id) : undefined),
    [disputes, invoice],
  )

  const [raiseModal, setRaiseModal] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  if (!invoice) {
    return <EmptyState title="Invoice not found" description="The selected invoice is not available in mock data." />
  }

  const linkedBookings = invoice.lineItems.reduce<typeof trips>((acc, line) => {
    const booking = trips.find((item) => item.id === line.tripId || item.id === line.tripReference)
    if (booking) acc.push(booking)
    return acc
  }, [])

  const handleRaise = () => {
    if (!reason.trim()) { setReasonError('Reason is required'); return }
    raiseDispute(invoice.id, invoice.invoiceNumber, invoice.grandTotal, reason.trim())
    setRaiseModal(false)
    setReason('')
    setReasonError('')
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
        subtitle="Full invoice drill-down with linked bookings, billing summary, and reference information."
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
                          {booking.status && <StatusBadge status={booking.status} />}
                          {booking.podStatus && <StatusBadge status={booking.podStatus} />}
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

      {/* Dispute section */}
      {(invoice.status === 'REJECTED' || invoice.status === 'CANCELLED') && (
        <Card className="border-rose-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <MessageSquareWarning className="h-5 w-5" /> Dispute
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* No dispute yet — offer to raise one */}
            {!dispute && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">Contest this rejection</p>
                  <p className="mt-1 text-sm text-gray-500">
                    If you believe this rejection is incorrect, raise a formal dispute for admin review.
                  </p>
                </div>
                <Button className="shrink-0" onClick={() => setRaiseModal(true)}>
                  <MessageSquareWarning className="mr-2 h-4 w-4" />
                  Raise Dispute
                </Button>
              </div>
            )}

            {/* Dispute exists and not yet closed */}
            {dispute && dispute.status !== 'CLOSED' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">{dispute.id}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${DISPUTE_CHIP[dispute.status]}`}>
                    {dispute.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">· Raised {formatDate(dispute.raisedAt)}</span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Your reason</p>
                  <p className="mt-1 text-sm text-gray-700">"{dispute.reason}"</p>
                </div>
                {dispute.status === 'CANCELLED' && dispute.notes && (
                  <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Admin response</p>
                    <p className="mt-1 text-sm text-orange-800">{dispute.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Dispute closed after resubmit */}
            {dispute && dispute.status === 'CLOSED' && (
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">
                <CheckCircle2 className="h-4 w-4" />
                Dispute closed — invoice resubmitted for review.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Raise Dispute Modal */}
      {raiseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text">Raise Dispute</h3>
              <button onClick={() => setRaiseModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Invoice</div>
              <div className="mt-1 font-mono font-bold text-text">{invoice.invoiceNumber}</div>
              <div className="mt-1 text-gray-500">
                Amount: <CurrencyDisplay amount={invoice.grandTotal} className="font-semibold text-text" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <label className="text-sm font-semibold text-text">Reason for dispute</label>
              <textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value); setReasonError('') }}
                placeholder="Describe why you are contesting this rejection..."
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
              />
              {reasonError && <p className="text-xs font-semibold text-rose-600">{reasonError}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRaiseModal(false)}>Cancel</Button>
              <Button onClick={handleRaise}>
                Submit Dispute
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
