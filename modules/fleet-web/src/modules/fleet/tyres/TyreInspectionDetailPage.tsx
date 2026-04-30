import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { TyreInspection } from '../../../types';

export function TyreInspectionDetailPage({ inspection, onBack }: { inspection?: TyreInspection; onBack: () => void }) {
  if (!inspection) return <EmptyState description="The requested tyre inspection could not be found." title="Inspection not found" />;
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<Button onClick={onBack} variant="outline">Back</Button>} subtitle={`${inspection.tyreSerialNo} · ${inspection.inspector}`} title="Tyre Inspection Detail" />
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-text">Inspection Result</h2><StatusBadge tone={inspection.status === 'Passed' ? 'success' : inspection.status === 'Watch' ? 'warning' : 'danger'}>{inspection.status}</StatusBadge></div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Info label="Vehicle" value={inspection.vehicleRegistration ?? 'Unassigned'} />
          <Info label="Inspection Date" value={inspection.inspectionDate} />
          <Info label="Pressure" value={`${inspection.pressurePsi} PSI`} />
          <Info label="Tread" value={`${inspection.treadMm} mm`} />
          <Info label="Notes" value={inspection.notes || 'No notes'} />
        </dl>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt><dd className="mt-1 text-sm font-bold text-text">{value}</dd></div>;
}
