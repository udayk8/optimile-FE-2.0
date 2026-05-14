import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@vendor/components/ui/dialog'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { useAppStore } from '@vendor/stores/app.store'
import { FileCheck, Upload, X, AlertTriangle } from 'lucide-react'
import type { ComplianceDocument, ComplianceStatus, Driver } from '@vendor/types'

interface AddDriverModalProps {
  isOpen: boolean
  onClose: () => void
  initialDriver?: Driver | null
}

type DocEntry = { fileName: string; referenceNo: string; expiryDate: string }
type DriverDocs = Record<'DL' | 'MedicalCertificate', DocEntry>

const DOC_CONFIG: Array<{ key: keyof DriverDocs; label: string; refPlaceholder: string }> = [
  { key: 'DL', label: 'Driving License (DL)', refPlaceholder: 'DL Number' },
  { key: 'MedicalCertificate', label: 'Medical Certificate', refPlaceholder: 'Certificate Number' },
]

const EMPTY_DOC: DocEntry = { fileName: '', referenceNo: '', expiryDate: '' }
const DEFAULT_DOCS: DriverDocs = { DL: { ...EMPTY_DOC }, MedicalCertificate: { ...EMPTY_DOC } }

const LICENSE_CLASSES = ['HMV', 'HMV Hazmat', 'LMV Transport', 'LMV', 'HCV', 'LCV']

