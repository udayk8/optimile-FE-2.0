import { CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../../components/Button';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { EmptyState } from '../../../components/EmptyState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { FuelEvent } from '../../../types';
import { anomalyTone, odometerVariance, reconciliationTone } from './fuelFilters';

interface FuelEventDetailPageProps {
  event?: FuelEvent;
  mode: 'fuel' | 'reconciliation';
  onBack: () => void;
  onReview: (decision: 'Approved' | 'Rejected', note: string) => Promise<void>;
}

export function FuelEventDetailPage({ event, mode, onBack, onReview }: FuelEventDetailPageProps) {
  const [decision, setDecision] = useState<'Approved' | 'Rejected' | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!event) {
    return <EmptyState description="The requested fuel event could not be found." title="Fuel event not found" />;
  }

  const variance = odometerVariance(event);
  const belowBaseline = event.economyKmpl < event.baselineKmpl * 0.8;

  const submitReview = async () => {
    if (!decision) return;
    setSaving(true);
    await onReview(decision, note.trim() || `${decision} from ${mode === 'reconciliation' ? 'reconciliation' : 'fuel'} review.`);
    setSaving(false);
    setDecision(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        actions={(
          <>
            <Button onClick={onBack} variant="outline">Back</Button>
            <FleetAccessGate permission={ACTION_PERMISSIONS.approveFuelEvent}>
              <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setDecision('Approved')} variant="primary">Approve</Button>
            </FleetAccessGate>
            <FleetAccessGate permission={ACTION_PERMISSIONS.rejectFuelEvent}>
              <Button icon={<XCircle className="h-4 w-4" />} onClick={() => setDecision('Rejected')} variant="outline">Reject</Button>
            </FleetAccessGate>
          </>
        )}
        subtitle={`${event.pumpLocation} · ${event.dateTime}`}
        title={`${event.vehicleRegistration} Fuel Event`}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-text">Event Summary</h2>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={anomalyTone(event.status)}>{event.status}</StatusBadge>
                <StatusBadge tone={reconciliationTone(event.reconciliationStatus)}>{event.reconciliationStatus ?? 'Queued'}</StatusBadge>
              </div>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Info label="Driver" value={event.driverName} />
              <Info label="Fuel Type" value={event.fuelType ?? 'Diesel'} />
              <Info label="Receipt" value={event.receiptReference} />
              <Info label="Amount" value={`Rs ${event.totalAmount.toLocaleString()}`} />
              <Info label="Quantity" value={`${event.quantityLitres} L`} />
              <Info label="Unit Cost" value={`Rs ${event.unitCost.toLocaleString()}`} />
              <Info label="Odometer" value={`${event.odometerKm.toLocaleString()} km`} />
              <Info label="Telematics Odo" value={`${event.telematicsOdometerKm.toLocaleString()} km`} />
            </dl>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-text">Anomaly Review</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Signal label="Odometer Variance" tone={variance > 2 ? 'danger' : 'success'} value={`${variance.toFixed(1)}%`} />
              <Signal label="Fuel Economy" tone={belowBaseline ? 'warning' : 'success'} value={`${event.economyKmpl} km/L`} />
              <Signal label="Baseline" tone="primary" value={`${event.baselineKmpl} km/L`} />
            </div>
            {event.flags.length > 0 && (
              <div className="mt-5 rounded-xl bg-danger/10 p-4">
                <p className="text-sm font-bold text-danger">Flags</p>
                <ul className="mt-2 space-y-1 text-sm font-semibold text-danger">
                  {event.flags.map((flag) => <li key={flag}>{flag}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-text">Review Ledger</h2>
          <dl className="mt-5 space-y-4">
            <Info label="Decision" value={event.reviewDecision ?? 'Pending'} />
            <Info label="Reviewed By" value={event.reviewedBy ?? 'Not reviewed'} />
            <Info label="Reviewed At" value={event.reviewedAt ?? 'Pending'} />
            <Info label="Note" value={event.reviewNote ?? 'No review note captured.'} />
          </dl>
        </aside>
      </section>

      <ConfirmModal
        confirmLabel={saving ? 'Saving...' : decision ?? 'Confirm'}
        description={`Add an optional note before marking this fuel event as ${decision?.toLowerCase()}.`}
        onClose={() => setDecision(null)}
        onConfirm={() => void submitReview()}
        open={Boolean(decision)}
        title={`${decision ?? 'Review'} fuel event`}
      />
      {decision && (
        <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-full max-w-lg px-4">
          <textarea
            className="h-24 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm shadow-2xl outline-none ring-primary/20 focus:border-primary focus:ring-4"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Review note"
            value={note}
          />
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-text">{value}</dd>
    </div>
  );
}

function Signal({ label, tone, value }: { label: string; tone: 'danger' | 'primary' | 'success' | 'warning'; value: string }) {
  const toneClasses = {
    danger: 'bg-danger/10 text-danger',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <div className={`rounded-xl p-4 ${toneClasses[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
