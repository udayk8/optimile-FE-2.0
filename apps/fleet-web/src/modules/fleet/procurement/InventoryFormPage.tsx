import { Save } from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';
import { useFleetAuth } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../../components/Button';
import { ErrorState } from '../../../components/ErrorState';
import { PageHeader } from '../../../components/PageHeader';
import { PartInventoryItem, PartStatus } from '../../../types';
import { InventoryFormErrors, InventoryFormValues, toInventoryItem, validateInventoryItem, valuesFromInventoryItem } from './inventoryValidation';

const statuses: PartStatus[] = ['Active', 'Inactive'];

export function InventoryFormPage({ item, mode, onCancel, onSubmit }: { item?: PartInventoryItem; mode: 'create' | 'edit'; onCancel: () => void; onSubmit: (item: PartInventoryItem) => Promise<void> }) {
  const { can } = useFleetAuth();
  const [values, setValues] = useState<InventoryFormValues>(() => valuesFromInventoryItem(item));
  const [errors, setErrors] = useState<InventoryFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const update = (field: keyof InventoryFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateInventoryItem(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      setSaving(true);
      await onSubmit(toInventoryItem(values, item));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save inventory item.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<Button onClick={onCancel} variant="outline">Cancel</Button>} subtitle="Maintain part master data. Stock quantity changes are recorded through stock transactions." title={mode === 'create' ? 'Add Inventory Item' : 'Edit Inventory Item'} />
      {submitError && <ErrorState message={submitError} title="Save failed" />}
      <form className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field error={errors.partName} label="Part Name" onChange={(value) => update('partName', value)} value={values.partName} />
          <Field error={errors.partNumber} label="Part Number" onChange={(value) => update('partNumber', value)} value={values.partNumber} />
          <Field label="Category" onChange={(value) => update('category', value)} value={values.category} />
          <Field error={errors.unit} label="Unit" onChange={(value) => update('unit', value)} value={values.unit} />
          <Field label="Vendor" onChange={(value) => update('vendorName', value)} value={values.vendorName} />
          <Field error={errors.minimumStockLevel} label="Minimum Stock" onChange={(value) => update('minimumStockLevel', value)} type="number" value={values.minimumStockLevel} />
          <Field error={errors.unitCost} label="Unit Cost" onChange={(value) => update('unitCost', value)} type="number" value={values.unitCost} />
          <Select disabled={!can(ACTION_PERMISSIONS.deactivateInventory)} label="Status" onChange={(value) => update('partStatus', value)} value={values.partStatus}>{statuses.map((status) => <option key={status}>{status}</option>)}</Select>
          <ReadOnly label="Current Stock" value={(item?.currentStock ?? item?.stockOnHand ?? 0).toLocaleString()} />
        </div>
        <div className="mt-6 flex justify-end gap-2"><Button onClick={onCancel} variant="outline">Cancel</Button><Button disabled={saving} icon={<Save className="h-4 w-4" />} type="submit" variant="accent">{saving ? 'Saving...' : 'Save Item'}</Button></div>
      </form>
    </div>
  );
}

function Field({ error, label, onChange, type = 'text', value }: { error?: string; label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return <label className="space-y-1"><span className="text-sm font-semibold text-gray-700">{label}</span><input className={`h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4 ${error ? 'border-danger' : 'border-gray-300'}`} onChange={(event) => onChange(event.target.value)} type={type} value={value} />{error && <span className="text-xs font-semibold text-danger">{error}</span>}</label>;
}

function Select({ children, disabled = false, label, onChange, value }: { children: ReactNode; disabled?: boolean; label: string; onChange: (value: string) => void; value: string }) {
  return <label className="space-y-1"><span className="text-sm font-semibold text-gray-700">{label}</span><select className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500" disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}>{children}</select>{disabled && <span className="text-xs font-semibold text-gray-500">Requires deactivate permission.</span>}</label>;
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1"><span className="text-sm font-semibold text-gray-700">{label}</span><div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-text">{value}</div></div>;
}
