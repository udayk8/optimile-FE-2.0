import { useParams } from 'react-router-dom'
import { useModuleNavigate as useNavigate } from '@auction/hooks/useModuleRoute'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Badge } from '@auction/components/ui/badge'
import { Mail, ArrowLeft, FileText, Calendar, Users } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { RfqResponse, RfqType } from '@auction/types'
import { fetchRfq, patchRfqStatus } from '@auction/lib/mock-services'
import { fetchRfqResponses } from '@auction/lib/mock-services'

export default function RfqDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [resent, setResent] = useState(false)

  const [rfq, setRfq] = useState<RfqType | null>(null)
  const [responses, setResponses] = useState<RfqResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([fetchRfq(id), fetchRfqResponses(id)])
      .then(([rfqData, responseData]) => {
        setRfq(rfqData)
        setResponses(responseData)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="p-8 text-center text-[#64748B]">Loading...</div>
  }

  if (error || !rfq) {
    return (
      <div className="p-8 text-center text-[#64748B]">
        {error ?? 'RFQ not found.'}
        <br />
        <Button variant="outline" className="mt-4" onClick={() => navigate('/auction/sourcing?tab=RFQ')}>
          Back to Sourcing
        </Button>
      </div>
    )
  }

  const handleResend = () => {
    setResent(true)
    setTimeout(() => setResent(false), 3000)
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updated = await patchRfqStatus(rfq.id, newStatus)
      setRfq(updated)
    } catch (e: any) {
      console.error('Failed to update status', e)
    }
  }

  const statusVariant = rfq.status === 'PUBLISHED' ? 'success' : rfq.status === 'EVALUATING' ? 'warning' : rfq.status === 'AWARDED' ? 'success' : 'secondary'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/auction/sourcing?tab=RFQ')}
          className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F172A]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sourcing
        </button>
        <div className="flex items-center gap-2">
          {rfq.status === 'DRAFT' && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange('PUBLISHED')}>
              Publish
            </Button>
          )}
          <Button
            onClick={handleResend}
            className="flex items-center gap-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            disabled={resent}
          >
            <Mail className="h-4 w-4" />
            {resent ? 'Email Sent!' : 'Resend Email'}
          </Button>
        </div>
      </div>

      <HeroCard
        eyebrow="Request for Quotation"
        title={rfq.title}
        subtitle={`Sent to ${rfq.targetEmails?.length ?? rfq.vendorTracking?.length ?? 0} recipients`}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {rfq.messageToVendor && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#0EA5E9]" />
                  Message Sent to Vendors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 text-sm text-[#475569] whitespace-pre-wrap leading-relaxed">
                  {rfq.messageToVendor}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#0EA5E9]" />
                Recipients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(rfq.targetEmails ?? rfq.vendorTracking?.map((v) => v.vendorIdOrEmail) ?? []).length === 0 ? (
                <p className="text-sm text-[#64748B]">No recipients added.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(rfq.targetEmails ?? rfq.vendorTracking?.map((v) => v.vendorIdOrEmail) ?? []).map((email) => {
                    const tracking = rfq.vendorTracking?.find((v) => v.vendorIdOrEmail === email)
                    return (
                      <div key={email} className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs text-[#0F172A]">
                        <Mail className="h-3 w-3 text-[#64748B]" />
                        {email}
                        {tracking && (
                          <Badge
                            variant={tracking.status === 'RESPONDED' ? 'success' : tracking.status === 'DECLINED' ? 'destructive' : 'secondary'}
                            className="ml-1 text-[10px] px-1.5 py-0"
                          >
                            {tracking.status}
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0EA5E9]" />
                Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {responses.length === 0 ? (
                <p className="text-sm text-[#64748B]">No responses uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {responses.map((response) => (
                    <div key={response.id} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{response.vendorName || 'Vendor'}</p>
                          <p className="mt-1 text-xs text-[#64748B]">{response.fileName || 'Manual upload'}</p>
                        </div>
                        <Badge variant="secondary">Received</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Status</span>
                <Badge variant={statusVariant}>{rfq.status}</Badge>
              </div>

              <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-3">
                <span className="flex items-center gap-1.5 text-[#64748B]">
                  <Calendar className="h-3.5 w-3.5" />
                  Deadline
                </span>
                <span className="font-medium text-[#0F172A]">
                  {rfq.deadline ? new Date(rfq.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>

              {rfq.templateFileName && (
                <div className="flex items-start justify-between border-t border-[#F1F5F9] pt-3">
                  <span className="flex items-center gap-1.5 text-[#64748B]">
                    <FileText className="h-3.5 w-3.5" />
                    Template
                  </span>
                  <span className="max-w-[160px] truncate text-right font-medium text-[#0EA5E9]" title={rfq.templateFileName}>
                    {rfq.templateFileName}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-3">
                <span className="text-[#64748B]">Created By</span>
                <span className="font-medium text-[#0F172A]">{rfq.createdBy}</span>
              </div>

              <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-3">
                <span className="text-[#64748B]">Created</span>
                <span className="font-medium text-[#0F172A]">
                  {rfq.createdAt ? new Date(rfq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleResend}
            variant="outline"
            className="w-full flex items-center gap-2"
            disabled={resent}
          >
            <Mail className="h-4 w-4" />
            {resent ? 'Email Sent!' : 'Resend Email to All'}
          </Button>
        </div>
      </div>
    </div>
  )
}
