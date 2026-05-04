import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'

import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { Receipt, Plus } from 'lucide-react'
import type { ExpenseStatus } from '@vendor/types'

import { AddExpenseModal } from '@vendor/components/shared/AddExpenseModal'

const STATUS_FILTERS: { value: ExpenseStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

export default function ExpensesPage() {
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'ALL'>('ALL')
  const { expenses } = useAppStore()
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { tripId } = useParams()

  const filtered = expenses.filter((expense) => statusFilter === 'ALL' || expense.status === statusFilter)
  const closeAddExpenseModal = () => {
    setIsAddExpenseOpen(false)
    if (location.pathname.startsWith('/vendor/expenses/add/')) navigate('/vendor/expenses')
  }

  useEffect(() => {
    if (location.pathname.startsWith('/vendor/expenses/add/')) setIsAddExpenseOpen(true)
  }, [location.pathname])

  return (
    <div>
      <HeroCard 
        eyebrow="FINANCE"
        title="Expenses" 
        subtitle="Submit one bundled expense claim per trip and track its approval status" 
        icon={<Receipt className="h-5 w-5" />}
        action={
          <Button onClick={() => setIsAddExpenseOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Trip Expense
          </Button>
        }
      />

      {/* Filters */}
      <div className="mt-6 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${statusFilter === f.value ? 'bg-white text-text shadow-sm' : 'text-gray-600 hover:text-primary'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState icon={<Receipt className="h-12 w-12" />} title="No expense claims found" description="Trip-level expense submissions will appear here once sent for approval." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Expense</th>
                  <th className="px-5 py-3 font-bold">Trip</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Line Items</th>
                  <th className="px-5 py-3 font-bold">Submitted</th>
                  <th className="px-5 py-3 font-bold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="font-mono text-sm font-semibold text-text">{expense.id}</div>
                      {expense.rejectionReason && <div className="mt-1 text-xs text-danger">{expense.rejectionReason}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-text">{expense.tripReference}</div>
                      <div className="mt-1 text-xs text-gray-500">Trip-level claim</div>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={expense.status} /></td>
                    <td className="px-5 py-4 text-sm text-text">{expense.lineItems.length} line item{expense.lineItems.length !== 1 ? 's' : ''}</td>
                    <td className="px-5 py-4 text-sm text-text">{formatDate(expense.submittedAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <CurrencyDisplay amount={expense.amount} className="text-sm font-semibold" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddExpenseModal isOpen={isAddExpenseOpen} onClose={closeAddExpenseModal} initialTripId={tripId} />
    </div>
  )
}
