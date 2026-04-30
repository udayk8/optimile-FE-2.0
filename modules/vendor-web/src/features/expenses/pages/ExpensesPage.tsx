import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Card, CardContent } from '@vendor/components/ui/card'
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
  const approvedExpenses = expenses.filter((e) => e.status === 'APPROVED')
  const totalApproved = approvedExpenses.reduce((sum, e) => sum + e.amount, 0)

  const closeAddExpenseModal = () => {
    setIsAddExpenseOpen(false)
    if (location.pathname.startsWith('/expenses/add/')) navigate('/expenses')
  }

  useEffect(() => {
    if (location.pathname.startsWith('/expenses/add/')) setIsAddExpenseOpen(true)
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

      {/* Summary bar */}
      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Approved Expense Claims</p>
          <CurrencyDisplay amount={totalApproved} className="text-2xl font-bold text-emerald-700 dark:text-emerald-400" />
        </div>
        <div className="text-sm text-muted-foreground">
          {approvedExpenses.length} approved trip claim{approvedExpenses.length !== 1 ? 's' : ''}
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
          <EmptyState icon={<Receipt className="h-12 w-12" />} title="No expense claims found" description="Trip-level expense submissions will appear here once sent for approval." />
        ) : (
          filtered.map((expense) => (
            <Card key={expense.id} className="hover:border-primary/30">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm">{expense.tripReference}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">{expense.lineItems.length} line item{expense.lineItems.length !== 1 ? 's' : ''}</span>
                      <StatusBadge status={expense.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">Submitted: {formatDate(expense.submittedAt)}</p>
                    {expense.rejectionReason && <p className="mt-2 text-sm text-destructive">Rejected: {expense.rejectionReason}</p>}
                  </div>
                  <CurrencyDisplay amount={expense.amount} className="text-lg font-semibold" />
                </div>

                <div className="mt-4 space-y-2 rounded-lg bg-muted/40 p-3">
                  {expense.lineItems.map((line) => (
                    <div key={line.id} className="flex flex-col gap-1 rounded-md border bg-background p-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-medium">{line.expenseType.replace(/_/g, ' / ')}</div>
                        {line.description && <p className="text-sm text-muted-foreground">{line.description}</p>}
                      </div>
                      <CurrencyDisplay amount={line.amount} className="text-sm font-semibold" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddExpenseModal isOpen={isAddExpenseOpen} onClose={closeAddExpenseModal} initialTripId={tripId} />
    </div>
  )
}
