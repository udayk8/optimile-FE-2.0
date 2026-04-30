import { Save } from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';
import { Button } from '../../../components/Button';
import { ErrorState } from '../../../components/ErrorState';
import { PageHeader } from '../../../components/PageHeader';
import { TyreInventoryItem, TyreJobCard } from '../../../types';
import { FormErrors, JobCardFormValues, toJobCard, validateJobCard } from './tyreValidation';

export function TyreJobCardFormPage({ onCancel, onSubmit, tyres }: { onCancel: () => void; onSubmit: (jobCard: TyreJobCard) => Promise<void>; tyres: TyreInventoryItem[] }) {
  const [values, setValues] = useState<JobCardFormValues>({ action: 'Rotation', assignedTo: '', dueDate: new Date().toISOString().slice(0, 10), estimatedCost: '0', status: 'Open', title: '', tyreId: '' });
  const [errors, setErrors] = useState<FormErrors<JobCardFormValues>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const update = (field: keyof JobCardFormValues, value: string) => { setValues((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })); };
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateJobCard(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try { setSaving(true); await onSubmit(toJobCard(values, tyres)); } catch (error) { setSubmitError(error instanceof Error ? error.message : 'Unable to save job card.'); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<Button onClick={onCancel} variant="outline">Cancel</Button>} subtitle="Create tyre fitment, rotation, repair, retread, or scrap work." title="Create Tyre Job Card" />
      {submitError && <ErrorState message={submitError} title="Save failed" />}
      <form className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Select error={errors.tyreId} label="Tyre" onChange={(value) => update('tyreId', value)} value={values.tyreId}><option value="">Select tyre</option>{tyres.map((tyre) => <option key={tyre.id} value={tyre.id}>{tyre.serialNo}</option>)}</Select>
          <Field error={errors.title} label="Title" onChange={(value) => update('title', value)} value={values.title} />
          <Select label="Action" onChange={(value) => update('action', value)} value={values.action}>{['Fitment', 'Rotation', 'Retread', 'Repair', 'Scrap'].map((action) => <option key={action}>{action}</option>)}</Select>
          <Select label="Status" onChange={(value) => update('status', value)} value={values.status}>{['Open', 'In Progress', 'Completed'].map((status) => <option key={status}>{status}</option>)}</Select>
          <Field error={errors.assignedTo} label="Assigned To" onChange={(value) => update('assignedTo', value)} value={values.assignedTo} />
          <Field error={errors.dueDate} label="Due Date" onChange={(value) => update('dueDate', value)} type="date" value={values.dueDate} />
          <Field error={errors.estimatedCost} label="Estimated Cost" onChange={(value) => update('estimatedCost', value)} type="number" value={values.estimatedCost} />
        </div>
        <div className="mt-6 flex justify-end gap-2"><Button onClick={onCancel} variant="outline">Cancel</Button><Button disabled={saving} icon={<Save className="h-4 w-4" />} type="submit" variant="accent">{saving ? 'Saving...' : 'Save Job Card'}</Button></div>
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
