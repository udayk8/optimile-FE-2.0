import { Save } from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';
import { Button } from '../../../components/Button';
import { ErrorState } from '../../../components/ErrorState';
import { PageHeader } from '../../../components/PageHeader';
import { BatteryAsset, BatteryStatus, Vehicle } from '../../../types';
import { BatteryFormErrors, BatteryFormValues, toBattery, validateBattery, valuesFromBattery } from './batteryValidation';

interface BatteryFormPageProps {
  battery?: BatteryAsset;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (battery: BatteryAsset) => Promise<void>;
  vehicles: Vehicle[];
}

const statuses: BatteryStatus[] = ['Healthy', 'Weak', 'Needs Charge', 'Replace', 'Scrapped'];
const chemistries: BatteryAsset['chemistry'][] = ['Lead Acid', 'AGM', 'Lithium Ion'];

export function BatteryFormPage({ battery, mode, onCancel, onSubmit, vehicles }: BatteryFormPageProps) {
  const [values, setValues] = useState<BatteryFormValues>(() => valuesFromBattery(battery));
  const [errors, setErrors] = useState<BatteryFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = (field: keyof BatteryFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateBattery(values);
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      setSaving(true);
      await onSubmit(toBattery(values, vehicles, battery));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save battery.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<Button onClick={onCancel} variant="outline">Cancel</Button>} subtitle="Maintain battery lifecycle, vehicle assignment, health, warranty, inspection, and replacement planning." title={mode === 'create' ? 'Add Battery' : 'Edit Battery'} />
      {submitError && <ErrorState message={submitError} title="Save failed" />}
      <form className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field error={errors.serialNo} label="Serial Number" onChange={(value) => update('serialNo', value)} value={values.serialNo} />
          <Field error={errors.brand} label="Brand" onChange={(value) => update('brand', value)} value={values.brand} />
          <Select label="Chemistry" onChange={(value) => update('chemistry', value)} value={values.chemistry}>{chemistries.map((item) => <option key={item}>{item}</option>)}</Select>
          <Select label="Status" onChange={(value) => update('status', value)} value={values.status}>{statuses.map((item) => <option key={item}>{item}</option>)}</Select>
          <Select label="Vehicle" onChange={(value) => update('vehicleId', value)} value={values.vehicleId}>
            <option value="">Unassigned</option>
            {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registrationNo}</option>)}
          </Select>
          <Field label="Position" onChange={(value) => update('position', value)} value={values.position} />
          <Field error={errors.capacityAh} label="Capacity Ah" onChange={(value) => update('capacityAh', value)} type="number" value={values.capacityAh} />
          <Field error={errors.voltage} label="Voltage" onChange={(value) => update('voltage', value)} type="number" value={values.voltage} />
          <Field error={errors.healthPercent} label="Health %" onChange={(value) => update('healthPercent', value)} type="number" value={values.healthPercent} />
          <Field error={errors.purchaseDate} label="Purchase Date" onChange={(value) => update('purchaseDate', value)} type="date" value={values.purchaseDate} />
          <Field error={errors.warrantyExpiryDate} label="Warranty Expiry" onChange={(value) => update('warrantyExpiryDate', value)} type="date" value={values.warrantyExpiryDate} />
          <Field error={errors.lastInspectionDate} label="Last Inspection" onChange={(value) => update('lastInspectionDate', value)} type="date" value={values.lastInspectionDate} />
          <Field error={errors.replacementDueDate} label="Replacement Due" onChange={(value) => update('replacementDueDate', value)} type="date" value={values.replacementDueDate} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onCancel} variant="outline">Cancel</Button>
          <Button disabled={saving} icon={<Save className="h-4 w-4" />} type="submit" variant="accent">{saving ? 'Saving...' : 'Save Battery'}</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ error, label, onChange, type = 'text', value }: { error?: string; label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input className={`h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4 ${error ? 'border-danger' : 'border-gray-300'}`} onChange={(event) => onChange(event.target.value)} type={type} value={value} />
      {error && <span className="text-xs font-semibold text-danger">{error}</span>}
    </label>
  );
}

function Select({ children, label, onChange, value }: { children: ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <select className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4" onChange={(event) => onChange(event.target.value)} value={value}>{children}</select>
    </label>
  );
}
