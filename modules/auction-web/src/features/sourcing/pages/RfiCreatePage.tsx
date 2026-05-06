import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Input } from '@auction/components/ui/input'
import { useAppStore } from '@auction/stores/app.store'
import { useAuctionAuth } from '@auction/hooks/useAuctionAuth'
import { Upload } from 'lucide-react'

export default function RfiCreatePage() {
  const navigate = useNavigate()
  const { createRfi } = useAppStore()
  const { auctionUser } = useAuctionAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [messageToVendor, setMessageToVendor] = useState('')
  const [deadline, setDeadline] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
  const [emailsRaw, setEmailsRaw] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name)
    }
  }

  const handleCreate = () => {
    if (!title || !description || !emailsRaw) {
      toast.error('Please fill in all required fields.')
      return
    }

    const targetEmails = emailsRaw.split(',').map((e) => e.trim()).filter(Boolean)
    if (targetEmails.length === 0) {
      toast.error('Please provide at least one valid email address.')
      return
    }

    createRfi({
      title,
      description,
      deadline: new Date(deadline).toISOString(),
      targetEmails,
      messageToVendor: messageToVendor || undefined,
      templateFileName: fileName || undefined,
      createdBy: auctionUser?.name ?? 'Demo User',
    })

    toast.success('RFI dispatched via email to potential vendors.')
    navigate('/auction/sourcing?tab=RFI')
  }

  return (
    <div>
      <HeroCard
        eyebrow="Sourcing"
        title="Create RFI Campaign"
        subtitle="Distribute RFI templates to external contacts to discover new vendors."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#334155]">Campaign Title <span className="text-red-500">*</span></label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q4 Pan-India Fleet Discovery" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#334155]">Description <span className="text-red-500">*</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                placeholder="Explain what kind of vendors you are looking for..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#334155]">Message to Vendors</label>
              <p className="mb-2 text-xs text-[#64748B]">This message will be included in the body of the email sent to the external contacts.</p>
              <textarea
                value={messageToVendor}
                onChange={(e) => setMessageToVendor(e.target.value)}
                rows={4}
                className="flex w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                placeholder="Dear Vendor, please find the attached RFI..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#334155]">Response Deadline <span className="text-red-500">*</span></label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>

            <hr className="border-[#E5E7EB]" />

            <div>
              <label className="mb-1 block text-sm font-medium text-[#334155]">Recipient Emails <span className="text-red-500">*</span></label>
              <p className="mb-2 text-xs text-[#64748B]">Comma-separated list of external vendor emails (not yet onboarded).</p>
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
              <label className="mb-1 block text-sm font-medium text-[#334155]">RFI Excel Template</label>
              <p className="mb-2 text-xs text-[#64748B]">Upload the standardized RFI template you want vendors to fill out.</p>
              
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
              <p className="mt-2"><span className="font-medium text-[#0F172A]">Template:</span> {fileName ? 'Attached' : 'None'}</p>
              <p className="mt-2"><span className="font-medium text-[#0F172A]">Deadline:</span> {new Date(deadline).toLocaleDateString()}</p>
            </div>
            <Button className="w-full" onClick={handleCreate}>
              Dispatch RFI Emails
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
