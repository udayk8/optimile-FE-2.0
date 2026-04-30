import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@vendor/components/ui/dialog'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { useAppStore } from '@vendor/stores/app.store'
import type { Driver, DriverTrackingSelection } from '@vendor/types'

interface AddDriverModalProps {
  isOpen: boolean
  onClose: () => void
  initialDriver?: Driver | null
}

type DriverFormState = {
  name: string
  dateOfBirth: string
  dlNumber: string
  dlName: string
  mobile: string
  dlValidTillDate: string
  gender: Driver['gender'] | ''
  email: string
  dlCopyFileName: string
  licenseClasses: string
}

const DEFAULT_FORM: DriverFormState = {
  name: '',
  dateOfBirth: '',
  dlNumber: '',
  dlName: '',
  mobile: '',
  dlValidTillDate: '',
  gender: '',
  email: '',
  dlCopyFileName: '',
  licenseClasses: 'HCV, LCV',
}

export function AddDriverModal({ isOpen, onClose, initialDriver }: AddDriverModalProps) {
  const { addDriver, updateDriver } = useAppStore()
  const isEditMode = !!initialDriver
  const [form, setForm] = useState<DriverFormState>(DEFAULT_FORM)
  const [trackingSelections, setTrackingSelections] = useState<DriverTrackingSelection[]>([
    { type: 'SIM Tracking', checked: true, primarySet: true },
    { type: 'Driver App Tracking', checked: true, primarySet: false },
  ])

  useEffect(() => {
    if (!isOpen) return
    if (initialDriver) {
      setForm({
        name: initialDriver.name ?? '',
        dateOfBirth: initialDriver.dateOfBirth ?? '',
        dlNumber: initialDriver.licenseNumber ?? '',
        dlName: initialDriver.dlName ?? initialDriver.name ?? '',
        mobile: initialDriver.mobile ?? '',
        dlValidTillDate: initialDriver.dlValidTillDate ?? initialDriver.licenseExpiry ?? '',
        gender: initialDriver.gender ?? '',
        email: initialDriver.email ?? '',
        dlCopyFileName: initialDriver.dlCopyFileName ?? '',
        licenseClasses: initialDriver.licenseClass?.join(', ') ?? 'HCV, LCV',
      })
      setTrackingSelections(
        initialDriver.trackingSelections ?? [
          { type: 'SIM Tracking', checked: true, primarySet: true },
          { type: 'Driver App Tracking', checked: true, primarySet: false },
        ]
      )
    } else {
      setForm(DEFAULT_FORM)
      setTrackingSelections([
        { type: 'SIM Tracking', checked: true, primarySet: true },
        { type: 'Driver App Tracking', checked: true, primarySet: false },
      ])
    }
  }, [initialDriver, isOpen])

  const setField = <K extends keyof DriverFormState>(key: K, value: DriverFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateTrackingSelection = (index: number, patch: Partial<DriverTrackingSelection>) => {
    setTrackingSelections((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  }

  const handleClose = () => onClose()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const nextDriver: Driver = {
      id: initialDriver?.id ?? `DR-${Math.floor(1000 + Math.random() * 9000)}`,
      name: form.name,
      dateOfBirth: form.dateOfBirth,
      dlName: form.dlName,
      dlVerified: true,
      mobile: form.mobile,
      licenseNumber: form.dlNumber,
      dlValidTillDate: form.dlValidTillDate,
      gender: form.gender || undefined,
      email: form.email,
      dlCopyFileName: form.dlCopyFileName,
      trackingSelections,
      licenseExpiry: form.dlValidTillDate || new Date(Date.now() + 31536000000 * 2).toISOString(),
      licenseClass: form.licenseClasses.split(',').map((value) => value.trim()).filter(Boolean),
      complianceStatus: 'COMPLIANT',
      currentStatus: 'ACTIVE',
      complianceDocuments: initialDriver?.complianceDocuments ?? [],
    }

    if (isEditMode) {
      updateDriver(nextDriver)
      window.alert(`Mock driver updated: ${nextDriver.name}`)
    } else {
      addDriver(nextDriver)
      window.alert(`Mock driver added: ${nextDriver.name}`)
    }

    handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
          <DialogDescription>
            Mirror the mobile driver onboarding flow with DL verification, tracking, and document fields.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          <section className="space-y-4 rounded-xl border p-4">
            <h3 className="font-semibold">Driver details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Driver Name *</label>
                <Input value={form.name} onChange={(e) => setField('name', e.target.value)} className="mt-1" placeholder="Ramesh Kumar" />
              </div>
              <div>
                <label className="text-sm font-medium">Date of Birth *</label>
                <Input value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} className="mt-1" placeholder="YYYY-MM-DD" />
              </div>
              <div>
                <label className="text-sm font-medium">DL Number *</label>
                <Input value={form.dlNumber} onChange={(e) => setField('dlNumber', e.target.value.toUpperCase())} className="mt-1" placeholder="MH0420210012345" />
              </div>
              <div>
                <label className="text-sm font-medium">DL Holder Name</label>
                <Input value={form.dlName} onChange={(e) => setField('dlName', e.target.value)} className="mt-1" placeholder="Matches driving license" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number *</label>
                <Input value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} className="mt-1" placeholder="+91 9876543210" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={form.email} onChange={(e) => setField('email', e.target.value)} className="mt-1" placeholder="driver@vendor.com" />
              </div>
              <div>
                <label className="text-sm font-medium">DL Valid Till Date</label>
                <Input value={form.dlValidTillDate} onChange={(e) => setField('dlValidTillDate', e.target.value)} className="mt-1" placeholder="YYYY-MM-DD" />
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.gender}
                  onChange={(e) => setField('gender', e.target.value as Driver['gender'])}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">DL Copy File Name</label>
                <Input value={form.dlCopyFileName} onChange={(e) => setField('dlCopyFileName', e.target.value)} className="mt-1" placeholder="dl.pdf" />
              </div>
              <div>
                <label className="text-sm font-medium">License Classes</label>
                <Input value={form.licenseClasses} onChange={(e) => setField('licenseClasses', e.target.value)} className="mt-1" placeholder="HCV, LCV" />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border p-4">
            <h3 className="font-semibold">Tracking setup</h3>
            {trackingSelections.map((selection, index) => (
              <div key={`${index}-${selection.type}`} className="rounded-lg border bg-muted/20 p-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs font-medium uppercase text-muted-foreground">Type</label>
                    <Input value={selection.type} onChange={(e) => updateTrackingSelection(index, { type: e.target.value })} className="mt-1" />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selection.checked} onChange={(e) => updateTrackingSelection(index, { checked: e.target.checked })} />
                      Enabled
                    </label>
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selection.primarySet} onChange={(e) => updateTrackingSelection(index, { primarySet: e.target.checked })} />
                      Primary
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-4 rounded-xl border p-4">
            <h3 className="font-semibold">Status</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Current Status</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="ACTIVE"
                  disabled
                >
                  <option value="ACTIVE">ACTIVE</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Compliance Status</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="COMPLIANT"
                  disabled
                >
                  <option value="COMPLIANT">COMPLIANT</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">DL Verified</label>
                <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="true" disabled>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">{isEditMode ? 'Save Driver' : 'Add Driver'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
