import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { TyreJobCard } from '../../../types';

export function TyreJobCardDetailPage({ jobCard, onBack }: { jobCard?: TyreJobCard; onBack: () => void }) {
  if (!jobCard) return <EmptyState description="The requested tyre job card could not be found." title="Job card not found" />;
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<Button onClick={onBack} variant="outline">Back</Button>} subtitle={`${jobCard.tyreSerialNo} · ${jobCard.action}`} title={jobCard.title} />
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-text">Job Card</h2><StatusBadge tone={jobCard.status === 'Completed' ? 'success' : jobCard.status === 'In Progress' ? 'primary' : 'warning'}>{jobCard.status}</StatusBadge></div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Info label="Vehicle" value={jobCard.vehicleRegistration ?? 'Unassigned'} />
          <Info label="Assigned To" value={jobCard.assignedTo} />
          <Info label="Due Date" value={jobCard.dueDate} />
          <Info label="Estimated Cost" value={`Rs ${jobCard.estimatedCost.toLocaleString()}`} />
        </dl>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt><dd className="mt-1 text-sm font-bold text-text">{value}</dd></div>;
}
