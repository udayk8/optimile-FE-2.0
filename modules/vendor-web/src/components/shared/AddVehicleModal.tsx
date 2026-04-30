import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@shared-ui/dialog'
import { Button } from '@shared-ui/button'
import { Input } from '@shared-ui/input'
import { useAppStore } from '@vendor/stores/app.store'
import { Vehicle } from '@vendor/types'

interface AddVehicleModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddVehicleModal({ isOpen, onClose }: AddVehicleModalProps) {
  const { addVehicle } = useAppStore()
  const [registration, setRegistration] = useState('')
  const [vehicleType, setVehicleType] = useState('20ft Container')
  const [baseLocation, setBaseLocation] = useState('Mumbai')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!registration.trim()) {
      newErrors.registration = 'Vehicle registration number is required.'
    } else if (registration.trim().length < 5) {
      newErrors.registration = 'Registration number must be at least 5 characters.'
    }
    if (!baseLocation.trim()) {
      newErrors.baseLocation = 'Base location is required.'
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
    setTouched({ registration: true, baseLocation: true })

    if (Object.keys(newErrors).length > 0) return

    const newVehicle: Vehicle = {
      id: `VH-${Math.floor(1000 + Math.random() * 9000)}`,
      registrationNumber: registration.toUpperCase(),
      vehicleType,
      baseLocation,
      operationalStatus: 'ACTIVE',
      complianceStatus: 'COMPLIANT',
      complianceDocuments: [],
      blackoutDates: []
    }

    addVehicle(newVehicle)
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setRegistration('')
    setBaseLocation('Mumbai')
    setVehicleType('20ft Container')
    setErrors({})
    setTouched({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>
            Register a new vehicle to your fleet.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Registration Number <span className="text-danger">*</span>
            </label>
            <Input 
              placeholder="e.g. MH-04-AB-1234" 
              value={registration} 
              onChange={(e) => setRegistration(e.target.value)}
              onBlur={() => handleBlur('registration')}
              className={touched.registration && errors.registration ? 'border-danger focus-visible:ring-danger/20' : ''}
            />
            {touched.registration && errors.registration && (
              <p className="text-xs text-danger">{errors.registration}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Vehicle Type</label>
            <select 
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm  placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="20ft Container">20ft Container</option>
              <option value="40ft Container">40ft Container</option>
              <option value="Flatbed">Flatbed</option>
              <option value="Tanker">Tanker</option>
              <option value="LCV">LCV</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Base Location <span className="text-danger">*</span>
            </label>
            <Input 
              placeholder="e.g. Mumbai" 
              value={baseLocation} 
              onChange={(e) => setBaseLocation(e.target.value)}
              onBlur={() => handleBlur('baseLocation')}
              className={touched.baseLocation && errors.baseLocation ? 'border-danger focus-visible:ring-danger/20' : ''}
            />
            {touched.baseLocation && errors.baseLocation && (
              <p className="text-xs text-danger">{errors.baseLocation}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit">Add Vehicle</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
