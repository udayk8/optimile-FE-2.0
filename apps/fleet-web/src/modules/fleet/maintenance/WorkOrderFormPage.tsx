import { AlertTriangle, Save } from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';
import { Button } from '../../../components/Button';
import { ErrorState } from '../../../components/ErrorState';
import { PageHeader } from '../../../components/PageHeader';
import { InventoryTransaction, MaintenanceWorkOrder, PartInventoryItem, Vehicle, WorkOrderStatus } from '../../../types';
import { buildPartFromInventoryItem, getPartId } from '../procurement/inventoryStock';
import { toWorkOrder, validateWorkOrder, valuesFromWorkOrder, WorkOrderFormErrors, WorkOrderFormValues } from './workOrderValidation';

interface WorkOrderFormPageProps {
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (workOrder: MaintenanceWorkOrder) => Promise<void>;
  inventoryTransactions: InventoryTransaction[];
  partsInventory: PartInventoryItem[];
  vehicles: Vehicle[];
  workOrder?: MaintenanceWorkOrder;
}

const priorities: MaintenanceWorkOrder['priority'][] = ['Low', 'Medium', 'High'];
const statuses: WorkOrderStatus[] = ['Open', 'In Progress', 'Pending Inspection', 'Completed'];
const approvalRoles: Array<NonNullable<MaintenanceWorkOrder['approvalRequired']> | ''> = ['', 'Garage Manager', 'Fleet Manager', 'COO'];

