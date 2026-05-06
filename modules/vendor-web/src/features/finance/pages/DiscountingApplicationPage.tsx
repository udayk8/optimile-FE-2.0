import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ChevronLeft, Clock, FileText, ShieldCheck, Star } from 'lucide-react'
import { Button } from '@vendor/components/ui/button'
import { useAppStore } from '@vendor/stores/app.store'
import type { Invoice, NBFCDiscountingStatus } from '@vendor/types'

const PARTNERS = [
  { id: 'nbfc-1', name: 'FinEdge Capital', advancePercentage: 85, interestRate: 12.5, processingTime: '24 hours', rating: 4.9 },
  { id: 'nbfc-2', name: 'Prime Credit', advancePercentage: 82, interestRate: 13.2, processingTime: '36 hours', rating: 4.8 },
  { id: 'nbfc-3', name: 'Axis Finance', advancePercentage: 80, interestRate: 11.9, processingTime: '48 hours', rating: 4.7 },
]

const FALLBACK_INVOICES: Record<string, Invoice> = {
  'INV-2408-018': {
    id: 'INV-2408-018',
    invoiceNumber: 'INV-2408-018',
    invoiceDate: '2026-04-18T00:00:00Z',
    vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM',
    billingPeriod: { from: '2026-04-01', to: '2026-04-18' },
    paymentDueDate: '2026-05-18T00:00:00Z',
    lineItems: [],
    subtotal: 116440,
    gstAmount: 25560,
    grandTotal: 142000,
    status: 'SUBMITTED',
    pdfUrl: '/invoices/INV-2408-018.pdf',
    tripReferences: ['TRP-041', 'TRP-042'],
    createdAt: '2026-04-18T00:00:00Z',
  },
  'INV-2407-114': {
    id: 'INV-2407-114',
    invoiceNumber: 'INV-2407-114',
    invoiceDate: '2026-04-14T00:00:00Z',
    vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM',
    billingPeriod: { from: '2026-04-01', to: '2026-04-14' },
    paymentDueDate: '2026-05-14T00:00:00Z',
    lineItems: [],
    subtotal: 80852,
    gstAmount: 17748,
    grandTotal: 98600,
    status: 'APPROVED',
    pdfUrl: '/invoices/INV-2407-114.pdf',
    tripReferences: ['TRP-043'],
    createdAt: '2026-04-14T00:00:00Z',
  },
  'INV-2407-099': {
    id: 'INV-2407-099',
    invoiceNumber: 'INV-2407-099',
    invoiceDate: '2026-04-09T00:00:00Z',
    vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM',
    billingPeriod: { from: '2026-04-01', to: '2026-04-09' },
    paymentDueDate: '2026-05-09T00:00:00Z',
    lineItems: [],
    subtotal: 170560,
    gstAmount: 37440,
    grandTotal: 208000,
    status: 'PAID',
    pdfUrl: '/invoices/INV-2407-099.pdf',
    tripReferences: ['TRP-046'],
    createdAt: '2026-04-09T00:00:00Z',
  },
}

