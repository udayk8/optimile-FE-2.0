import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@vendor/components/ui/dialog'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { useFleetData } from '@vendor/integration/useFleetData'
import { FileCheck, Upload, X, AlertTriangle } from 'lucide-react'
import type { ComplianceDocument, ComplianceStatus, Vehicle } from '@vendor/types'

interface AddVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  initialVehicle?: Vehicle | null
}

type DocEntry = { fileName: string; referenceNo: string; expiryDate: string }
type VehicleDocs = Record<'RC' | 'Insurance' | 'PUC' | 'FC' | 'NationalPermit', DocEntry>

const DOC_CONFIG: Array<{ key: keyof VehicleDocs; label: string; refPlaceholder: string }> = [
  { key: 'RC', label: 'Registration Certificate (RC)', refPlaceholder: 'RC Number' },
  { key: 'Insurance', label: 'Insurance', refPlaceholder: 'Policy Number' },
  { key: 'PUC', label: 'Pollution Under Control (PUC)', refPlaceholder: 'PUC Number' },
  { key: 'FC', label: 'Fitness Certificate (FC)', refPlaceholder: 'FC Number' },
  { key: 'NationalPermit', label: 'National Permit', refPlaceholder: 'Permit Number' },
]

const EMPTY_DOC: DocEntry = { fileName: '', referenceNo: '', expiryDate: '' }
const DEFAULT_DOCS: VehicleDocs = { RC: { ...EMPTY_DOC }, Insurance: { ...EMPTY_DOC }, PUC: { ...EMPTY_DOC }, FC: { ...EMPTY_DOC }, NationalPermit: { ...EMPTY_DOC } }

const FUEL_TYPES = ['Diesel', 'Petrol', 'CNG', 'EV']
const VEHICLE_TYPES = ['20ft Container', '40ft Container', 'Open Truck', 'Trailer', 'Mini Truck', 'Tanker']
const OPERATIONAL_STATUSES: Array<{ value: Vehicle['operationalStatus']; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
  { value: 'INACTIVE', label: 'Inactive' },
]

