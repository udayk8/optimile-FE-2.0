import { Save } from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';
import { Button } from '../../../components/Button';
import { ErrorState } from '../../../components/ErrorState';
import { PageHeader } from '../../../components/PageHeader';
import { TyreHealth, TyreInventoryItem, TyreInventoryStatus, Vehicle } from '../../../types';
import { FormErrors, toTyre, tyreValuesFromItem, TyreFormValues, validateTyre } from './tyreValidation';

interface TyreInventoryFormPageProps {
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (tyre: TyreInventoryItem) => Promise<void>;
  tyre?: TyreInventoryItem;
  vehicles: Vehicle[];
}

const statuses: TyreInventoryStatus[] = ['Fitted', 'Spare', 'Damaged', 'Retread', 'Scrapped'];
const healthValues: TyreHealth[] = ['Good', 'Watch', 'Critical'];

export function TyreInventoryFormPage({ mode, onCancel, onSubmit, tyre, vehicles }: TyreInventoryFormPageProps) {
  const [values, setValues] = useState<TyreFormValues>(() => tyreValuesFromItem(tyre));
  const [errors, setErrors] = useState<FormErrors<TyreFormValues>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = (field: keyof TyreFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateTyre(values);
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      setSaving(true);
      await onSubmit(toTyre(values, vehicles, tyre));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save tyre.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<Button onClick={onCancel} variant="outline">Cancel</Button>} subtitle="Maintain tyre master, fitment status, lifecycle, and health data." title={mode === 'create' ? 'Add Tyre' : 'Edit Tyre'} />
      {submitError && <ErrorState message={submitError} title="Save failed" />}
      <form className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field error={errors.serialNo} label="Serial Number" onChange={(value) => update('serialNo', value)} value={values.serialNo} />
          <Field error={errors.brand} label="Brand" onChange={(value) => update('brand', value)} value={values.brand} />
          <Field error={errors.size} label="Size" onChange={(value) => update('size', value)} value={values.size} />
          <Select label="Status" onChange={(value) => update('status', value)} value={values.status}>{statuses.map((item) => <option key={item}>{item}</option>)}</Select>
          <Select label="Health" onChange={(value) => update('health', value)} value={values.health}>{healthValues.map((item) => <option key={item}>{item}</option>)}</Select>
          <Select label="Vehicle" onChange={(value) => update('vehicleId', value)} value={values.vehicleId}>
            <option value="">Unassigned</option>
            {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registrationNo}</option>)}
          </Select>
          <Field label="Position" onChange={(value) => update('position', value)} value={values.position} />
          <Field error={errors.purchaseDate} label="Purchase Date" onChange={(value) => update('purchaseDate', value)} type="date" value={values.purchaseDate} />
          <Field error={errors.kmRun} label="KM Run" onChange={(value) => update('kmRun', value)} type="number" value={values.kmRun} />
          <Field error={errors.treadMm} label="Tread MM" onChange={(value) => update('treadMm', value)} type="number" value={values.treadMm} />
          <Field error={errors.pressurePsi} label="Pressure PSI" onChange={(value) => update('pressurePsi', value)} type="number" value={values.pressurePsi} />
          <Field error={errors.retreadCount} label="Retread Count" onChange={(value) => update('retreadCount', value)} type="number" value={values.retreadCount} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onCancel} variant="outline">Cancel</Button>
          <Button disabled={saving} icon={<Save className="h-4 w-4" />} type="submit" variant="accent">{saving ? 'Saving...' : 'Save Tyre'}</Button>
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
