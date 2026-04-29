import { Save } from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';
import { Button } from '../../../components/Button';
import { ErrorState } from '../../../components/ErrorState';
import { PageHeader } from '../../../components/PageHeader';
import { TyreInspection, TyreInventoryItem } from '../../../types';
import { FormErrors, InspectionFormValues, toInspection, validateInspection } from './tyreValidation';

interface TyreInspectionFormPageProps {
  onCancel: () => void;
  onSubmit: (inspection: TyreInspection) => Promise<void>;
  tyres: TyreInventoryItem[];
}

const statuses: TyreInspection['status'][] = ['Passed', 'Watch', 'Failed'];

export function TyreInspectionFormPage({ onCancel, onSubmit, tyres }: TyreInspectionFormPageProps) {
  const [values, setValues] = useState<InspectionFormValues>({ inspectionDate: new Date().toISOString().slice(0, 10), inspector: '', notes: '', pressurePsi: '100', status: 'Passed', treadMm: '12', tyreId: '' });
  const [errors, setErrors] = useState<FormErrors<InspectionFormValues>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const update = (field: keyof InspectionFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateInspection(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      setSaving(true);
      await onSubmit(toInspection(values, tyres));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save inspection.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<Button onClick={onCancel} variant="outline">Cancel</Button>} subtitle="Capture tread, pressure, inspector notes, and inspection outcome." title="Create Tyre Inspection" />
      {submitError && <ErrorState message={submitError} title="Save failed" />}
      <form className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Select error={errors.tyreId} label="Tyre" onChange={(value) => update('tyreId', value)} value={values.tyreId}><option value="">Select tyre</option>{tyres.map((tyre) => <option key={tyre.id} value={tyre.id}>{tyre.serialNo}</option>)}</Select>
          <Field error={errors.inspector} label="Inspector" onChange={(value) => update('inspector', value)} value={values.inspector} />
          <Field error={errors.inspectionDate} label="Inspection Date" onChange={(value) => update('inspectionDate', value)} type="date" value={values.inspectionDate} />
          <Field error={errors.pressurePsi} label="Pressure PSI" onChange={(value) => update('pressurePsi', value)} type="number" value={values.pressurePsi} />
          <Field error={errors.treadMm} label="Tread MM" onChange={(value) => update('treadMm', value)} type="number" value={values.treadMm} />
          <Select label="Status" onChange={(value) => update('status', value)} value={values.status}>{statuses.map((status) => <option key={status}>{status}</option>)}</Select>
          <Field label="Notes" onChange={(value) => update('notes', value)} value={values.notes} />
        </div>
        <div className="mt-6 flex justify-end gap-2"><Button onClick={onCancel} variant="outline">Cancel</Button><Button disabled={saving} icon={<Save className="h-4 w-4" />} type="submit" variant="accent">{saving ? 'Saving...' : 'Save Inspection'}</Button></div>
      </form>
    </div>
  );
}

function Field({ error, label, onChange, type = 'text', value }: { error?: string; label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return <label className="space-y-1"><span className="text-sm font-semibold text-gray-700">{label}</span><input className={`h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4 ${error ? 'border-danger' : 'border-gray-300'}`} onChange={(event) => onChange(event.target.value)} type={type} value={value} />{error && <span className="text-xs font-semibold text-danger">{error}</span>}</label>;
}

function Select({ children, error, label, onChange, value }: { children: ReactNode; error?: string; label: string; onChange: (value: string) => void; value: string }) {
  return <label className="space-y-1"><span className="text-sm font-semibold text-gray-700">{label}</span><select className={`h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4 ${error ? 'border-danger' : 'border-gray-300'}`} onChange={(event) => onChange(event.target.value)} value={value}>{children}</select>{error && <span className="text-xs font-semibold text-danger">{error}</span>}</label>;
}
