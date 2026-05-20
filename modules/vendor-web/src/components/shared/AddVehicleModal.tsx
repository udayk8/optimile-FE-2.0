import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@vendor/components/ui/dialog'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { useAppStore } from '@vendor/stores/app.store'
import type { ComplianceDocument, Vehicle, VehicleAdditionalDocument, VehicleTrackingSelection } from '@vendor/types'

interface AddVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  initialVehicle?: Vehicle | null
}

type VehicleFormState = {
  registrationNumber: string
  model: string
  engineNumber: string
  chassisNumber: string
  odometerReading: string
  manufacturer: string
  manufactureDate: string
  registrationDate: string
  vehicleType: string
  permitType: string
  capacityKg: string
  capacityCubicMeter: string
  capacityLiters: string
  length: string
  width: string
  height: string
  rcStartDate: string
  rcEndDate: string
  rcFileName: string
  baseLocation: string
  operationalStatus: Vehicle['operationalStatus']
  complianceStatus: Vehicle['complianceStatus']
  gpsDeviceId: string
}

const DEFAULT_FORM: VehicleFormState = {
  registrationNumber: '',
  model: '',
  engineNumber: '',
  chassisNumber: '',
  odometerReading: '',
  manufacturer: '',
  manufactureDate: '',
  registrationDate: '',
  vehicleType: '20ft Container',
  permitType: 'National Permit',
  capacityKg: '',
  capacityCubicMeter: '',
  capacityLiters: '',
  length: '',
  width: '',
  height: '',
  rcStartDate: '',
  rcEndDate: '',
  rcFileName: '',
  baseLocation: 'Mumbai',
  operationalStatus: 'ACTIVE',
  complianceStatus: 'COMPLIANT',
  gpsDeviceId: '',
}

function createComplianceStatus(expiryDate?: string): ComplianceDocument['status'] {
  if (!expiryDate) return 'VALID'
  const expiry = new Date(expiryDate).getTime()
  const now = Date.now()
  const diffDays = (expiry - now) / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return 'EXPIRED'
  if (diffDays < 45) return 'EXPIRING_SOON'
  return 'VALID'
}

function buildVehicleDocuments(
  rcFileName: string,
  rcStartDate: string,
  rcEndDate: string,
  additionalDocuments: VehicleAdditionalDocument[]
): ComplianceDocument[] {
  const documents: ComplianceDocument[] = []

  if (rcFileName) {
    documents.push({
      id: `rc-${Date.now()}`,
      type: 'RC',
      fileName: rcFileName,
      fileUrl: `/docs/${rcFileName}`,
      expiryDate: rcEndDate || rcStartDate || new Date().toISOString().slice(0, 10),
      status: createComplianceStatus(rcEndDate),
      uploadedAt: rcStartDate || new Date().toISOString(),
    })
  }

  additionalDocuments.forEach((doc, index) => {
    documents.push({
      id: `doc-${index}-${Date.now()}`,
      type: doc.type,
      fileName: doc.fileName,
      fileUrl: `/docs/${doc.fileName}`,
      expiryDate: doc.endDate || rcEndDate || new Date().toISOString().slice(0, 10),
      status: createComplianceStatus(doc.endDate || rcEndDate),
      uploadedAt: doc.startDate || new Date().toISOString(),
    })
  })

  return documents
}

