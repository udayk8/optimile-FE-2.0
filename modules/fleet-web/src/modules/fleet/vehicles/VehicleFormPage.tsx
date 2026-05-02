import { AlertTriangle, Ban, Save, Upload, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { Button } from '../../../components/Button';
import { ErrorState } from '../../../components/ErrorState';
import { PageHeader } from '../../../components/PageHeader';
import { DocumentDispatchImpact, DocumentUploadEntry, DriverDocumentConfig, DriverDocumentType, Vehicle, VehicleDocumentConfig, VehicleDocumentType, VehicleStatus } from '../../../types';
import { toVehicle, validateVehicle, valuesFromVehicle, VehicleFormErrors, VehicleFormValues } from './vehicleValidation';

interface VehicleFormPageProps {
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (vehicle: Vehicle) => Promise<void>;
  vehicle?: Vehicle;
}

const statuses: VehicleStatus[] = ['Active', 'Maintenance', 'Inactive'];

const VEHICLE_DOCS: VehicleDocumentConfig[] = [
  { type: 'RC', label: 'Registration Certificate (RC)', alertLeadDays: 60, dispatchImpact: 'Block', hasExpiry: true, renewalCycle: 'As per RTO rules' },
  { type: 'Insurance', label: 'Vehicle Insurance', alertLeadDays: 45, dispatchImpact: 'Block', hasExpiry: true, renewalCycle: 'Annual' },
  { type: 'PUC', label: 'Pollution Under Control (PUC)', alertLeadDays: 30, dispatchImpact: 'Block', hasExpiry: true, renewalCycle: '6 months / Annual' },
  { type: 'FC', label: 'Fitness Certificate (FC)', alertLeadDays: 45, dispatchImpact: 'Block', hasExpiry: true, renewalCycle: 'Annual / 2 years' },
  { type: 'NationalPermit', label: 'National Permit', alertLeadDays: 30, dispatchImpact: 'Block', hasExpiry: true, renewalCycle: 'Annual' },
  { type: 'FASTag', label: 'FASTag', alertLeadDays: 0, dispatchImpact: 'Warn', hasExpiry: false, renewalCycle: 'Recharge-based' },
  { type: 'RoutePermit', label: 'Route Permit', alertLeadDays: 15, dispatchImpact: 'Block', hasExpiry: true, renewalCycle: 'Annual / Trip-specific' },
];

const DRIVER_DOCS: DriverDocumentConfig[] = [
  { type: 'DL', label: 'Driving License (DL)', alertLeadDays: 60, dispatchImpact: 'Block', hasExpiry: true, renewalCycle: 'As per RTO' },
  { type: 'MedicalCertificate', label: 'Medical Certificate', alertLeadDays: 30, dispatchImpact: 'Block', hasExpiry: true, renewalCycle: 'Annual' },
  { type: 'Badge', label: 'Badge / Authorization', alertLeadDays: 30, dispatchImpact: 'Warn', hasExpiry: true, renewalCycle: 'Annual / Company policy' },
  { type: 'PSVBadge', label: 'PSV Badge', alertLeadDays: 30, dispatchImpact: 'Block', hasExpiry: true, renewalCycle: 'As required' },
  { type: 'PoliceVerification', label: 'Police Verification Report', alertLeadDays: 0, dispatchImpact: 'Warn', hasExpiry: false, renewalCycle: 'Company policy' },
  { type: 'Aadhaar', label: 'Aadhaar / Identity Proof', alertLeadDays: 0, dispatchImpact: 'None', hasExpiry: false, renewalCycle: 'KYC / one-time' },
];

export function VehicleFormPage({ mode, onCancel, onSubmit, vehicle }: VehicleFormPageProps) {
  const [values, setValues] = useState<VehicleFormValues>(() => valuesFromVehicle(vehicle));
  const [errors, setErrors] = useState<VehicleFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateValue = (field: keyof VehicleFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const updateVehicleDoc = (type: VehicleDocumentType, entry: DocumentUploadEntry | undefined) => {
    setValues((current) => ({
      ...current,
      vehicleDocs: entry
        ? { ...current.vehicleDocs, [type]: entry }
        : Object.fromEntries(Object.entries(current.vehicleDocs).filter(([k]) => k !== type)),
    }));
  };

  const updateDriverDoc = (type: DriverDocumentType, entry: DocumentUploadEntry | undefined) => {
    setValues((current) => ({
      ...current,
      driverDocs: entry
        ? { ...current.driverDocs, [type]: entry }
        : Object.fromEntries(Object.entries(current.driverDocs).filter(([k]) => k !== type)),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateVehicle(values);
    setErrors(nextErrors);
    setSubmitError(null);

    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSaving(true);
      await onSubmit(toVehicle(values, vehicle));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save vehicle.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={<Button onClick={onCancel} variant="outline">Cancel</Button>}
        subtitle="Maintain vehicle master data used by dispatch, compliance, maintenance, and finance."
        title={mode === 'create' ? 'Add Vehicle' : 'Edit Vehicle'}
      />

      {submitError && <ErrorState message={submitError} title="Save failed" />}

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Basic Details */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field error={errors.registrationNo} label="Registration Number" onChange={(value) => updateValue('registrationNo', value)} value={values.registrationNo} />
            <Field error={errors.make} label="Make" onChange={(value) => updateValue('make', value)} value={values.make} />
            <Field error={errors.model} label="Model" onChange={(value) => updateValue('model', value)} value={values.model} />
            <Field error={errors.year} label="Year" onChange={(value) => updateValue('year', value)} type="number" value={values.year} />
            <label className="space-y-1">
              <span className="text-sm font-semibold text-gray-700">Status</span>
              <select className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4" onChange={(event) => updateValue('status', event.target.value as VehicleStatus)} value={values.status}>
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <Field error={errors.location} label="Base Location" onChange={(value) => updateValue('location', value)} value={values.location} />
            <Field error={errors.utilization} label="Utilization %" onChange={(value) => updateValue('utilization', value)} type="number" value={values.utilization} />
            <Field error={errors.vin} label="VIN" onChange={(value) => updateValue('vin', value)} value={values.vin} />
            <Field error={errors.engineNo} label="Engine Number" onChange={(value) => updateValue('engineNo', value)} value={values.engineNo} />
            <Field error={errors.fuelType} label="Fuel Type" onChange={(value) => updateValue('fuelType', value)} value={values.fuelType} />
            <Field error={errors.capacityKg} label="Capacity KG" onChange={(value) => updateValue('capacityKg', value)} type="number" value={values.capacityKg} />
            <Field error={errors.odometerKm} label="Odometer KM" onChange={(value) => updateValue('odometerKm', value)} type="number" value={values.odometerKm} />
          </div>

          <div className="mt-6 border-t border-gray-200 pt-5">
            <h2 className="text-base font-bold text-text">Driver Assignment</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="Driver Name" onChange={(value) => updateValue('driverName', value)} value={values.driverName} />
              <Field error={errors.driverPhone} label="Driver Phone" onChange={(value) => updateValue('driverPhone', value)} value={values.driverPhone} />
              <Field label="License Number" onChange={(value) => updateValue('driverLicenseNo', value)} value={values.driverLicenseNo} />
            </div>
          </div>
        </div>

        {/* Vehicle Documents */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-text">Vehicle Documents</h2>
              <p className="mt-0.5 text-xs text-gray-500">Upload compliance documents. Expired or missing documents flagged as "Block" will prevent dispatch.</p>
            </div>
          </div>
          <div className="space-y-3">
            {VEHICLE_DOCS.map((config) => (
              <DocumentRow
                config={config}
                entry={values.vehicleDocs[config.type]}
                key={config.type}
                onClear={() => updateVehicleDoc(config.type, undefined)}
                onUpdate={(entry) => updateVehicleDoc(config.type, entry)}
              />
            ))}
          </div>
        </div>

        {/* Driver Documents */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-text">Driver Documents</h2>
            <p className="mt-0.5 text-xs text-gray-500">Upload documents for the assigned driver. Required for dispatch compliance checks.</p>
          </div>
          <div className="space-y-3">
            {DRIVER_DOCS.map((config) => (
              <DocumentRow
                config={config}
                entry={values.driverDocs[config.type as DriverDocumentType]}
                key={config.type}
                onClear={() => updateDriverDoc(config.type as DriverDocumentType, undefined)}
                onUpdate={(entry) => updateDriverDoc(config.type as DriverDocumentType, entry)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pb-6">
          <Button onClick={onCancel} variant="outline">Cancel</Button>
          <Button disabled={saving} icon={<Save className="h-4 w-4" />} type="submit" variant="accent">
            {saving ? 'Saving...' : 'Save Vehicle'}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface DocumentRowProps {
  config: VehicleDocumentConfig | DriverDocumentConfig;
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
        {/* Label + badge */}
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{config.label}</span>
            <DispatchImpactBadge impact={config.dispatchImpact} />
          </div>
          <p className="mt-0.5 text-xs text-gray-400">{config.renewalCycle}{config.alertLeadDays > 0 ? ` · Alert ${config.alertLeadDays}d before expiry` : ''}</p>
        </div>

        {/* Fields */}
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-600">Reference / Doc No.</span>
            <input
              className="h-9 w-44 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4"
              onChange={(e) => updateField('referenceNo', e.target.value)}
              placeholder="e.g. MH12AB1234"
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

          {/* File upload */}
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-600">Document File</span>
            <div className="flex items-center gap-2">
              {entry?.fileName ? (
                <div className="flex h-9 items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 text-xs text-green-700">
                  <span className="max-w-[140px] truncate">{entry.fileName}</span>
                  <button
                    className="text-green-500 hover:text-green-700"
                    onClick={onClear}
                    title="Remove"
                    type="button"
                  >
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
