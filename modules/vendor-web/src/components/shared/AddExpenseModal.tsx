import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@vendor/components/ui/dialog'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { useAppStore } from '@vendor/stores/app.store'
import type { Expense, ExpenseLineItem, ExpenseType } from '@vendor/types'

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  initialTripId?: string
}

interface ExpenseLineDraft {
  id: string
  expenseType: ExpenseType
  amount: string
  description: string
}

const EXPENSE_TYPE_OPTIONS: { value: ExpenseType; label: string }[] = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'DETENTION', label: 'Detention' },
  { value: 'LOADING_UNLOADING', label: 'Loading / Unloading' },
  { value: 'WEIGHBRIDGE', label: 'Weighbridge' },
  { value: 'OTHER', label: 'Other' },
]

function createEmptyLine(): ExpenseLineDraft {
  return {
    id: `line-${Math.floor(1000 + Math.random() * 9000)}`,
    expenseType: 'EXPENSE',
    amount: '',
    description: '',
  }
}

export function AddExpenseModal({ isOpen, onClose, initialTripId }: AddExpenseModalProps) {
  const { trips, addExpense, expenses } = useAppStore()
  const [tripId, setTripId] = useState('')
  const [lines, setLines] = useState<ExpenseLineDraft[]>([createEmptyLine()])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return

    const nextTripId = initialTripId ?? ''
    setTripId(nextTripId)

    const existingExpense = initialTripId ? expenses.find((expense) => expense.tripId === initialTripId) : undefined
    if (existingExpense) {
      setLines(
        existingExpense.lineItems.map((item) => ({
          id: item.id,
          expenseType: item.expenseType,
          amount: String(item.amount),
          description: item.description ?? '',
        }))
      )
      return
    }

    setLines([createEmptyLine()])
  }, [expenses, initialTripId, isOpen])

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (!tripId) {
      nextErrors.tripId = 'Please select a trip.'
    }

    lines.forEach((line, index) => {
      if (!line.amount.trim()) {
        nextErrors[`amount-${index}`] = 'Amount is required.'
      } else if (Number.isNaN(Number(line.amount)) || Number(line.amount) <= 0) {
        nextErrors[`amount-${index}`] = 'Enter an amount greater than zero.'
      }
    })

    return nextErrors
  }

  const resetForm = () => {
    setTripId('')
    setLines([createEmptyLine()])
    setErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    const lineItems: ExpenseLineItem[] = lines.map((line, index) => ({
      id: `${tripId}-expense-${index + 1}`,
      expenseType: line.expenseType,
      amount: Number(line.amount),
      description: line.description.trim() || undefined,
    }))

    const totalAmount = lineItems.reduce((sum, line) => sum + line.amount, 0)

    const newExpense: Expense = {
      id: `EXP-${tripId}`,
      tripId,
      tripReference: tripId,
      lineItems,
      amount: totalAmount,
      submittedAt: new Date().toISOString(),
    }

    addExpense(newExpense)
    resetForm()
    onClose()
  }

  const availableTrips = trips

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Booking Expenses</DialogTitle>
          <DialogDescription>
            Add or edit expense lines for this booking. Changes save immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Select Trip <span className="text-destructive">*</span>
            </label>
            <select
              className={`flex h-10 w-full rounded-md border ${errors.tripId ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`}
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
            >
              <option value="">Select a trip...</option>
              {availableTrips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.id} ({trip.laneDetails.origin.city} → {trip.laneDetails.destination.city})
                </option>
              ))}
            </select>
            {errors.tripId && <p className="text-xs text-destructive">{errors.tripId}</p>}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Expense Lines</label>
              <Button type="button" variant="outline" onClick={() => setLines((prev) => [...prev, createEmptyLine()])}>
                Add Line
              </Button>
            </div>

            {lines.map((line, index) => (
              <div key={line.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[180px_140px_1fr_auto]">
                <div>
                  <label className="text-xs text-muted-foreground">Expense Type</label>
                  <select
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={line.expenseType}
                    onChange={(e) =>
                      setLines((prev) => prev.map((item) => (item.id === line.id ? { ...item, expenseType: e.target.value as ExpenseType } : item)))
                    }
                  >
                    {EXPENSE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <Input
                    type="number"
                    value={line.amount}
                    onChange={(e) =>
                      setLines((prev) => prev.map((item) => (item.id === line.id ? { ...item, amount: e.target.value } : item)))
                    }
                    className={`mt-1 ${errors[`amount-${index}`] ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {errors[`amount-${index}`] && <p className="mt-1 text-xs text-destructive">{errors[`amount-${index}`]}</p>}
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Description</label>
                  <Input
                    value={line.description}
                    onChange={(e) =>
                      setLines((prev) => prev.map((item) => (item.id === line.id ? { ...item, description: e.target.value } : item)))
                    }
                    className="mt-1"
                    placeholder="Optional note"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== line.id) : prev))}
                    disabled={lines.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            Total submission amount: <span className="font-semibold">₹{lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0).toLocaleString('en-IN')}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit">Save Expense</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