function computeDocStatus(expiryDate: string): ComplianceDocument['status'] {
  if (!expiryDate) return 'VALID'
  const daysLeft = (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (daysLeft < 0) return 'EXPIRED'
  if (daysLeft <= 30) return 'EXPIRING_SOON'
  return 'VALID'
}

function computeComplianceStatus(docs: VehicleDocs): ComplianceStatus {
  const entries = Object.values(docs)
  if (entries.some((d) => !d.fileName)) return 'PENDING_DOCS'
  if (entries.some((d) => computeDocStatus(d.expiryDate) === 'EXPIRED')) return 'EXPIRED'
  if (entries.some((d) => computeDocStatus(d.expiryDate) === 'EXPIRING_SOON')) return 'EXPIRING_SOON'
  return 'COMPLIANT'
}

function docsToComplianceDocuments(docs: VehicleDocs): ComplianceDocument[] {
  return (Object.keys(docs) as Array<keyof VehicleDocs>)
    .filter((key) => docs[key].fileName)
    .map((key) => {
      const doc = docs[key]
      return {
        id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: key,
        referenceNo: doc.referenceNo,
        fileName: doc.fileName,
        fileUrl: `/docs/${doc.fileName}`,
        expiryDate: doc.expiryDate,
        status: computeDocStatus(doc.expiryDate),
        uploadedAt: new Date().toISOString(),
      }
    })
}

function complianceDocsToDocs(complianceDocs: ComplianceDocument[]): Partial<VehicleDocs> {
  const result: Partial<VehicleDocs> = {}
  for (const doc of complianceDocs) {
    const key = doc.type as keyof VehicleDocs
    if (DOC_CONFIG.some((c) => c.key === key)) {
      result[key] = { fileName: doc.fileName ?? '', referenceNo: doc.referenceNo ?? '', expiryDate: doc.expiryDate ?? '' }
    }
  }
  return result
}

type VehicleFormState = {
  registrationNumber: string
  vehicleType: string
  manufacturer: string
  model: string
  year: string
  fuelType: string
  engineNumber: string
  chassisNumber: string
  capacityKg: string
  baseLocation: string
  operationalStatus: Vehicle['operationalStatus']
}

const DEFAULT_FORM: VehicleFormState = {
  registrationNumber: '',
  vehicleType: '20ft Container',
  manufacturer: '',
  model: '',
  year: '',
  fuelType: 'Diesel',
  engineNumber: '',
  chassisNumber: '',
  capacityKg: '',
  baseLocation: '',
  operationalStatus: 'ACTIVE',
}

const STATUS_STYLES: Record<ComplianceStatus, string> = {
  COMPLIANT: 'bg-success/10 text-success',
  EXPIRING_SOON: 'bg-warning/10 text-warning',
  EXPIRED: 'bg-danger/10 text-danger',
  PENDING_DOCS: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  COMPLIANT: 'All Documents Uploaded',
  EXPIRING_SOON: 'Documents Expiring Soon',
  EXPIRED: 'Documents Expired',
  PENDING_DOCS: 'Documents Pending',
}

export function AddVehicleModal({ isOpen, onClose, initialVehicle }: AddVehicleModalProps) {
  const { addVehicle, updateVehicle, vehicleTypeOptions } = useFleetData()
  // Embedded: pick from the tenant's vehicle types so the record maps to a real
  // master vehicle type. Standalone: keep the local default list.
  const vehicleTypeChoices = vehicleTypeOptions && vehicleTypeOptions.length ? vehicleTypeOptions : VEHICLE_TYPES
  const isEditMode = !!initialVehicle
  const [form, setForm] = useState<VehicleFormState>(DEFAULT_FORM)
  const [docs, setDocs] = useState<VehicleDocs>(DEFAULT_DOCS)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingUploadKey, setPendingUploadKey] = useState<keyof VehicleDocs | null>(null)

  useEffect(() => {
    if (!isOpen) return
    if (initialVehicle) {
      setForm({
        registrationNumber: initialVehicle.registrationNumber ?? '',
        vehicleType: initialVehicle.vehicleType ?? '20ft Container',
        manufacturer: initialVehicle.manufacturer ?? '',
        model: initialVehicle.model ?? '',
        year: initialVehicle.year ?? initialVehicle.manufactureDate?.slice(0, 4) ?? '',
        fuelType: initialVehicle.fuelType ?? 'Diesel',
        engineNumber: initialVehicle.engineNumber ?? '',
        chassisNumber: initialVehicle.chassisNumber ?? '',
        capacityKg: initialVehicle.capacityKg ?? '',
        baseLocation: initialVehicle.baseLocation ?? '',
        operationalStatus: initialVehicle.operationalStatus,
      })
      const existing = complianceDocsToDocs(initialVehicle.complianceDocuments ?? [])
      setDocs({
        RC: existing.RC ?? (initialVehicle.rcFileName ? { fileName: initialVehicle.rcFileName, referenceNo: '', expiryDate: initialVehicle.rcEndDate ?? '' } : { ...EMPTY_DOC }),
        Insurance: existing.Insurance ?? { ...EMPTY_DOC },
        PUC: existing.PUC ?? { ...EMPTY_DOC },
        FC: existing.FC ?? { ...EMPTY_DOC },
        NationalPermit: existing.NationalPermit ?? { ...EMPTY_DOC },
      })
    } else {
      setForm({ ...DEFAULT_FORM, vehicleType: vehicleTypeChoices[0] ?? DEFAULT_FORM.vehicleType })
      setDocs({ RC: { ...EMPTY_DOC }, Insurance: { ...EMPTY_DOC }, PUC: { ...EMPTY_DOC }, FC: { ...EMPTY_DOC }, NationalPermit: { ...EMPTY_DOC } })
    }
    // vehicleTypeChoices is stable (memoized in the embed adapter / constant standalone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVehicle, isOpen])

  const setField = <K extends keyof VehicleFormState>(key: K, value: VehicleFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setDoc = (key: keyof VehicleDocs, patch: Partial<DocEntry>) =>
    setDocs((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))

  const handleUploadClick = (key: keyof VehicleDocs) => {
    setPendingUploadKey(key)
    if (fileRef.current) { fileRef.current.value = ''; fileRef.current.click() }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !pendingUploadKey) return
    const oneYearFromNow = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
    setDoc(pendingUploadKey, { fileName: file.name, expiryDate: oneYearFromNow })
    setPendingUploadKey(null)
  }

  const removeDoc = (key: keyof VehicleDocs) => setDoc(key, { ...EMPTY_DOC })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const complianceDocuments = docsToComplianceDocuments(docs)
    const complianceStatus = computeComplianceStatus(docs)

    const nextVehicle: Vehicle = {
      id: initialVehicle?.id ?? `VH-${Math.floor(1000 + Math.random() * 9000)}`,
      registrationNumber: form.registrationNumber.toUpperCase(),
      vehicleType: form.vehicleType,
      manufacturer: form.manufacturer,
      model: form.model,
      year: form.year,
      fuelType: form.fuelType,
      engineNumber: form.engineNumber,
      chassisNumber: form.chassisNumber,
      capacityKg: form.capacityKg,
      baseLocation: form.baseLocation,
      operationalStatus: form.operationalStatus,
      complianceStatus,
      complianceDocuments,
      blackoutDates: initialVehicle?.blackoutDates ?? [],
    }

    if (isEditMode) {
      updateVehicle(nextVehicle)
      window.alert(`Vehicle updated: ${nextVehicle.registrationNumber}`)
    } else {
      addVehicle(nextVehicle)
      window.alert(`Vehicle added: ${nextVehicle.registrationNumber}`)
    }
    onClose()
  }

  const complianceStatus = computeComplianceStatus(docs)
  const uploadedCount = Object.values(docs).filter((d) => d.fileName).length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
          <DialogDescription>
            You can upload compliance documents now or after onboarding. The vehicle will be active for dispatch only when all documents are uploaded and valid.
          </DialogDescription>
        </DialogHeader>

        {/* hidden file input shared across all doc upload buttons */}
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Vehicle Details */}
          <section className="space-y-4 rounded-xl border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Vehicle Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Registration Number *</label>
                <Input required value={form.registrationNumber} onChange={(e) => setField('registrationNumber', e.target.value)} placeholder="MH-04-AB-1234" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Vehicle Type *</label>
                <select required className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.vehicleType} onChange={(e) => setField('vehicleType', e.target.value)}>
                  {vehicleTypeChoices.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Make (Manufacturer)</label>
                <Input value={form.manufacturer} onChange={(e) => setField('manufacturer', e.target.value)} placeholder="Tata, Mahindra…" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Model</label>
                <Input value={form.model} onChange={(e) => setField('model', e.target.value)} placeholder="Prima 4928.S" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Year of Manufacture</label>
                <Input value={form.year} onChange={(e) => setField('year', e.target.value)} placeholder="2021" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Fuel Type *</label>
                <select required className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.fuelType} onChange={(e) => setField('fuelType', e.target.value)}>
                  {FUEL_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Engine Number</label>
                <Input value={form.engineNumber} onChange={(e) => setField('engineNumber', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Chassis / VIN</label>
                <Input value={form.chassisNumber} onChange={(e) => setField('chassisNumber', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Capacity (kg)</label>
                <Input value={form.capacityKg} onChange={(e) => setField('capacityKg', e.target.value)} placeholder="15000" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Base Location *</label>
                <Input required value={form.baseLocation} onChange={(e) => setField('baseLocation', e.target.value)} placeholder="Mumbai" className="mt-1" />
              </div>
            </div>
          </section>

          {/* Compliance Documents */}
          <section className="space-y-4 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Compliance Documents</h3>
                <p className="mt-0.5 text-xs text-gray-400">{uploadedCount} of {DOC_CONFIG.length} uploaded</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[complianceStatus]}`}>
                {STATUS_LABELS[complianceStatus]}
              </span>
            </div>
            <div className="space-y-3">
              {DOC_CONFIG.map(({ key, label, refPlaceholder }) => {
                const doc = docs[key]
                const isUploaded = !!doc.fileName
                const docStatus = isUploaded && doc.expiryDate ? computeDocStatus(doc.expiryDate) : null

                return (
                  <div key={key} className={`rounded-lg border p-3 transition-colors ${
                    docStatus === 'EXPIRED' ? 'border-danger/40 bg-danger/5'
                    : docStatus === 'EXPIRING_SOON' ? 'border-warning/40 bg-warning/5'
                    : isUploaded ? 'border-success/40 bg-success/5'
                    : 'border-dashed border-gray-300 bg-gray-50'
                  }`}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">{label}</span>
                      {docStatus === 'EXPIRED' && <span className="text-xs font-semibold text-danger">Expired — blocks dispatch</span>}
                      {docStatus === 'EXPIRING_SOON' && <span className="text-xs font-semibold text-warning">Expiring soon</span>}
                      {!isUploaded && <span className="text-xs text-gray-400">Required</span>}
                    </div>

                    {!isUploaded ? (
                      <button
                        type="button"
                        onClick={() => handleUploadClick(key)}
                        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                      >
                        <Upload className="h-5 w-5 shrink-0 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-600">Click to upload {label}</div>
                          <div className="text-xs text-gray-400">PDF, JPG, PNG</div>
                        </div>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-4 w-4 shrink-0 text-success" />
                            <span className="max-w-[260px] truncate text-sm font-medium text-gray-700">{doc.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => handleUploadClick(key)} className="text-xs text-primary hover:underline">Replace</button>
                            <button type="button" onClick={() => removeDoc(key)} className="text-gray-400 hover:text-danger">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <div>
                            <label className="text-xs text-gray-500">Reference No. (from document)</label>
                            <Input value={doc.referenceNo} onChange={(e) => setDoc(key, { referenceNo: e.target.value })} placeholder={refPlaceholder} className="mt-1 h-8 text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Expiry date (confirm from document)</label>
                            <Input type="date" value={doc.expiryDate} onChange={(e) => setDoc(key, { expiryDate: e.target.value })} className="mt-1 h-8 text-sm" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {uploadedCount < DOC_CONFIG.length && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Vehicle will be saved but will not be eligible for dispatch until all {DOC_CONFIG.length} documents are uploaded.</span>
              </div>
            )}
          </section>

          {/* Operational Status */}
          <section className="space-y-4 rounded-xl border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Operational Status</h3>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.operationalStatus} onChange={(e) => setField('operationalStatus', e.target.value as Vehicle['operationalStatus'])}>
                {OPERATIONAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEditMode ? 'Save Vehicle' : 'Add Vehicle'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
