import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Card, CardContent } from '@shared-ui/card'
import { Button } from '@shared-ui/button'

import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate } from '@vendor/utils/date-utils'
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

  const filtered = expenses.filter((e) => statusFilter === 'ALL' || e.status === statusFilter)
  const approvedExpenses = expenses.filter((e) => e.status === 'APPROVED')
  const totalApproved = approvedExpenses.reduce((sum, e) => sum + e.amount, 0)

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
        subtitle="Submit and track trip-linked expenses" 
        icon={<Receipt className="h-5 w-5" />}
        action={
          <Button onClick={() => setIsAddExpenseOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Expense
          </Button>
        }
      />

      {/* Summary bar */}
      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Approved Expenses</p>
          <CurrencyDisplay amount={totalApproved} className="text-2xl font-bold text-emerald-700 dark:text-emerald-400" />
        </div>
        <div className="text-sm text-muted-foreground">
          {approvedExpenses.length} expense{approvedExpenses.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${statusFilter === f.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon={<Receipt className="h-12 w-12" />} title="No expenses found" description="Expenses submitted against completed trips will appear here." />
        ) : (
          filtered.map((expense) => (
            <Card key={expense.id} className="cursor-pointer hover:border-primary/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm">{expense.tripReference}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{expense.expenseType.replace('_', '/')}</span>
                    <StatusBadge status={expense.status} />
                  </div>
                  {expense.description && <p className="text-sm text-muted-foreground">{expense.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Submitted: {formatDate(expense.submittedAt)}</p>
                </div>
                <CurrencyDisplay amount={expense.amount} className="text-lg font-semibold" />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddExpenseModal isOpen={isAddExpenseOpen} onClose={closeAddExpenseModal} initialTripId={tripId} />
    </div>
  )
}
