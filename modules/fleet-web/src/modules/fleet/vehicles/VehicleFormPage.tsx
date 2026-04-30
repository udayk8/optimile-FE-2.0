import { Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Button } from '../../../components/Button';
import { ErrorState } from '../../../components/ErrorState';
import { PageHeader } from '../../../components/PageHeader';
import { Vehicle, VehicleStatus } from '../../../types';
import { toVehicle, validateVehicle, valuesFromVehicle, VehicleFormErrors, VehicleFormValues } from './vehicleValidation';

interface VehicleFormPageProps {
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (vehicle: Vehicle) => Promise<void>;
  vehicle?: Vehicle;
}

const statuses: VehicleStatus[] = ['Active', 'Maintenance', 'Inactive'];

export function VehicleFormPage({ mode, onCancel, onSubmit, vehicle }: VehicleFormPageProps) {
  const [values, setValues] = useState<VehicleFormValues>(() => valuesFromVehicle(vehicle));
  const [errors, setErrors] = useState<VehicleFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateValue = (field: keyof VehicleFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
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

      <form className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
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

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onCancel} variant="outline">Cancel</Button>
          <Button disabled={saving} icon={<Save className="h-4 w-4" />} type="submit" variant="accent">
            {saving ? 'Saving...' : 'Save Vehicle'}
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
