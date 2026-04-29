import { Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Button } from '../../../components/Button';
import { ErrorState } from '../../../components/ErrorState';
import { PageHeader } from '../../../components/PageHeader';
import { AssignmentStatus, FleetDriver } from '../../../types';
import { DriverFormErrors, DriverFormValues, toDriver, validateDriver, valuesFromDriver } from './driverValidation';

interface DriverFormPageProps {
  driver?: FleetDriver;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (driver: FleetDriver) => Promise<void>;
}

const statuses: AssignmentStatus[] = ['Available', 'Assigned', 'On Trip', 'Inactive'];
const coachingStatuses: FleetDriver['coachingStatus'][] = ['None', 'Watch', 'Coaching Required'];

export function DriverFormPage({ driver, mode, onCancel, onSubmit }: DriverFormPageProps) {
  const [values, setValues] = useState<DriverFormValues>(() => valuesFromDriver(driver));
  const [errors, setErrors] = useState<DriverFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateValue = (field: keyof DriverFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
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

      <form className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
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

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onCancel} variant="outline">Cancel</Button>
          <Button disabled={saving} icon={<Save className="h-4 w-4" />} type="submit" variant="accent">
            {saving ? 'Saving...' : 'Save Driver'}
          </Button>
        </div>
      </form>
    </div>
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