function computeDocStatus(expiryDate: string): ComplianceDocument['status'] {
  if (!expiryDate) return 'VALID'
  const daysLeft = (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (daysLeft < 0) return 'EXPIRED'
  if (daysLeft <= 30) return 'EXPIRING_SOON'
  return 'VALID'
}

function computeComplianceStatus(docs: DriverDocs): ComplianceStatus {
  const entries = Object.values(docs)
  if (entries.some((d) => !d.fileName)) return 'PENDING_DOCS'
  if (entries.some((d) => computeDocStatus(d.expiryDate) === 'EXPIRED')) return 'EXPIRED'
  if (entries.some((d) => computeDocStatus(d.expiryDate) === 'EXPIRING_SOON')) return 'EXPIRING_SOON'
  return 'COMPLIANT'
}

function docsToComplianceDocuments(docs: DriverDocs): ComplianceDocument[] {
  return (Object.keys(docs) as Array<keyof DriverDocs>)
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

function complianceDocsToDocs(complianceDocs: ComplianceDocument[]): Partial<DriverDocs> {
  const result: Partial<DriverDocs> = {}
  for (const doc of complianceDocs) {
    const key = doc.type as keyof DriverDocs
    if (DOC_CONFIG.some((c) => c.key === key)) {
      result[key] = { fileName: doc.fileName ?? '', referenceNo: doc.referenceNo ?? '', expiryDate: doc.expiryDate ?? '' }
    }
  }
  return result
}

type DriverFormState = {
  name: string
  dateOfBirth: string
  mobile: string
  email: string
  gender: Driver['gender'] | ''
  baseLocation: string
  aadhaarMasked: string
  dlNumber: string
  licenseClasses: string
  dlValidTillDate: string
}

const DEFAULT_FORM: DriverFormState = {
  name: '',
  dateOfBirth: '',
  mobile: '',
  email: '',
  gender: '',
  baseLocation: '',
  aadhaarMasked: '',
  dlNumber: '',
  licenseClasses: '',
  dlValidTillDate: '',
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

export function AddDriverModal({ isOpen, onClose, initialDriver }: AddDriverModalProps) {
  const { addDriver, updateDriver } = useAppStore()
  const isEditMode = !!initialDriver
  const [form, setForm] = useState<DriverFormState>(DEFAULT_FORM)
  const [docs, setDocs] = useState<DriverDocs>(DEFAULT_DOCS)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingUploadKey, setPendingUploadKey] = useState<keyof DriverDocs | null>(null)

  useEffect(() => {
    if (!isOpen) return
    if (initialDriver) {
      setForm({
        name: initialDriver.name ?? '',
        dateOfBirth: initialDriver.dateOfBirth ?? '',
        mobile: initialDriver.mobile ?? '',
        email: initialDriver.email ?? '',
        gender: initialDriver.gender ?? '',
        baseLocation: initialDriver.baseLocation ?? '',
        aadhaarMasked: initialDriver.aadhaarMasked ?? '',
        dlNumber: initialDriver.licenseNumber ?? '',
        licenseClasses: initialDriver.licenseClass?.join(', ') ?? '',
        dlValidTillDate: initialDriver.dlValidTillDate ?? initialDriver.licenseExpiry ?? '',
      })
      const existing = complianceDocsToDocs(initialDriver.complianceDocuments ?? [])
      setDocs({
        DL: existing.DL ?? (initialDriver.licenseNumber
          ? { fileName: initialDriver.dlCopyFileName ?? '', referenceNo: initialDriver.licenseNumber, expiryDate: initialDriver.dlValidTillDate ?? initialDriver.licenseExpiry ?? '' }
          : { ...EMPTY_DOC }),
        MedicalCertificate: existing.MedicalCertificate ?? { ...EMPTY_DOC },
      })
    } else {
      setForm(DEFAULT_FORM)
      setDocs({ DL: { ...EMPTY_DOC }, MedicalCertificate: { ...EMPTY_DOC } })
    }
  }, [initialDriver, isOpen])

  const setField = <K extends keyof DriverFormState>(key: K, value: DriverFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setDoc = (key: keyof DriverDocs, patch: Partial<DocEntry>) =>
    setDocs((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))

  const handleUploadClick = (key: keyof DriverDocs) => {
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

  const removeDoc = (key: keyof DriverDocs) => setDoc(key, { ...EMPTY_DOC })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const complianceDocuments = docsToComplianceDocuments(docs)
    const complianceStatus = computeComplianceStatus(docs)
    const licenseExpiry = docs.DL.expiryDate || form.dlValidTillDate || new Date(Date.now() + 2 * 365 * 86400000).toISOString()

    const nextDriver: Driver = {
      id: initialDriver?.id ?? `DR-${Math.floor(1000 + Math.random() * 9000)}`,
      name: form.name,
      mobile: form.mobile,
      licenseNumber: form.dlNumber,
      licenseExpiry,
      licenseClass: form.licenseClasses.split(',').map((v) => v.trim()).filter(Boolean),
      complianceStatus,
      currentStatus: initialDriver?.currentStatus ?? 'ACTIVE',
      complianceDocuments,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender || undefined,
      email: form.email,
      baseLocation: form.baseLocation,
      aadhaarMasked: form.aadhaarMasked,
      dlValidTillDate: form.dlValidTillDate,
      dlVerified: !!docs.DL.fileName,
    }

    if (isEditMode) {
      updateDriver(nextDriver)
      window.alert(`Driver updated: ${nextDriver.name}`)
    } else {
      addDriver(nextDriver)
      window.alert(`Driver added: ${nextDriver.name}`)
    }
    onClose()
  }

  const complianceStatus = computeComplianceStatus(docs)
  const uploadedCount = Object.values(docs).filter((d) => d.fileName).length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Driver' : 'Add Driver'}</DialogTitle>
          <DialogDescription>
            You can upload compliance documents now or after onboarding. The driver will be active for dispatch only when all documents are uploaded and valid.
          </DialogDescription>
        </DialogHeader>

        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Driver Details */}
          <section className="space-y-4 rounded-xl border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Driver Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Full Name *</label>
                <Input required value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Ramesh Kumar" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Date of Birth *</label>
                <Input required type="date" value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number *</label>
                <Input required value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} placeholder="+91 9876543210" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="driver@vendor.com" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.gender} onChange={(e) => setField('gender', e.target.value as Driver['gender'])}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Base Location *</label>
                <Input required value={form.baseLocation} onChange={(e) => setField('baseLocation', e.target.value)} placeholder="Mumbai" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Aadhaar (masked)</label>
                <Input value={form.aadhaarMasked} onChange={(e) => setField('aadhaarMasked', e.target.value)} placeholder="XXXX-XXXX-4821" className="mt-1" />
              </div>
            </div>
          </section>

          {/* License Details */}
          <section className="space-y-4 rounded-xl border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">License Details</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">DL Number *</label>
                <Input required value={form.dlNumber} onChange={(e) => setField('dlNumber', e.target.value.toUpperCase())} placeholder="MH0420210012345" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">License Class *</label>
                <select required className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.licenseClasses.split(',')[0]?.trim() || ''} onChange={(e) => setField('licenseClasses', e.target.value)}>
                  <option value="">Select class</option>
                  {LICENSE_CLASSES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">DL Expiry Date *</label>
                <Input required type="date" value={form.dlValidTillDate} onChange={(e) => setField('dlValidTillDate', e.target.value)} className="mt-1" />
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
                <span>Driver will be saved but will not be eligible for dispatch until both documents are uploaded.</span>
              </div>
            )}
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEditMode ? 'Save Driver' : 'Add Driver'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
