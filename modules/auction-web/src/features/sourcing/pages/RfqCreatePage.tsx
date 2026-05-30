import { useState } from 'react'

import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@auction/hooks/useModuleRoute'
import { toast } from 'sonner'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Input } from '@auction/components/ui/input'
import { createRfq } from '@auction/lib/mock-services'
import { useAuctionPermissions } from '@auction/app/permission-context'
import { Lock, Upload } from 'lucide-react'

export default function RfqCreatePage() {
  const navigate = useNavigate()
  const { canCreateRfq } = useAuctionPermissions()

  const [title, setTitle] = useState('')
  const [messageToVendor, setMessageToVendor] = useState('')
  const [deadline, setDeadline] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
  const [emailsRaw, setEmailsRaw] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name)
    }
  }

  const handleCreate = async () => {
    const targetEmails = emailsRaw.split(',').map((e) => e.trim()).filter(Boolean)

    if (!title || targetEmails.length === 0) {
      toast.error('Please fill in all required fields and provide at least one email.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await createRfq({
        title,
        deadline: new Date(deadline).toISOString(),
        targetEmails,
        messageToVendor: messageToVendor || undefined,
        templateFileName: fileName || undefined,
      })
      toast.success('RFQ dispatched via email to vendors.')
      navigate('/auction/sourcing?tab=RFQ')
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e.message ?? 'Failed to create RFQ'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!canCreateRfq) {
    return (
      <div>
        <HeroCard
          eyebrow="Sourcing"
          title="Access Denied"
          subtitle="Your role doesn't have permission to create RFQs."
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Lock className="size-4" />
            </div>
            <div className="text-sm text-[#475569]">
              Ask a Tenant Admin to grant the <span className="font-medium text-[#0F172A]">Create RFQ</span> permission.
            </div>
            <Button asChild variant="outline">
              <Link to="/auction/sourcing">Back to Client Hub</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <HeroCard
        eyebrow="Sourcing"
        title="Create RFQ"
        subtitle="Request specific pricing from vendors who are already onboarded."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>RFQ Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-[#334155]">RFQ Title <span className="text-red-500">*</span></label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dedicated capacity for Q4" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#334155]">Message to Vendors</label>
              <p className="mb-2 text-xs text-[#64748B]">This message will be included in the body of the RFQ email.</p>
              <textarea
                value={messageToVendor}
                onChange={(e) => setMessageToVendor(e.target.value)}
                rows={4}
                className="flex w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                placeholder="Dear Vendor, please review the attached pricing matrix and quote your best rates..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#334155]">Quote Deadline <span className="text-red-500">*</span></label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>

            <hr className="border-[#E5E7EB]" />

            <div>
              <label className="mb-1 block text-sm font-medium text-[#334155]">Recipient Emails <span className="text-red-500">*</span></label>
              <p className="mb-2 text-xs text-[#64748B]">Comma-separated list of vendor emails.</p>
              <textarea
                value={emailsRaw}
                onChange={(e) => setEmailsRaw(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                placeholder="vendorA@example.com, logisticsB@example.com"
              />
            </div>

            <hr className="border-[#E5E7EB]" />

            <div>
              <label className="mb-1 block text-sm font-medium text-[#334155]">RFQ Excel Template</label>
              <p className="mb-2 text-xs text-[#64748B]">Upload the pricing matrix or specific RFQ template for the vendors.</p>

              <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 hover:bg-[#F1F5F9]">
                <Upload className="mb-2 h-8 w-8 text-[#94A3B8]" />
                <span className="text-sm font-medium text-[#475569]">
                  {fileName ? fileName : 'Click or drag Excel file here'}
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review & Dispatch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[#475569]">
            <div className="rounded-xl border border-[#E5E7EB] p-4">
              <p><span className="font-medium text-[#0F172A]">Recipients:</span> {emailsRaw ? emailsRaw.split(',').filter(e => e.trim()).length : 0}</p>
              <p className="mt-2"><span className="font-medium text-[#0F172A]">Deadline:</span> {new Date(deadline).toLocaleDateString()}</p>
              <p className="mt-2"><span className="font-medium text-[#0F172A]">Template:</span> {fileName ? 'Attached' : 'None'}</p>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Dispatching...' : 'Dispatch RFQ Emails'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
