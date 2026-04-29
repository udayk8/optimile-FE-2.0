import { AlertTriangle, FileClock } from 'lucide-react';
import { MeterBar } from '../../components/MeterBar';
import { StatusBadge } from '../../components/StatusBadge';
import { FleetDocument, Vehicle } from '../../types';

function collectRiskDocuments(vehicles: Vehicle[]): Array<FleetDocument & { registrationNo: string }> {
  return vehicles
    .flatMap((vehicle) => vehicle.documents.map((document) => ({ ...document, registrationNo: vehicle.registrationNo })))
    .filter((document) => document.status !== 'Valid')
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function DocumentComplianceWidget({ vehicles }: { vehicles: Vehicle[] }) {
  const documents = collectRiskDocuments(vehicles);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-in fade-in duration-300">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Compliance</p>
          <h2 className="text-lg font-bold text-text">Expiring Documents</h2>
        </div>
        <div className="rounded-lg bg-warning/10 p-2 text-warning">
          <FileClock className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-4">
        {documents.map((document) => {
          const progress = Math.max(4, Math.min(100, document.daysRemaining <= 0 ? 100 : ((30 - document.daysRemaining) / 30) * 100));
          const isExpired = document.daysRemaining < 0;

          return (
            <article className="border-l-4 border-l-warning pl-3" key={document.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{document.name}</p>
                  <p className="text-xs text-gray-500">{document.registrationNo}</p>
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-gray-600">
                  {isExpired && <AlertTriangle className="h-3.5 w-3.5" />}
                  <StatusBadge tone={document.status === 'Expired' ? 'danger' : 'warning'}>{isExpired ? `${Math.abs(document.daysRemaining)}d overdue` : `${document.daysRemaining}d left`}</StatusBadge>
                </span>
              </div>
              <MeterBar className="mt-3" tone={isExpired ? 'danger' : 'warning'} value={progress} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
