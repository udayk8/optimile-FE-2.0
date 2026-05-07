import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'

export default function DisputeThreadPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <HeroCard
        eyebrow="SUPPORT"
        title={`Dispute ${id}`}
        subtitle="Communicate with the client regarding invoice deductions"
        icon={<MessageSquare className="h-6 w-6 text-primary" />}
      />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          {[
            ['Vendor', 'We disagree with the penalty because POD was uploaded within the SLA window.'],
            ['Customer', 'We are checking the timestamp against the trip logs.'],
            ['Vendor', 'Please review the upload receipt and GPS trail attached.'],
          ].map(([sender, message]) => (
            <div key={`${sender}-${message}`} className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{sender}</div>
              <div className="mt-1 text-sm text-gray-700">{message}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => navigate('/vendor/disputes')}>Back to Disputes</Button>
          <Button variant="outline" onClick={() => navigate('/vendor/invoices/list')}>Open Invoices</Button>
        </div>
      </div>
    </div>
  )
}