export default function DiscountingApplicationPage() {
  const navigate = useNavigate()
  const { invoiceId, nbfcId } = useParams()
  const { invoices, nbfcApplications, markNbfcApplicationStatus, submitNbfcApplication } = useAppStore()
  const [agreed, setAgreed] = useState(false)

  const invoice = useMemo(() => {
    return invoices.find((item) => item.id === invoiceId) ?? (invoiceId ? FALLBACK_INVOICES[invoiceId as keyof typeof FALLBACK_INVOICES] : undefined)
  }, [invoiceId, invoices])

  const application = useMemo(
    () => nbfcApplications.find((item) => item.invoiceId === invoiceId),
    [invoiceId, nbfcApplications],
  )

  const partner = useMemo(
    () => PARTNERS.find((item) => item.id === (application?.partnerId ?? nbfcId)),
    [application?.partnerId, nbfcId],
  )

  const isViewMode = nbfcId === 'view'
  const mode: NBFCDiscountingStatus = application?.status ?? 'ELIGIBLE'

  const amount = invoice?.grandTotal ?? 0
  const advanceAmount = application?.advanceAmount ?? (partner ? Math.round((amount * partner.advancePercentage) / 100) : 0)
  const charges = application?.charges ?? (partner ? Math.round((advanceAmount * partner.interestRate) / 1200) : 0)
  const netDisbursement = application?.netDisbursement ?? advanceAmount - charges

  if (!invoice || !partner) {
    return <div className="p-6 text-sm text-gray-500">Loading application details...</div>
  }

  const timeline = [
    { label: 'Eligible', done: true, detail: 'Invoice approved and ready for discounting' },
    { label: 'Submitted', done: ['SUBMITTED', 'APPROVED', 'DISBURSED'].includes(mode), detail: application?.appliedAt ?? 'Waiting for submission' },
    { label: 'Approved', done: ['APPROVED', 'DISBURSED'].includes(mode), detail: application?.approvedAt ?? 'Waiting for approval' },
    { label: 'Disbursed', done: mode === 'DISBURSED', detail: application?.disbursedAt ?? 'Waiting for disbursement' },
  ]
  const primaryActionLabel = mode === 'SUBMITTED' ? 'Mark Approved' : mode === 'APPROVED' ? 'Mark Disbursed' : mode === 'DISBURSED' ? 'Disbursed' : 'Submit Application'

  const handleSubmitApplication = () => {
    submitNbfcApplication({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber ?? invoice.id,
      customerName: (invoice as any).clientName ?? invoice.id,
      partnerId: partner.id,
      partnerName: partner.name,
      advanceAmount,
      charges,
      netDisbursement,
    })
    navigate('/vendor/nbfc')
  }

  const handleAdvanceStatus = () => {
    if (mode === 'SUBMITTED') {
      markNbfcApplicationStatus(invoice.id, 'APPROVED')
    } else if (mode === 'APPROVED') {
      markNbfcApplicationStatus(invoice.id, 'DISBURSED')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Bill Discounting</div>
              <h1 className="text-2xl font-semibold text-text">
                {mode === 'ELIGIBLE' ? 'Apply for Discounting' : 'Application Details'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Invoice {invoice.id} with {partner.name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {mode === 'SUBMITTED' || mode === 'APPROVED' ? (
              <Button onClick={handleAdvanceStatus}>
                {primaryActionLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : mode === 'DISBURSED' ? (
              <Button variant="outline" disabled>
                {primaryActionLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Advance amount</div>
          <div className="mt-2 text-2xl font-semibold text-text">₹{advanceAmount.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Charges</div>
          <div className="mt-2 text-2xl font-semibold text-text">₹{charges.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Net disbursement</div>
          <div className="mt-2 text-2xl font-semibold text-text">₹{netDisbursement.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Processing</div>
          <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-text">
            <Clock className="h-5 w-5 text-primary" />
            {partner.processingTime}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Invoice summary</h3>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">IRN Verified</span>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Client</div>
            <div className="mt-1 font-semibold text-text">{(invoice as any).clientName ?? 'Vendor Invoice'}</div>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Invoice Amount</div>
            <div className="mt-1 font-semibold text-text">₹{amount.toLocaleString('en-IN')}</div>
          </div>
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            This is the vendor-side application screen. No NBFC portal is required.
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-900 p-6 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Status preview</h3>
              <p className="text-sm text-gray-300">Used to update the lifecycle inside vendor-web.</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Partner</span>
              <span className="font-semibold">{partner.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Advance rate</span>
              <span className="font-semibold text-emerald-400">{partner.advancePercentage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Interest</span>
              <span className="font-semibold">{partner.interestRate}% p.a.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Reference</span>
              <span className="font-semibold">{application?.referenceNumber ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className="font-semibold uppercase">{mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Net disbursement</span>
              <span className="font-semibold">₹{netDisbursement.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4 text-xs text-gray-300">
            Funds will be credited to the registered bank account ending in ****4421.
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-text">Bill Discounting Details</h3>
          <div className="mt-4 space-y-4">
            {timeline.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full ${item.done ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-text">Required documents</h3>
          <div className="mt-4 space-y-3">
            {[
              'PAN Card',
              'E-Invoice / IRN',
              'Signed Invoice Copy',
              'POD (Proof of Delivery)',
            ].map((doc) => (
              <div key={doc} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-text">{doc}</span>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  AUTO-ATTACHED
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Partner details</h3>
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm font-semibold text-text">{partner.rating}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-400">Advance</div>
              <div className="mt-1 font-semibold text-text">Up to {partner.advancePercentage}%</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-400">Processing</div>
              <div className="mt-1 font-semibold text-text">{partner.processingTime}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-400">Rating</div>
              <div className="mt-1 font-semibold text-text">{partner.rating}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            {mode === 'ELIGIBLE' && !isViewMode
              ? 'Submit now to move the invoice to Submitted status. You can later simulate approval and disbursal from this page.'
              : mode === 'SUBMITTED'
                ? 'This application is submitted. Use the mock action to mark it Approved.'
                : mode === 'APPROVED'
                  ? 'This application is approved. Use the mock action to mark it Disbursed.'
                  : 'This application has completed the lifecycle and is read-only.'}
          </div>
        </div>
      </div>

      {mode === 'ELIGIBLE' && !isViewMode ? (
        <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">
            I agree to the terms of bill discounting and authorize {partner.name} to recover the invoice amount from the client.
          </span>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text">Vendor-side control</h3>
              <p className="text-sm text-gray-500">
                There is no external NBFC portal in this setup, so status changes happen here.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate(mode === 'ELIGIBLE' && !isViewMode ? `/vendor/nbfc/apply/${invoiceId}/select-partner` : '/vendor/nbfc')}>
          Back
        </Button>
        {mode === 'ELIGIBLE' && !isViewMode ? (
          <Button disabled={!agreed} onClick={handleSubmitApplication}>
            Submit Application
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : mode === 'SUBMITTED' || mode === 'APPROVED' ? (
          <Button onClick={handleAdvanceStatus}>
            {mode === 'SUBMITTED' ? 'Mark Approved' : 'Mark Disbursed'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" disabled>
            Disbursed
          </Button>
        )}
      </div>
    </div>
  )
}
