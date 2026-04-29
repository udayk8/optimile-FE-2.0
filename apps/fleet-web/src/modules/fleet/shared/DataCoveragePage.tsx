import { Fuel, MapPinned, ShieldCheck } from 'lucide-react';
import { OperationalDataState } from '../../../types';

export function DataCoveragePage({ telematics, vehiclesCount }: { telematics: OperationalDataState['telematics']; vehiclesCount: number }) {
  const online = telematics.filter((signal) => signal.deviceStatus === 'Online').length;
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-secondary">Ingestion Health</p>
      <h2 className="mt-1 text-lg font-bold text-text">Data Coverage Matrix</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <CoverageCard label="GPS Coverage" value={`${online}/${vehiclesCount}`} icon={MapPinned} />
        <CoverageCard label="Fuel Sensor Feed" value="67%" icon={Fuel} />
        <CoverageCard label="Document Sync" value="100%" icon={ShieldCheck} />
      </div>
    </section>
  );
}

function CoverageCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <article className="rounded-xl bg-gray-50 p-4">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-4 text-2xl font-extrabold text-text">{value}</p>
      <p className="text-sm font-semibold text-gray-600">{label}</p>
    </article>
  );
}
