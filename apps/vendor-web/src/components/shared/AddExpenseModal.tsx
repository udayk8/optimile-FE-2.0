import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@shared-ui/dialog'
import { Button } from '@shared-ui/button'
import { Input } from '@shared-ui/input'
import { useAppStore } from '@vendor/stores/app.store'
import { Expense } from '@vendor/types'

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  initialTripId?: string
}

export function AddExpenseModal({ isOpen, onClose, initialTripId }: AddExpenseModalProps) {
  const { trips, addExpense } = useAppStore()
  const [tripId, setTripId] = useState('')
  const [expenseType, setExpenseType] = useState('TOLL')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (isOpen && initialTripId) {
      setTripId(initialTripId)
    }
  }, [initialTripId, isOpen])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!tripId) {
      newErrors.tripId = 'Please select a trip to link this expense.'
    }
    if (!amount.trim()) {
      newErrors.amount = 'Expense amount is required.'
    } else if (isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Enter a valid amount greater than zero.'
    }
    return newErrors
  }

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors(validate())
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validate()
    setErrors(newErrors)
    setTouched({ tripId: true, amount: true })

    if (Object.keys(newErrors).length > 0) return

    const newExpense: Expense = {
      id: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
      tripId,
      tripReference: tripId,
      expenseType: expenseType as any,
      amount: Number(amount),
      description,
      status: 'PENDING',
      submittedAt: new Date().toISOString()
    }

    addExpense(newExpense)
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setTripId('')
    setExpenseType('TOLL')
    setAmount('')
    setDescription('')
    setErrors({})
    setTouched({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Only active/dispatched/delivered trips should probably have expenses added, 
  // but for demo we can list all trips
  const availableTrips = trips

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Log a new expense against a trip.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Select Trip <span className="text-destructive">*</span>
            </label>
            <select 
              className={`flex h-10 w-full rounded-md border ${touched.tripId && errors.tripId ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`}
              value={tripId}
              onChange={(e) => { setTripId(e.target.value); setTouched((prev) => ({ ...prev, tripId: true })) }}
              onBlur={() => handleBlur('tripId')}
            >
              <option value="">Select a trip...</option>
              {availableTrips.map(trip => (
                <option key={trip.id} value={trip.id}>
                  {trip.id} ({trip.laneDetails.origin.city} → {trip.laneDetails.destination.city})
                </option>
              ))}
            </select>
            {touched.tripId && errors.tripId && (
              <p className="text-xs text-destructive">{errors.tripId}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Expense Type</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
            >
              <option value="TOLL">Toll</option>
              <option value="FUEL">Fuel</option>
              <option value="LOADING">Loading/Unloading</option>
              <option value="WEIGHBRIDGE">Weighbridge</option>
              <option value="DETENTION">Detention</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Amount (₹) <span className="text-destructive">*</span>
            </label>
            <Input 
              type="number"
              placeholder="e.g. 500" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => handleBlur('amount')}
              className={touched.amount && errors.amount ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {touched.amount && errors.amount && (
              <p className="text-xs text-destructive">{errors.amount}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <Input 
              placeholder="e.g. Highway toll" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit">Submit Expense</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