export function WorkOrderFormPage({ inventoryTransactions, mode, onCancel, onSubmit, partsInventory, vehicles, workOrder }: WorkOrderFormPageProps) {
  const [values, setValues] = useState<WorkOrderFormValues>(() => valuesFromWorkOrder(workOrder));
  const [errors, setErrors] = useState<WorkOrderFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateValue = (field: keyof WorkOrderFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const selectedItem = partsInventory.find((part) => getPartId(part) === values.partId);
  const selectedPart = selectedItem ? buildPartFromInventoryItem(selectedItem, inventoryTransactions) : undefined;

  const updatePart = (partId: string) => {
    const part = partsInventory.find((item) => getPartId(item) === partId);
    setValues((current) => ({
      ...current,
      partId,
      partName: part?.partName ?? '',
      partNumber: part?.partNumber ?? '',
      partUnitCost: part?.unitCost?.toString() ?? '',
    }));
    setErrors((current) => ({ ...current, partId: undefined, partName: undefined, partNumber: undefined, partUnitCost: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateWorkOrder(values, partsInventory, inventoryTransactions);
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSaving(true);
      await onSubmit(toWorkOrder(values, vehicles, partsInventory, workOrder));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save work order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        actions={<Button onClick={onCancel} variant="outline">Cancel</Button>}
        subtitle="Capture technician assignment, spare usage, status, and approval routing."
        title={mode === 'create' ? 'Create Work Order' : 'Edit Work Order'}
      />

      {submitError && <ErrorState message={submitError} title="Save failed" />}

      <form className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <section>
          <h2 className="text-base font-bold text-text">Work Order Details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SelectField error={errors.vehicleId} label="Vehicle" onChange={(value) => updateValue('vehicleId', value)} value={values.vehicleId}>
              <option value="">Select vehicle</option>
              {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registrationNo} · {vehicle.make} {vehicle.model}</option>)}
            </SelectField>
            <Field error={errors.title} label="Title" onChange={(value) => updateValue('title', value)} value={values.title} />
            <Field error={errors.technician} label="Technician / Bay" onChange={(value) => updateValue('technician', value)} value={values.technician} />
            <Field error={errors.dueDate} label="Due Date" onChange={(value) => updateValue('dueDate', value)} type="date" value={values.dueDate} />
            <Field error={errors.odometerKm} label="Odometer KM" onChange={(value) => updateValue('odometerKm', value)} type="number" value={values.odometerKm} />
            <SelectField label="Priority" onChange={(value) => updateValue('priority', value)} value={values.priority}>
              {priorities.map((priority) => <option key={priority}>{priority}</option>)}
            </SelectField>
            <SelectField label="Status" onChange={(value) => updateValue('status', value)} value={values.status}>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </SelectField>
            <SelectField label="Approval Required" onChange={(value) => updateValue('approvalRequired', value)} value={values.approvalRequired}>
              {approvalRoles.map((role) => <option key={role || 'none'} value={role}>{role || 'Not Required'}</option>)}
            </SelectField>
          </div>
        </section>

        <section className="border-t border-gray-200 pt-5">
          <h2 className="text-base font-bold text-text">Spare Parts Usage</h2>
          {selectedPart && getPartWarning(selectedPart) && <PartWarning message={getPartWarning(selectedPart) ?? ''} />}
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SelectField error={errors.partId} label="Part" onChange={updatePart} value={values.partId}>
              <option value="">Select part</option>
              {partsInventory.map((part) => {
                const partId = getPartId(part);
                const stockPart = buildPartFromInventoryItem(part, inventoryTransactions);
                return <option disabled={stockPart.status === 'Inactive'} key={partId} value={partId}>{part.partName} · {stockPart.currentStock} {stockPart.unit}{stockPart.status === 'Inactive' ? ' · Inactive' : ''}</option>;
              })}
            </SelectField>
            <ReadOnly label="Available Stock" value={selectedPart ? `${selectedPart.currentStock.toLocaleString()} ${selectedPart.unit}` : 'Select part'} />
            <Field error={errors.partQuantity} label="Quantity" onChange={(value) => updateValue('partQuantity', value)} type="number" value={values.partQuantity} />
            <ReadOnly label="Unit Cost" value={`Rs ${(selectedPart?.unitCost ?? Number(values.partUnitCost || 0)).toLocaleString()}`} />
          </div>
        </section>

        <section className="border-t border-gray-200 pt-5">
          <h2 className="text-base font-bold text-text">Cost Summary</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field error={errors.laborCost} label="Labor Cost" onChange={(value) => updateValue('laborCost', value)} type="number" value={values.laborCost} />
            <Field error={errors.taxAmount} label="Tax / Misc Cost" onChange={(value) => updateValue('taxAmount', value)} type="number" value={values.taxAmount} />
            <ComputedCost values={values} />
          </div>
        </section>

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-5">
          <Button onClick={onCancel} variant="outline">Cancel</Button>
          <Button disabled={saving} icon={<Save className="h-4 w-4" />} type="submit" variant="accent">
            {saving ? 'Saving...' : 'Save Work Order'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function getPartWarning(part: ReturnType<typeof buildPartFromInventoryItem>) {
  if (part.status === 'Inactive') return 'This part is inactive and cannot be requested.';
  if (part.currentStock <= 0) return 'This part is out of stock. Restock before issuing it to a work order.';
  if (part.currentStock <= part.minimumStockLevel) return 'This part is at or below minimum stock. Issue only if the repair priority justifies it.';
  return null;
}

function PartWarning({ message }: { message: string }) {
  return <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>;
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

function SelectField({ children, error, label, onChange, value }: { children: ReactNode; error?: string; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <select className={`h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4 ${error ? 'border-danger' : 'border-gray-300'}`} onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
      {error && <span className="text-xs font-semibold text-danger">{error}</span>}
    </label>
  );
}

function ComputedCost({ values }: { values: WorkOrderFormValues }) {
  const total = Number(values.laborCost || 0) + Number(values.taxAmount || 0) + (Number(values.partQuantity || 0) * Number(values.partUnitCost || 0));

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estimated Total</p>
      <p className="mt-1 text-lg font-extrabold text-text">Rs {total.toLocaleString()}</p>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1"><span className="text-sm font-semibold text-gray-700">{label}</span><div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-text">{value}</div></div>;
}
