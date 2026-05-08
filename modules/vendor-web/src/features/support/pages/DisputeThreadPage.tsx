import { Button } from '@vendor/components/ui/button'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Clock, ArrowLeft } from 'lucide-react'
import { useAppStore } from '@vendor/stores/app.store'
import type { DisputeStatus } from '@vendor/types'

const STATUS_COLORS: Record<DisputeStatus, string> = {
  OPEN: 'bg-rose-50 text-rose-700 border border-rose-100',
  IN_REVIEW: 'bg-amber-50 text-amber-700 border border-amber-100',
  ACCEPTED: 'bg-green-50 text-green-700 border border-green-100',
  CANCELLED: 'bg-gray-100 text-gray-600 border border-gray-200',
  CLOSED: 'bg-gray-100 text-gray-600 border border-gray-200',
}

const MOCK_THREAD = [
  { sender: 'Vendor', message: 'We disagree with the deduction. POD was uploaded within the SLA window and GPS confirms on-time delivery.' },
  { sender: 'Admin', message: 'We are reviewing the timestamp against the trip logs.' },
  { sender: 'Vendor', message: 'Please review the upload receipt and GPS trail attached.' },
]

export default function DisputeThreadPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const disputes = useAppStore((state) => state.disputes)
  const acceptDispute = useAppStore((state) => state.acceptDispute)
  const cancelDispute = useAppStore((state) => state.cancelDispute)

  const dispute = disputes.find((d) => d.id === id)

  if (!dispute) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-gray-500">No dispute found with ID {id}.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  const canAdminAct = dispute.status === 'OPEN' || dispute.status === 'IN_REVIEW'

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(`/vendor/invoices/${dispute.invoiceId}`)}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Invoice
      </button>

      <div className="flex flex-wrap items-start gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">SUPPORT · DISPUTE</p>
          <h1 className="mt-1 text-2xl font-bold text-text">{dispute.id}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Invoice {dispute.invoiceNumber} · Raised {new Date(dispute.raisedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
          </p>
        </div>
        <span className={`ml-auto rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${STATUS_COLORS[dispute.status]}`}>
          {dispute.status.replace('_', ' ')}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Thread */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-text">Dispute Reason</h3>
            <div className="rounded-xl border-l-4 border-primary/30 bg-gray-50 p-4 text-sm italic text-gray-700">
              "{dispute.reason}"
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-text">Communication Thread</h3>
            <div className="space-y-3">
              {MOCK_THREAD.map((entry, i) => (
                <div key={i} className={`rounded-xl p-4 ${entry.sender === 'Vendor' ? 'border border-primary/10 bg-primary/5' : 'bg-gray-50'}`}>
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-400">{entry.sender}</div>
                  <div className="mt-1 text-sm text-gray-700">{entry.message}</div>
                </div>
              ))}
              {dispute.notes && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-amber-600">Note</div>
                  <div className="mt-1 text-sm text-gray-700">{dispute.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-400">Invoice Details</h4>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-gray-400">Invoice</div>
                <div className="font-mono font-bold text-text">{dispute.invoiceNumber}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Disputed Amount</div>
                <div className="font-bold text-text"><CurrencyDisplay amount={dispute.invoiceAmount} /></div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Raised</div>
                <div className="text-text">{new Date(dispute.raisedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Last Updated</div>
                <div className="text-text">{new Date(dispute.updatedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-400">Admin Actions</h4>

            {canAdminAct && (
              <div className="space-y-3">
                <Button className="w-full" onClick={() => acceptDispute(dispute.id)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Accept Dispute
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-600 hover:bg-gray-50"
                  onClick={() => cancelDispute(dispute.id)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Dispute
                </Button>
              </div>
            )}

            {dispute.status === 'ACCEPTED' && (
              <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Accepted — invoice approved
              </div>
            )}

            {dispute.status === 'CANCELLED' && (
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">
                <Clock className="h-4 w-4" />
                Cancelled — awaiting vendor resubmission
              </div>
            )}

            {dispute.status === 'CLOSED' && (
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">
                <CheckCircle2 className="h-4 w-4" />
                Closed
              </div>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={() => navigate(`/vendor/invoices/${dispute.invoiceId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoice
          </Button>
        </div>
      </div>
    </div>
  )
}
