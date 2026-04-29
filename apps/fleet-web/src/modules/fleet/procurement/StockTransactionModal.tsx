import { X } from 'lucide-react';
import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { useFleetAuth } from '@shared-auth';
import { Button } from '../../../components/Button';
import { InventoryTransaction, PartInventoryItem, StockInwardSource } from '../../../types';
import { buildPartFromInventoryItem, calculateCurrentStock, getPartId } from './inventoryStock';

type StockTransactionMode = 'inward' | 'adjustment';

interface StockTransactionModalProps {
  inventoryTransactions: InventoryTransaction[];
  mode: StockTransactionMode;
  onClose: () => void;
  onSubmit: (transaction: InventoryTransaction) => Promise<unknown>;
  open: boolean;
  partsInventory: PartInventoryItem[];
  selectedPartId?: string;
}

interface StockTransactionValues {
  adjustmentDirection: 'Increase' | 'Decrease';
  partId: string;
  quantity: string;
  referenceNumber: string;
  remarks: string;
  source: StockInwardSource;
}

type StockTransactionErrors = Partial<Record<keyof StockTransactionValues, string>>;

export function StockTransactionModal({ inventoryTransactions, mode, onClose, onSubmit, open, partsInventory, selectedPartId }: StockTransactionModalProps) {
  const { user } = useFleetAuth();
  const [values, setValues] = useState<StockTransactionValues>(() => ({
    adjustmentDirection: 'Increase',
    partId: selectedPartId ?? '',
    quantity: '',
    referenceNumber: '',
    remarks: '',
    source: 'Purchase',
  }));
  const [errors, setErrors] = useState<StockTransactionErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectedItem = partsInventory.find((part) => getPartId(part) === values.partId);
  const selectedPart = selectedItem ? buildPartFromInventoryItem(selectedItem, inventoryTransactions) : undefined;
  const currentStock = useMemo(() => values.partId ? calculateCurrentStock(values.partId, inventoryTransactions) : 0, [inventoryTransactions, values.partId]);

  if (!open) return null;

  const update = (field: keyof StockTransactionValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(values, selectedItem, currentStock, mode);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedItem) return;

    const quantity = Number(values.quantity);
    const signedQuantity = mode === 'adjustment' && values.adjustmentDirection === 'Decrease' ? -quantity : quantity;
    const transaction: InventoryTransaction = {
      transactionId: `txn-${Date.now()}`,
      partId: getPartId(selectedItem),
      quantity: signedQuantity,
      type: mode === 'inward' && values.source !== 'Adjustment' ? 'INWARD' : 'ADJUSTMENT',
      referenceType: mode === 'inward' ? values.source : 'Adjustment',
      referenceId: values.referenceNumber.trim() || undefined,
      performedBy: user.name,
      timestamp: new Date().toISOString(),
      remarks: values.remarks.trim() || undefined,
    };

    try {
      setSaving(true);
      await onSubmit(transaction);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to record stock transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl animate-in fade-in duration-300" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-text">{mode === 'inward' ? 'Stock Inward' : 'Stock Adjustment'}</h2>
            <p className="mt-1 text-sm text-gray-500">{mode === 'inward' ? 'Record opening stock or restock movement.' : 'Record a correction with a positive or negative stock movement.'}</p>
          </div>
          <button className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitError && <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{submitError}</div>}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Select error={errors.partId} label="Part" onChange={(value) => update('partId', value)} value={values.partId}>
            <option value="">Select part</option>
            {partsInventory.map((part) => {
              const partId = getPartId(part);
              return <option disabled={part.partStatus === 'Inactive'} key={partId} value={partId}>{part.partName} · {part.partNumber}{part.partStatus === 'Inactive' ? ' · Inactive' : ''}</option>;
            })}
          </Select>
          <ReadOnly label="Available Stock" value={selectedPart ? `${selectedPart.currentStock.toLocaleString()} ${selectedPart.unit}` : 'Select part'} />
          <Field error={errors.quantity} label={mode === 'adjustment' ? 'Adjustment Quantity' : 'Quantity'} onChange={(value) => update('quantity', value)} type="number" value={values.quantity} />
          {mode === 'inward' ? (
            <Select label="Source" onChange={(value) => update('source', value as StockInwardSource)} value={values.source}>
              {(['Purchase', 'Manual', 'Adjustment'] as StockInwardSource[]).map((source) => <option key={source}>{source}</option>)}
            </Select>
          ) : (
            <Select label="Adjustment" onChange={(value) => update('adjustmentDirection', value as StockTransactionValues['adjustmentDirection'])} value={values.adjustmentDirection}>
              <option>Increase</option>
              <option>Decrease</option>
            </Select>
          )}
          <Field label="Reference Number" onChange={(value) => update('referenceNumber', value)} value={values.referenceNumber} />
          <Field error={errors.remarks} label="Remarks" onChange={(value) => update('remarks', value)} value={values.remarks} />
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-gray-200 pt-5">
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button disabled={saving} type="submit" variant="accent">{saving ? 'Submitting...' : 'Submit'}</Button>
        </div>
      </form>
    </div>
  );
}

function validate(values: StockTransactionValues, selectedItem: PartInventoryItem | undefined, currentStock: number, mode: StockTransactionMode) {
  const errors: StockTransactionErrors = {};
  const quantity = Number(values.quantity);

  if (!values.partId || !selectedItem) errors.partId = 'Part is required.';
  if (selectedItem?.partStatus === 'Inactive') errors.partId = 'Inactive parts cannot receive stock movements.';
  if (!values.quantity || Number.isNaN(quantity) || quantity <= 0) errors.quantity = 'Quantity must be greater than zero.';
  if (mode === 'adjustment' && values.adjustmentDirection === 'Decrease' && quantity > currentStock) errors.quantity = 'Adjustment cannot reduce stock below zero.';
  if (mode === 'adjustment' && !values.remarks.trim()) errors.remarks = 'Remarks are required for stock adjustments.';

  return errors;
}

function Field({ error, label, onChange, type = 'text', value }: { error?: string; label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return <label className="space-y-1"><span className="text-sm font-semibold text-gray-700">{label}</span><input className={`h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4 ${error ? 'border-danger' : 'border-gray-300'}`} onChange={(event) => onChange(event.target.value)} type={type} value={value} />{error && <span className="text-xs font-semibold text-danger">{error}</span>}</label>;
}

function Select({ children, error, label, onChange, value }: { children: ReactNode; error?: string; label: string; onChange: (value: string) => void; value: string }) {
  return <label className="space-y-1"><span className="text-sm font-semibold text-gray-700">{label}</span><select className={`h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4 ${error ? 'border-danger' : 'border-gray-300'}`} onChange={(event) => onChange(event.target.value)} value={value}>{children}</select>{error && <span className="text-xs font-semibold text-danger">{error}</span>}</label>;
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1"><span className="text-sm font-semibold text-gray-700">{label}</span><div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-text">{value}</div></div>;
}
