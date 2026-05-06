import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Banknote, FileSpreadsheet, Wallet } from 'lucide-react'

export default function FinanceDashboard() {
  const navigate = useNavigate()

  const summaryCards = [
    { label: 'Current Balance', value: '₹18.4L', note: 'Net receivables pending settlement' },
    { label: 'This Month Paid', value: '₹12.9L', note: 'Payments received against invoices' },
    { label: 'TDS Deducted', value: '₹1.8L', note: 'Tax deducted at source on approved invoices' },
    { label: 'Ready for Discounting', value: '₹6.2L', note: 'Approved invoices eligible for NBFC funding' },
  ]

  return (
    <div className="space-y-6">
      <HeroCard
        eyebrow="FINANCIAL HUB"
        title="Ledger & Earnings"
        subtitle="Track your earnings, outstanding balances, and early payment options"
        icon={<Wallet className="h-6 w-6 text-primary" />}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">{card.label}</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-text">{card.value}</div>
            <div className="mt-2 text-sm text-gray-500">{card.note}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text">Ledger</h3>
              <p className="mt-1 text-sm text-gray-500">Chronological view of settlements, deductions, and invoice payments.</p>
            </div>
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            Latest entry: Invoice `INV-2408-018` settled on 04 May 2026 with a net credit of ₹1.42L.
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => navigate('/vendor/ledger')}>
              Open Ledger
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text">Bill Discounting</h3>
              <p className="mt-1 text-sm text-gray-500">Apply for early payment against approved invoices with partner NBFCs.</p>
            </div>
            <Banknote className="h-5 w-5 text-primary" />
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>• 14 invoices are currently eligible for discounting</li>
            <li>• Expected funding cycle: 24 to 48 hours</li>
            <li>• Indicative fee range: 1.25% to 1.8%</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => navigate('/vendor/nbfc')}>
              Apply for Funding
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/vendor/invoices/list')}>
              Review Invoices
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
