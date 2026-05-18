import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Mail, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { useAppStore } from '@vendor/stores/app.store'
import type { Invoice, NBFCDiscountingStatus } from '@vendor/types'

const PARTNERS = [
  { id: 'nbfc-1', name: 'FinEdge Capital', advancePercentage: 85, interestRate: 12.5 },
  { id: 'nbfc-2', name: 'Prime Credit', advancePercentage: 82, interestRate: 13.2 },
  { id: 'nbfc-3', name: 'Axis Finance', advancePercentage: 80, interestRate: 11.9 },
  { id: 'nbfc-4', name: 'Tata Capital', advancePercentage: 83, interestRate: 12.1 },
  { id: 'nbfc-5', name: 'Aditya Birla Finance', advancePercentage: 81, interestRate: 12.8 },
  { id: 'nbfc-6', name: 'SMFG India', advancePercentage: 79, interestRate: 13.0 },
]

const FALLBACK_INVOICES: Record<string, Invoice> = {}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} px-4 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:bg-white`
}

export default function DiscountingApplicationPage() {
  const navigate = useNavigate()
  const { invoiceId, nbfcId } = useParams()
  const {
    invoices,
    nbfcApplications,
    submitNbfcApplication,
    updateNbfcApplicationFinancials,
    markNbfcApplicationStatus,
  } = useAppStore()

  const invoice = useMemo(
    () => invoices.find((item) => item.id === invoiceId) ?? (invoiceId ? FALLBACK_INVOICES[invoiceId] : undefined),
    [invoiceId, invoices],
  )
  const application = useMemo(() => nbfcApplications.find((item) => item.invoiceId === invoiceId), [invoiceId, nbfcApplications])
  const partner = useMemo(
    () => PARTNERS.find((item) => item.id === (application?.partnerId ?? nbfcId)),
    [application?.partnerId, nbfcId],
  )

  const mode: NBFCDiscountingStatus = application?.status ?? 'ELIGIBLE'
  const amount = invoice?.grandTotal ?? 0

  const computedRequested = partner ? Math.round((amount * partner.advancePercentage) / 100) : 0
  const computedCharges = partner ? Math.round((computedRequested * partner.interestRate) / 1200) : 0
  const computedNet = computedRequested - computedCharges

  const [approvedAmount, setApprovedAmount] = useState(0)
  const [charges, setCharges] = useState(0)
  const [netAmount, setNetAmount] = useState(0)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [remarks, setRemarks] = useState('')
  const [emailTitle, setEmailTitle] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [emailDescription, setEmailDescription] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setApprovedAmount(application?.approvedAmount ?? application?.requestedAmount ?? computedRequested)
    setCharges(application?.charges ?? computedCharges)
    setNetAmount(application?.netAmount ?? computedNet)
    setReferenceNumber(application?.referenceNumber ?? '')
    setRemarks(application?.remarks ?? '')
    setEmailTitle(application?.emailTitle ?? `Bill Discounting Request - ${invoice?.id ?? ''}`)
    setRecipientEmail(application?.recipientEmail ?? '')
    setEmailDescription(application?.emailDescription ?? `Please process bill discounting request for ${invoice?.id ?? ''}.`)
  }, [application, computedRequested, computedCharges, computedNet, invoice?.id])

  if (!invoice || !partner) {
    return <div className="p-6 text-sm text-gray-500">Loading application details...</div>
  }

  const editable = mode === 'SUBMITTED'
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)
  const canSubmitEmail = emailTitle.trim() && emailValid && emailDescription.trim() && uploadedFile

  const submitApplication = () => {
    setSubmitted(true)
    if (!canSubmitEmail) {
      toast.error('Email title, recipient, description, and invoice file are required')
      return
    }

    submitNbfcApplication({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber ?? invoice.id,
      customerName: invoice.id,
      partnerId: partner.id,
      partnerName: partner.name,
      requestedAmount: computedRequested,
      charges: computedCharges,
      netAmount: computedNet,
      emailTitle: emailTitle.trim(),
      recipientEmail: recipientEmail.trim(),
      emailDescription: emailDescription.trim(),
      invoiceFileName: uploadedFile?.name,
    })
    toast.success('Application submitted and email sent')
    navigate('/vendor/receivables')
  }

  const saveFinancials = () => {
    if (approvedAmount <= 0 || netAmount <= 0) {
      toast.error('Approved and net amount must be greater than zero')
      return
    }
    updateNbfcApplicationFinancials({
      invoiceId: invoice.id,
      approvedAmount,
      charges,
      netAmount,
      referenceNumber,
      remarks,
    })
    toast.success('Application values updated')
  }

  const markApproved = () => {
    saveFinancials()
    markNbfcApplicationStatus(invoice.id, 'APPROVED')
    toast.success('Application marked approved')
  }

  const markRejected = () => {
    markNbfcApplicationStatus(invoice.id, 'REJECTED')
    toast.success('Application marked rejected')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Bill Discounting</div>
              <h1 className="text-2xl font-semibold text-text">{mode === 'ELIGIBLE' ? 'Apply for Discounting' : 'Application Details'}</h1>
              <p className="mt-1 text-sm text-gray-500">Invoice {invoice.id} · {partner.name} · {mode}</p>
            </div>
          </div>
          {mode === 'ELIGIBLE' && <Button onClick={submitApplication}><Mail className="mr-2 h-4 w-4" />Send Email</Button>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Invoice amount" value={amount} />
        <Stat label="Requested amount" value={application?.requestedAmount ?? computedRequested} />
        <Stat label="Charges" value={application?.charges ?? computedCharges} />
        <Stat label="Net amount" value={application?.netAmount ?? computedNet} />
      </div>

      {mode === 'ELIGIBLE' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text">Send Application Email</h3>
              <p className="text-sm text-gray-500">Share invoice and request with selected NBFC partner.</p>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Application summary (auto-filled)</p>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div><span className="text-gray-500">Invoice</span><p className="mt-0.5 font-mono font-semibold text-text">{invoice.id}</p></div>
              <div><span className="text-gray-500">Invoice amount</span><p className="mt-0.5 font-semibold text-text">₹{amount.toLocaleString('en-IN')}</p></div>
              <div><span className="text-gray-500">Requested ({partner.advancePercentage}%)</span><p className="mt-0.5 font-semibold text-emerald-600">₹{computedRequested.toLocaleString('en-IN')}</p></div>
              <div><span className="text-gray-500">Charges ({partner.interestRate}% p.a.)</span><p className="mt-0.5 font-semibold text-red-500">₹{computedCharges.toLocaleString('en-IN')}</p></div>
              <div><span className="text-gray-500">Net amount</span><p className="mt-0.5 font-semibold text-blue-600">₹{computedNet.toLocaleString('en-IN')}</p></div>
              <div><span className="text-gray-500">Partner</span><p className="mt-0.5 font-semibold text-text">{partner.name}</p></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-text">Email title <span className="text-red-500">*</span></label>
            <input value={emailTitle} onChange={(e) => setEmailTitle(e.target.value)} className={inputClass(submitted && !emailTitle.trim())} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-text">Recipient email <span className="text-red-500">*</span></label>
            <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className={inputClass(submitted && !emailValid)} placeholder="partner@nbfc.com" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-text">Description <span className="text-red-500">*</span></label>
            <textarea
              value={emailDescription}
              onChange={(e) => setEmailDescription(e.target.value)}
              rows={4}
              className={`${inputClass(submitted && !emailDescription.trim())} resize-none`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-text">Attach invoice <span className="text-red-500">*</span></label>
            {uploadedFile ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <Paperclip className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="font-semibold text-emerald-700 truncate max-w-xs">{uploadedFile.name}</span>
                  <span className="text-xs text-emerald-500">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button type="button" onClick={() => setUploadedFile(null)} className="ml-2 rounded-full p-1 text-emerald-600 hover:bg-emerald-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition hover:bg-gray-50 ${submitted && !uploadedFile ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                <Paperclip className={`h-6 w-6 ${submitted && !uploadedFile ? 'text-red-400' : 'text-gray-400'}`} />
                <div className="text-sm text-gray-600"><span className="font-semibold text-primary">Click to upload</span> invoice file</div>
                <p className="text-xs text-gray-400">PDF, PNG, JPG up to 10 MB</p>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>
        </div>
      )}

      {mode !== 'ELIGIBLE' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold text-text">Financial details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-text">Approved amount
              <Input type="number" min="0" value={approvedAmount} disabled={!editable} onChange={(e) => setApprovedAmount(Number(e.target.value))} className="mt-1" />
            </label>
            <label className="text-sm font-medium text-text">Charges
              <Input type="number" min="0" value={charges} disabled={!editable} onChange={(e) => setCharges(Number(e.target.value))} className="mt-1" />
            </label>
            <label className="text-sm font-medium text-text">Net amount
              <Input type="number" min="0" value={netAmount} disabled={!editable} onChange={(e) => setNetAmount(Number(e.target.value))} className="mt-1" />
            </label>
            <label className="text-sm font-medium text-text">Reference number
              <Input value={referenceNumber} disabled={!editable} onChange={(e) => setReferenceNumber(e.target.value)} className="mt-1" />
            </label>
          </div>
          <label className="block text-sm font-medium text-text">Remarks
            <textarea
              value={remarks}
              disabled={!editable}
              onChange={(e) => setRemarks(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
            />
          </label>

          {mode === 'SUBMITTED' && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={saveFinancials}>Save</Button>
              <Button onClick={markApproved}>Mark Approved</Button>
              <Button variant="ghost" onClick={markRejected}>Reject</Button>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            <p><span className="font-semibold text-gray-700">Email:</span> {application?.recipientEmail ?? '—'}</p>
            <p><span className="font-semibold text-gray-700">Subject:</span> {application?.emailTitle ?? '—'}</p>
            <p><span className="font-semibold text-gray-700">Invoice file:</span> {application?.invoiceFileName ?? '—'}</p>
            <p className="mt-1 text-gray-600">{application?.emailDescription ?? '—'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-text">₹{value.toLocaleString('en-IN')}</div>
    </div>
  )
}
