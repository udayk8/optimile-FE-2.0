import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ChevronLeft, Clock, Mail, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@vendor/components/ui/button'
import { useAppStore } from '@vendor/stores/app.store'
import type { Invoice, NBFCDiscountingStatus } from '@vendor/types'

const PARTNERS = [
  { id: 'nbfc-1', name: 'FinEdge Capital', advancePercentage: 85, interestRate: 12.5, processingTime: '24 hours', rating: 4.9 },
  { id: 'nbfc-2', name: 'Prime Credit', advancePercentage: 82, interestRate: 13.2, processingTime: '36 hours', rating: 4.8 },
  { id: 'nbfc-3', name: 'Axis Finance', advancePercentage: 80, interestRate: 11.9, processingTime: '48 hours', rating: 4.7 },
  { id: 'nbfc-4', name: 'Tata Capital', advancePercentage: 83, interestRate: 12.1, processingTime: '30 hours', rating: 4.6 },
  { id: 'nbfc-5', name: 'Aditya Birla Finance', advancePercentage: 81, interestRate: 12.8, processingTime: '42 hours', rating: 4.5 },
  { id: 'nbfc-6', name: 'SMFG India', advancePercentage: 79, interestRate: 13.0, processingTime: '48 hours', rating: 4.4 },
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

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} px-4 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:bg-white`
}

export default function DiscountingApplicationPage() {
  const navigate = useNavigate()
  const { invoiceId, nbfcId } = useParams()
  const { invoices, nbfcApplications, markNbfcApplicationStatus, submitNbfcApplication } = useAppStore()

  // email form state
  const [emailTitle, setEmailTitle] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [description, setDescription] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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

  const isEligibleMode = mode === 'ELIGIBLE' && !isViewMode

  // validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)
  const canSubmit = agreed && emailTitle.trim().length > 0 && emailValid && description.trim().length > 0 && uploadedFile !== null

  const showTitleError = submitted && emailTitle.trim().length === 0
  const showEmailError = submitted && !emailValid
  const showDescError = submitted && description.trim().length === 0
  const showFileError = submitted && uploadedFile === null

  const handleSubmitApplication = () => {
    setSubmitted(true)
    if (!canSubmit) return

    submitNbfcApplication({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber ?? invoice.id,
      customerName: (invoice as any).clientName ?? invoice.id,
      partnerId: partner.id,
      partnerName: partner.name,
      advanceAmount,
      charges,
      netDisbursement,
      emailTitle,
      recipientEmail,
      emailDescription: description,
      invoiceFileName: uploadedFile?.name,
    })

    toast.success(`Application submitted — email sent to ${recipientEmail}`, {
      description: `"${emailTitle}" has been delivered to ${partner.name}.`,
    })

    navigate('/vendor/nbfc')
  }

  const handleAdvanceStatus = () => {
    if (mode === 'SUBMITTED') {
      markNbfcApplicationStatus(invoice.id, 'DISBURSED')
      toast.success('Status updated to Disbursed')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Bill Discounting</div>
              <h1 className="text-2xl font-semibold text-text">
                {isEligibleMode ? 'Apply for Discounting' : 'Application Details'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Invoice {invoice.id} · {partner.name}
              </p>
            </div>
          </div>

          {mode === 'SUBMITTED' && (
            <Button onClick={handleAdvanceStatus}>
              Mark Disbursed
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {mode === 'DISBURSED' && (
            <Button variant="outline" disabled>Disbursed</Button>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Invoice amount</div>
          <div className="mt-2 text-2xl font-semibold text-text">₹{amount.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Advance amount</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600">₹{advanceAmount.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Charges</div>
          <div className="mt-2 text-2xl font-semibold text-red-500">₹{charges.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Net disbursement</div>
          <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-blue-600">
            ₹{netDisbursement.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Email application form (ELIGIBLE mode only) */}
      {isEligibleMode && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text">Submit application</h3>
              <p className="text-sm text-gray-500">
                Fill in the details below. An email will be sent to {partner.name} on your behalf.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Prefilled summary */}
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Application summary (auto-filled)</p>
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-gray-500">Invoice</span>
                  <p className="mt-0.5 font-mono font-semibold text-text">{invoice.id}</p>
                </div>
                <div>
                  <span className="text-gray-500">Invoice amount</span>
                  <p className="mt-0.5 font-semibold text-text">₹{amount.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-gray-500">Advance ({partner.advancePercentage}%)</span>
                  <p className="mt-0.5 font-semibold text-emerald-600">₹{advanceAmount.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-gray-500">Charges ({partner.interestRate}% p.a.)</span>
                  <p className="mt-0.5 font-semibold text-red-500">₹{charges.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-gray-500">Net disbursement</span>
                  <p className="mt-0.5 font-semibold text-blue-600">₹{netDisbursement.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-gray-500">Partner</span>
                  <p className="mt-0.5 font-semibold text-text">{partner.name}</p>
                </div>
              </div>
            </div>

            {/* Email title */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text">
                Email title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={emailTitle}
                onChange={(e) => setEmailTitle(e.target.value)}
                placeholder={`Bill Discounting Request – Invoice ${invoice.id}`}
                className={inputClass(showTitleError)}
              />
              {showTitleError && <p className="text-xs text-red-500">Email title is required.</p>}
            </div>

            {/* Recipient email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text">
                Recipient email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="partner@nbfc.com"
                className={inputClass(showEmailError)}
              />
              {showEmailError && <p className="text-xs text-red-500">Enter a valid email address.</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder={`We are submitting invoice ${invoice.id} for bill discounting. Please review the attached documents and proceed with the advance disbursement at your earliest convenience.`}
                className={`${inputClass(showDescError)} resize-none`}
              />
              {showDescError && <p className="text-xs text-red-500">Description is required.</p>}
            </div>

            {/* Invoice upload */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text">
                Attach invoice <span className="text-red-500">*</span>
              </label>
              {uploadedFile ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Paperclip className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="font-semibold text-emerald-700 truncate max-w-xs">{uploadedFile.name}</span>
                    <span className="text-xs text-emerald-500">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedFile(null)}
                    className="ml-2 rounded-full p-1 text-emerald-600 hover:bg-emerald-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition hover:bg-gray-50 ${showFileError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                  <Paperclip className={`h-6 w-6 ${showFileError ? 'text-red-400' : 'text-gray-400'}`} />
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                  </div>
                  <p className="text-xs text-gray-400">PDF, PNG, JPG up to 10 MB</p>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      setUploadedFile(file)
                    }}
                  />
                </label>
              )}
              {showFileError && <p className="text-xs text-red-500">Please attach the invoice before submitting.</p>}
            </div>

            {/* Agreement */}
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary"
              />
              <span>
                I agree to the terms of bill discounting and authorise <strong>{partner.name}</strong> to recover the invoice amount from the client upon disbursement.
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Submitted / Disbursed info */}
      {!isEligibleMode && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text">
                {mode === 'SUBMITTED' ? 'Application submitted' : 'Application disbursed'}
              </h3>
              <p className="text-sm text-gray-500">
                {mode === 'SUBMITTED'
                  ? 'Your application is under review. Use the button above to mark it disbursed once confirmed.'
                  : 'This application has completed the lifecycle and is read-only.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(isEligibleMode ? `/vendor/nbfc/apply/${invoiceId}/select-partner` : '/vendor/nbfc')}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {isEligibleMode ? 'Back to partners' : 'Back to hub'}
        </Button>

        {isEligibleMode && (
          <Button onClick={handleSubmitApplication}>
            Submit & send email
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {mode === 'SUBMITTED' && (
          <Button onClick={handleAdvanceStatus}>
            Mark Disbursed
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {mode === 'DISBURSED' && (
          <Button variant="outline" disabled>Disbursed</Button>
        )}
      </div>
    </div>
  )
}
