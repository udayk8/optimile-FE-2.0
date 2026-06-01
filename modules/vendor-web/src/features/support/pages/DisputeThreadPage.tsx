import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Button } from '@vendor/components/ui/button'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { useParams } from 'react-router-dom'
import { useModuleNavigate as useNavigate } from '@vendor/hooks/useModuleRoute'
import { ArrowLeft, CheckCircle2, Clock, MessageSquareMore, Paperclip, Send, X } from 'lucide-react'
import { useAppStore } from '@vendor/stores/app.store'

export default function DisputeThreadPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const disputes = useAppStore((state) => state.disputes)
  const respondToDispute = useAppStore((state) => state.respondToDispute)
  const invoices = useAppStore((state) => state.invoices)

  const dispute = disputes.find((item) => item.id === id)
  const invoice = invoices.find((item) => item.id === dispute?.invoiceId)
  const [reply, setReply] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const orderedMessages = useMemo(() => {
    return [...(dispute?.messages ?? [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [dispute?.messages])

  if (!dispute) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-gray-500">No dispute found with ID {id}.</p>
        <Button variant="outline" onClick={() => navigate('/vendor/invoices?tab=disputed')}>Back to disputes</Button>
      </div>
    )
  }

  // The vendor can only reply / upload while finance is still reviewing (dispute OPEN and invoice DISPUTED).
  const canRespond = dispute.status === 'OPEN' && invoice?.status === 'DISPUTED'
  const isResubmission = invoice?.status === 'RESUBMISSION_REQUIRED'

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const names = Array.from(event.target.files ?? []).map((file) => file.name)
    if (names.length) setAttachments((prev) => [...prev, ...names])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleReply = () => {
    if (!reply.trim() && attachments.length === 0) {
      setError('Add a response or attach a document')
      return
    }
    respondToDispute(dispute.id, reply.trim(), attachments)
    setReply('')
    setAttachments([])
    setError('')
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/vendor/invoices?tab=disputed')}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Disputed Invoices
      </button>

      <div className="flex flex-wrap items-start gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">INVOICE DISPUTE</p>
          <h1 className="mt-1 text-2xl font-bold text-text">{dispute.id}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Invoice {dispute.invoiceNumber} · Raised {new Date(dispute.raisedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <StatusBadge status={dispute.status} />
          {invoice ? <StatusBadge status={invoice.status} /> : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageSquareMore className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-text">Response Thread</h3>
            </div>
            <div className="mt-4 space-y-3">
              {orderedMessages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-2xl p-4 ${
                    message.sender === 'VENDOR' ? 'border border-primary/10 bg-primary/5' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      {message.sender === 'VENDOR' ? 'Vendor' : 'Finance'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(message.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{message.message}</p>
                  {message.attachments?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.attachments.map((attachment) => (
                        <span key={attachment.id} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600">
                          <Paperclip className="h-3 w-3" />
                          {attachment.fileName}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {canRespond ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-text">Reply To Finance</h3>
              <p className="mt-1 text-sm text-gray-500">Reply or upload supporting documents. Finance decides the final outcome — the invoice stays disputed until then.</p>
              <textarea
                value={reply}
                onChange={(event) => {
                  setReply(event.target.value)
                  setError('')
                }}
                rows={5}
                placeholder="Add your response or supporting explanation"
                className="mt-4 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white"
              />
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
              {attachments.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attachments.map((name, index) => (
                    <span key={`${name}-${index}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600">
                      <Paperclip className="h-3 w-3" />
                      {name}
                      <button type="button" onClick={() => removeAttachment(index)} className="ml-1 text-gray-400 hover:text-rose-600">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
                <Button onClick={handleReply}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Response
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <CheckCircle2 className="h-4 w-4" />
                {isResubmission
                  ? 'Finance asked for a corrected invoice. This thread is now closed — create a new invoice from the resubmission tab.'
                  : 'This dispute thread is closed. Finance has taken a final decision.'}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-400">Invoice Details</h4>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-gray-400">Invoice</div>
                <div className="font-mono font-bold text-text">{dispute.invoiceNumber}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Amount</div>
                <div className="font-bold text-text"><CurrencyDisplay amount={dispute.invoiceAmount} /></div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Reason</div>
                <div className="text-text">{dispute.reason}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-400">Current State</h4>
            <div className="space-y-3 text-sm text-gray-700">
              {dispute.responseDueAt ? (
                <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <Clock className="h-4 w-4 text-amber-600" />
                  SLA response due by {new Date(dispute.responseDueAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              ) : null}
              {isResubmission ? (
                <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
                  Finance requires a corrected invoice. Open the resubmission tab to create a new invoice — this one is closed as superseded.
                </div>
              ) : (
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  Reply or upload documents to support your invoice. Only finance can approve, request a resubmission, or reject it.
                </div>
              )}
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={() => navigate(`/vendor/invoices/${dispute.invoiceId}`)}>
            View Invoice
          </Button>
        </div>
      </div>
    </div>
  )
}