export function AddVehicleModal({ isOpen, onClose, initialVehicle }: AddVehicleModalProps) {
  const { addVehicle, updateVehicle } = useAppStore()
  const isEditMode = !!initialVehicle
  const [form, setForm] = useState<VehicleFormState>(DEFAULT_FORM)
  const [trackingSelections, setTrackingSelections] = useState<VehicleTrackingSelection[]>([
    { type: 'GPS Tracking', checked: true, primarySet: true, gpsOption: '', gpsDeviceID: '' },
    { type: 'Manual Tracking', checked: false, primarySet: false, gpsOption: '', gpsDeviceID: '' },
  ])
  const [additionalDocuments, setAdditionalDocuments] = useState<VehicleAdditionalDocument[]>([])

  useEffect(() => {
    if (!isOpen) return
    if (initialVehicle) {
      setForm({
        registrationNumber: initialVehicle.registrationNumber ?? '',
        model: initialVehicle.model ?? '',
        engineNumber: initialVehicle.engineNumber ?? '',
        chassisNumber: initialVehicle.chassisNumber ?? '',
        odometerReading: initialVehicle.odometerReading ?? '',
        manufacturer: initialVehicle.manufacturer ?? '',
        manufactureDate: initialVehicle.manufactureDate ?? '',
        registrationDate: initialVehicle.registrationDate ?? '',
        vehicleType: initialVehicle.vehicleType ?? '20ft Container',
        permitType: initialVehicle.permitType ?? 'National Permit',
        capacityKg: initialVehicle.capacityKg ?? '',
        capacityCubicMeter: initialVehicle.capacityCubicMeter ?? '',
        capacityLiters: initialVehicle.capacityLiters ?? '',
        length: initialVehicle.length ?? '',
        width: initialVehicle.width ?? '',
        height: initialVehicle.height ?? '',
        rcStartDate: initialVehicle.rcStartDate ?? '',
        rcEndDate: initialVehicle.rcEndDate ?? '',
        rcFileName: initialVehicle.rcFileName ?? '',
        baseLocation: initialVehicle.baseLocation ?? 'Mumbai',
        operationalStatus: initialVehicle.operationalStatus,
        complianceStatus: initialVehicle.complianceStatus,
        gpsDeviceId: initialVehicle.gpsDeviceId ?? '',
      })
      setTrackingSelections(
        initialVehicle.trackingSelections ?? [
          { type: 'GPS Tracking', checked: true, primarySet: true, gpsOption: '', gpsDeviceID: initialVehicle.gpsDeviceId ?? '' },
          { type: 'Manual Tracking', checked: false, primarySet: false, gpsOption: '', gpsDeviceID: '' },
        ]
      )
      setAdditionalDocuments(initialVehicle.additionalDocuments ?? [])
    } else {
      setForm(DEFAULT_FORM)
      setTrackingSelections([
        { type: 'GPS Tracking', checked: true, primarySet: true, gpsOption: '', gpsDeviceID: '' },
        { type: 'Manual Tracking', checked: false, primarySet: false, gpsOption: '', gpsDeviceID: '' },
      ])
      setAdditionalDocuments([])
    }
  }, [initialVehicle, isOpen])

  const complianceDocuments = useMemo(
    () => buildVehicleDocuments(form.rcFileName, form.rcStartDate, form.rcEndDate, additionalDocuments),
    [additionalDocuments, form.rcEndDate, form.rcFileName, form.rcStartDate]
  )

  const setField = <K extends keyof VehicleFormState>(key: K, value: VehicleFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateTrackingSelection = (index: number, patch: Partial<VehicleTrackingSelection>) => {
    setTrackingSelections((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  }

  const updateDocument = (index: number, patch: Partial<VehicleAdditionalDocument>) => {
    setAdditionalDocuments((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  }

  const addDocumentRow = () => {
    setAdditionalDocuments((prev) => [...prev, { id: `doc-${Date.now()}`, type: 'Insurance', fileName: '' }])
  }

  const removeDocumentRow = (index: number) => {
    setAdditionalDocuments((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleClose = () => {
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const nextVehicle: Vehicle = {
      id: initialVehicle?.id ?? `VH-${Math.floor(1000 + Math.random() * 9000)}`,
      registrationNumber: form.registrationNumber.toUpperCase(),
      model: form.model,
      engineNumber: form.engineNumber,
      chassisNumber: form.chassisNumber,
      odometerReading: form.odometerReading,
      manufacturer: form.manufacturer,
      manufactureDate: form.manufactureDate,
      registrationDate: form.registrationDate,
      vehicleType: form.vehicleType,
      permitType: form.permitType,
      capacityKg: form.capacityKg,
      capacityCubicMeter: form.capacityCubicMeter,
      capacityLiters: form.capacityLiters,
      length: form.length,
      width: form.width,
      height: form.height,
      rcStartDate: form.rcStartDate,
      rcEndDate: form.rcEndDate,
      rcFileName: form.rcFileName,
      trackingSelections,
      additionalDocuments,
      baseLocation: form.baseLocation,
      operationalStatus: form.operationalStatus,
      complianceStatus: form.complianceStatus,
      gpsDeviceId: form.gpsDeviceId,
      complianceDocuments,
      blackoutDates: initialVehicle?.blackoutDates ?? [],
    }

    if (isEditMode) {
      updateVehicle(nextVehicle)
      window.alert(`Mock vehicle updated: ${nextVehicle.registrationNumber}`)
    } else {
      addVehicle(nextVehicle)
      window.alert(`Mock vehicle added: ${nextVehicle.registrationNumber}`)
    }

    handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
          <DialogDescription>
            Mirror the mobile add-vehicle form with RC, tracking, capacity, and compliance data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          <section className="space-y-4 rounded-xl border p-4">
            <h3 className="font-semibold">Vehicle details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Registration Number *</label>
                <Input value={form.registrationNumber} onChange={(e) => setField('registrationNumber', e.target.value)} placeholder="MH-04-AB-1234" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Vehicle Type *</label>
                <Input value={form.vehicleType} onChange={(e) => setField('vehicleType', e.target.value)} placeholder="20ft Container" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Manufacturer</label>
                <Input value={form.manufacturer} onChange={(e) => setField('manufacturer', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Model</label>
                <Input value={form.model} onChange={(e) => setField('model', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Engine Number</label>
                <Input value={form.engineNumber} onChange={(e) => setField('engineNumber', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Chassis Number</label>
                <Input value={form.chassisNumber} onChange={(e) => setField('chassisNumber', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Odometer Reading</label>
                <Input value={form.odometerReading} onChange={(e) => setField('odometerReading', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Base Location *</label>
                <Input value={form.baseLocation} onChange={(e) => setField('baseLocation', e.target.value)} className="mt-1" />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border p-4">
            <h3 className="font-semibold">Dates, permit, and dimensions</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Manufacture Date</label>
                <Input value={form.manufactureDate} onChange={(e) => setField('manufactureDate', e.target.value)} placeholder="YYYY-MM-DD" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Registration Date</label>
                <Input value={form.registrationDate} onChange={(e) => setField('registrationDate', e.target.value)} placeholder="YYYY-MM-DD" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Permit Type</label>
                <Input value={form.permitType} onChange={(e) => setField('permitType', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">RC Start Date</label>
                <Input value={form.rcStartDate} onChange={(e) => setField('rcStartDate', e.target.value)} placeholder="YYYY-MM-DD" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">RC End Date</label>
                <Input value={form.rcEndDate} onChange={(e) => setField('rcEndDate', e.target.value)} placeholder="YYYY-MM-DD" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">RC File Name</label>
                <Input value={form.rcFileName} onChange={(e) => setField('rcFileName', e.target.value)} placeholder="rc.pdf" className="mt-1" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Capacity Kg</label>
                <Input value={form.capacityKg} onChange={(e) => setField('capacityKg', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Capacity CBM</label>
                <Input value={form.capacityCubicMeter} onChange={(e) => setField('capacityCubicMeter', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Capacity Liters</label>
                <Input value={form.capacityLiters} onChange={(e) => setField('capacityLiters', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Length</label>
                <Input value={form.length} onChange={(e) => setField('length', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Width</label>
                <Input value={form.width} onChange={(e) => setField('width', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Height</label>
                <Input value={form.height} onChange={(e) => setField('height', e.target.value)} className="mt-1" />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border p-4">
            <h3 className="font-semibold">Tracking setup</h3>
            <div className="space-y-4">
              {trackingSelections.map((selection, index) => (
                <div key={`${index}-${selection.type}`} className="rounded-lg border bg-muted/20 p-3">
                  <div className="grid gap-3 md:grid-cols-5">
                    <div>
                      <label className="text-xs font-medium uppercase text-muted-foreground">Type</label>
                      <Input
                        value={selection.type}
                        onChange={(e) => updateTrackingSelection(index, { type: e.target.value })}
                        className="mt-1"
                        placeholder="GPS Tracking"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase text-muted-foreground">GPS Option</label>
                      <Input
                        value={selection.gpsOption ?? ''}
                        onChange={(e) => updateTrackingSelection(index, { gpsOption: e.target.value })}
                        className="mt-1"
                        placeholder="gps-vamosys"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase text-muted-foreground">GPS Device ID</label>
                      <Input
                        value={selection.gpsDeviceID ?? ''}
                        onChange={(e) => updateTrackingSelection(index, { gpsDeviceID: e.target.value })}
                        className="mt-1"
                        placeholder="GPS-001"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selection.checked}
                          onChange={(e) => updateTrackingSelection(index, { checked: e.target.checked })}
                        />
                        Enabled
                      </label>
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selection.primarySet}
                          onChange={(e) => updateTrackingSelection(index, { primarySet: e.target.checked })}
                        />
                        Primary
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">Additional documents</h3>
              <Button type="button" variant="outline" onClick={addDocumentRow}>
                Add document
              </Button>
            </div>
            {additionalDocuments.length === 0 ? (
              <div className="text-sm text-muted-foreground">Add insurance, tax, emission, FC, or permit documents.</div>
            ) : (
              <div className="space-y-3">
                {additionalDocuments.map((doc, index) => (
                  <div key={doc.id} className="rounded-lg border bg-muted/20 p-3">
                    <div className="grid gap-3 md:grid-cols-4">
                      <div>
                        <label className="text-xs font-medium uppercase text-muted-foreground">Type</label>
                        <Input value={doc.type} onChange={(e) => updateDocument(index, { type: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase text-muted-foreground">File name</label>
                        <Input value={doc.fileName} onChange={(e) => updateDocument(index, { fileName: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase text-muted-foreground">Start date</label>
                        <Input value={doc.startDate ?? ''} onChange={(e) => updateDocument(index, { startDate: e.target.value })} className="mt-1" placeholder="YYYY-MM-DD" />
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase text-muted-foreground">End date</label>
                        <Input value={doc.endDate ?? ''} onChange={(e) => updateDocument(index, { endDate: e.target.value })} className="mt-1" placeholder="YYYY-MM-DD" />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button type="button" variant="ghost" onClick={() => removeDocumentRow(index)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-xl border p-4">
            <h3 className="font-semibold">Status</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Operational Status</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.operationalStatus}
                  onChange={(e) => setField('operationalStatus', e.target.value as Vehicle['operationalStatus'])}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Compliance Status</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.complianceStatus}
                  onChange={(e) => setField('complianceStatus', e.target.value as Vehicle['complianceStatus'])}
                >
                  <option value="COMPLIANT">COMPLIANT</option>
                  <option value="EXPIRING_SOON">EXPIRING_SOON</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">{isEditMode ? 'Save Vehicle' : 'Add Vehicle'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
