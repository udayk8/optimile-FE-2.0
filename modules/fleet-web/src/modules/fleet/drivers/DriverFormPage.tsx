import { AlertTriangle, Ban, Save, Upload, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { Button } from '../../../components/Button';
import { ErrorState } from '../../../components/ErrorState';
import { PageHeader } from '../../../components/PageHeader';
import { AssignmentStatus, DocumentDispatchImpact, DocumentUploadEntry, DriverDocumentConfig, DriverDocumentType, FleetDriver } from '../../../types';
import { DriverFormErrors, DriverFormValues, toDriver, validateDriver, valuesFromDriver } from './driverValidation';

interface DriverFormPageProps {
  driver?: FleetDriver;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (driver: FleetDriver) => Promise<void>;
}

const statuses: AssignmentStatus[] = ['Available', 'Assigned', 'On Trip', 'Inactive'];
const coachingStatuses: FleetDriver['coachingStatus'][] = ['None', 'Watch', 'Coaching Required'];

const DRIVER_DOCS: DriverDocumentConfig[] = [
  { type: 'DL', label: 'Driving License (DL)', alertLeadDays: 60, dispatchImpact: 'Block', hasExpiry: true, renewalCycle: 'As per RTO' },
  { type: 'MedicalCertificate', label: 'Medical Certificate', alertLeadDays: 30, dispatchImpact: 'Block', hasExpiry: true, renewalCycle: 'Annual' },
  { type: 'Badge', label: 'Badge / Authorization', alertLeadDays: 30, dispatchImpact: 'Warn', hasExpiry: true, renewalCycle: 'Annual / Company policy' },
  { type: 'PSVBadge', label: 'PSV Badge', alertLeadDays: 30, dispatchImpact: 'Block', hasExpiry: true, renewalCycle: 'Required for passenger/commercial' },
  { type: 'PoliceVerification', label: 'Police Verification Report', alertLeadDays: 0, dispatchImpact: 'Warn', hasExpiry: false, renewalCycle: 'Company policy' },
  { type: 'Aadhaar', label: 'Aadhaar / Identity Proof', alertLeadDays: 0, dispatchImpact: 'None', hasExpiry: false, renewalCycle: 'KYC / one-time' },
];

export function DriverFormPage({ driver, mode, onCancel, onSubmit }: DriverFormPageProps) {
  const [values, setValues] = useState<DriverFormValues>(() => valuesFromDriver(driver));
  const [errors, setErrors] = useState<DriverFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateValue = (field: keyof DriverFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const updateDoc = (type: DriverDocumentType, entry: DocumentUploadEntry | undefined) => {
    setValues((current) => ({
      ...current,
      driverDocs: entry
        ? { ...current.driverDocs, [type]: entry }
        : Object.fromEntries(Object.entries(current.driverDocs).filter(([k]) => k !== type)),
    }));
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateDriver(values);
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSaving(true);
      await onSubmit(toDriver(values, driver));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save driver.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={<Button onClick={onCancel} variant="outline">Cancel</Button>}
        subtitle="Maintain driver readiness, license validity, assignment state, and behavior score."
        title={mode === 'create' ? 'Add Driver' : 'Edit Driver'}
      />

      {submitError && <ErrorState message={submitError} title="Save failed" />}

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Driver details */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field error={errors.name} label="Full Name" onChange={(value) => updateValue('name', value)} value={values.name} />
            <Field error={errors.phone} label="Mobile Number" onChange={(value) => updateValue('phone', value)} value={values.phone} />
            <Field error={errors.baseLocation} label="Base Location" onChange={(value) => updateValue('baseLocation', value)} value={values.baseLocation} />
            <Field error={errors.licenseNo} label="License Number" onChange={(value) => updateValue('licenseNo', value)} value={values.licenseNo} />
            <Field error={errors.licenseClass} label="License Class" onChange={(value) => updateValue('licenseClass', value)} value={values.licenseClass} />
            <Field error={errors.licenseExpiryDate} label="License Expiry" onChange={(value) => updateValue('licenseExpiryDate', value)} type="date" value={values.licenseExpiryDate} />
            <Field error={errors.medicalExpiryDate} label="Medical Expiry" onChange={(value) => updateValue('medicalExpiryDate', value)} type="date" value={values.medicalExpiryDate} />
            <Field error={errors.behaviorScore} label="Behavior Score" onChange={(value) => updateValue('behaviorScore', value)} type="number" value={values.behaviorScore} />
            <SelectField label="Assignment Status" onChange={(value) => updateValue('assignmentStatus', value)} options={statuses} value={values.assignmentStatus} />
            <SelectField label="Coaching Status" onChange={(value) => updateValue('coachingStatus', value)} options={coachingStatuses} value={values.coachingStatus} />
            <Field error={errors.aadhaarMasked} label="Masked Aadhaar" onChange={(value) => updateValue('aadhaarMasked', value)} value={values.aadhaarMasked} />
            <Field error={errors.bankAccountMasked} label="Masked Bank Account" onChange={(value) => updateValue('bankAccountMasked', value)} value={values.bankAccountMasked} />
          </div>
        </div>

        {/* Driver Documents */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-text">Driver Documents</h2>
            <p className="mt-0.5 text-xs text-gray-500">Upload compliance documents. Expired or missing documents flagged as "Blocks Dispatch" will prevent dispatch.</p>
          </div>
          <div className="space-y-3">
            {DRIVER_DOCS.map((config) => (
              <DocumentRow
                config={config}
                entry={values.driverDocs[config.type]}
                key={config.type}
                onClear={() => updateDoc(config.type, undefined)}
                onUpdate={(entry) => updateDoc(config.type, entry)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pb-6">
          <Button onClick={onCancel} variant="outline">Cancel</Button>
          <Button disabled={saving} icon={<Save className="h-4 w-4" />} type="submit" variant="accent">
            {saving ? 'Saving...' : 'Save Driver'}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface DocumentRowProps {
  config: DriverDocumentConfig;
  entry: DocumentUploadEntry | undefined;
  onUpdate: (entry: DocumentUploadEntry) => void;
  onClear: () => void;
}

function DocumentRow({ config, entry, onUpdate, onClear }: DocumentRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    onUpdate({
      referenceNo: entry?.referenceNo ?? '',
      expiryDate: entry?.expiryDate ?? '',
      fileName: file.name,
      fileSize: file.size,
    });
  };

  const updateField = (field: 'referenceNo' | 'expiryDate', value: string) => {
    onUpdate({
      referenceNo: field === 'referenceNo' ? value : (entry?.referenceNo ?? ''),
      expiryDate: field === 'expiryDate' ? value : (entry?.expiryDate ?? ''),
      fileName: entry?.fileName ?? '',
      fileSize: entry?.fileSize ?? 0,
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{config.label}</span>
            <DispatchImpactBadge impact={config.dispatchImpact} />
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {config.renewalCycle}{config.alertLeadDays > 0 ? ` · Alert ${config.alertLeadDays}d before expiry` : ''}
          </p>
        </div>

        <div className="flex flex-1 flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-600">Reference / Doc No.</span>
            <input
              className="h-9 w-44 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4"
              onChange={(e) => updateField('referenceNo', e.target.value)}
              placeholder="e.g. DL-MH-1234"
              type="text"
              value={entry?.referenceNo ?? ''}
            />
          </label>

          {config.hasExpiry && (
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-600">Expiry Date</span>
              <input
                className="h-9 w-40 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4"
                onChange={(e) => updateField('expiryDate', e.target.value)}
                type="date"
                value={entry?.expiryDate ?? ''}
              />
            </label>
          )}

          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-600">Document File</span>
            <div className="flex items-center gap-2">
              {entry?.fileName ? (
                <div className="flex h-9 items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 text-xs text-green-700">
                  <span className="max-w-[140px] truncate">{entry.fileName}</span>
                  <button className="text-green-500 hover:text-green-700" onClick={onClear} title="Remove" type="button">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-white px-3 text-xs font-medium text-gray-500 hover:border-primary hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </button>
              )}
              <input
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                ref={fileInputRef}
                type="file"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DispatchImpactBadge({ impact }: { impact: DocumentDispatchImpact }) {
  if (impact === 'Block') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
        <Ban className="h-3 w-3" /> Blocks Dispatch
      </span>
    );
  }
  if (impact === 'Warn') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
        <AlertTriangle className="h-3 w-3" /> Optional
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
      Soft Validation
    </span>
  );
}

function Field({ error, label, onChange, type = 'text', value }: { error?: string; label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input
        className={`h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4 ${error ? 'border-danger' : 'border-gray-300'}`}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      {error && <span className="text-xs font-semibold text-danger">{error}</span>}
    </label>
  );
}

function SelectField({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <select className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
