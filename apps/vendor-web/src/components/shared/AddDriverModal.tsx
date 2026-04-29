import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@shared-ui/dialog'
import { Button } from '@shared-ui/button'
import { Input } from '@shared-ui/input'
import { useAppStore } from '@vendor/stores/app.store'
import { Driver } from '@vendor/types'

interface AddDriverModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddDriverModal({ isOpen, onClose }: AddDriverModalProps) {
  const { addDriver } = useAppStore()
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) {
      newErrors.name = 'Driver name is required.'
    }
    if (!mobile.trim()) {
      newErrors.mobile = 'Mobile number is required.'
    } else if (!/^\+?[\d\s-]{10,}$/.test(mobile.trim())) {
      newErrors.mobile = 'Enter a valid mobile number (at least 10 digits).'
    }
    if (!licenseNumber.trim()) {
      newErrors.licenseNumber = 'License number is required.'
    } else if (licenseNumber.trim().length < 8) {
      newErrors.licenseNumber = 'License number must be at least 8 characters.'
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
    setTouched({ name: true, mobile: true, licenseNumber: true })

    if (Object.keys(newErrors).length > 0) return

    const newDriver: Driver = {
      id: `DR-${Math.floor(1000 + Math.random() * 9000)}`,
      name,
      mobile,
      licenseNumber: licenseNumber.toUpperCase(),
      licenseExpiry: new Date(Date.now() + 31536000000 * 2).toISOString(), // 2 years from now
      licenseClass: ['HCV', 'LCV'],
      complianceStatus: 'COMPLIANT',
      currentStatus: 'ACTIVE',
      complianceDocuments: []
    }

    addDriver(newDriver)
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setName('')
    setMobile('')
    setLicenseNumber('')
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
          <DialogTitle>Add New Driver</DialogTitle>
          <DialogDescription>
            Register a new driver to your fleet.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Driver Name <span className="text-destructive">*</span>
            </label>
            <Input 
              placeholder="e.g. Ramesh Kumar" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleBlur('name')}
              className={touched.name && errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {touched.name && errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Mobile Number <span className="text-destructive">*</span>
            </label>
            <Input 
              placeholder="e.g. +91 9876543210" 
              value={mobile} 
              onChange={(e) => setMobile(e.target.value)}
              onBlur={() => handleBlur('mobile')}
              className={touched.mobile && errors.mobile ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {touched.mobile && errors.mobile && (
              <p className="text-xs text-destructive">{errors.mobile}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              License Number <span className="text-destructive">*</span>
            </label>
            <Input 
              placeholder="e.g. MH0420210012345" 
              value={licenseNumber} 
              onChange={(e) => setLicenseNumber(e.target.value)}
              onBlur={() => handleBlur('licenseNumber')}
              className={touched.licenseNumber && errors.licenseNumber ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {touched.licenseNumber && errors.licenseNumber && (
              <p className="text-xs text-destructive">{errors.licenseNumber}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit">Add Driver</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
