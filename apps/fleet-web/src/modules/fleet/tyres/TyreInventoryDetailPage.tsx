import { Edit } from 'lucide-react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { TyreInventoryItem } from '../../../types';
import { tyreStatusTone } from './tyreValidation';

interface TyreInventoryDetailPageProps {
  onBack: () => void;
  onEdit: () => void;
  tyre?: TyreInventoryItem;
}

export function TyreInventoryDetailPage({ onBack, onEdit, tyre }: TyreInventoryDetailPageProps) {
  if (!tyre) return <EmptyState description="The requested tyre could not be found." title="Tyre not found" />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        actions={(
          <>
            <Button onClick={onBack} variant="outline">Back</Button>
            <FleetAccessGate permission={ACTION_PERMISSIONS.editTyre}>
              <Button icon={<Edit className="h-4 w-4" />} onClick={onEdit} variant="primary">Edit</Button>
            </FleetAccessGate>
          </>
        )}
        subtitle={`${tyre.brand} · ${tyre.size}`}
        title={tyre.serialNo}
      />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-text">Lifecycle Profile</h2>
            <StatusBadge tone={tyreStatusTone(tyre.status)}>{tyre.status}</StatusBadge>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Info label="Vehicle" value={tyre.vehicleRegistration ?? 'Unassigned'} />
            <Info label="Position" value={tyre.position ?? 'Not fitted'} />
            <Info label="Purchase Date" value={tyre.purchaseDate} />
            <Info label="KM Run" value={`${tyre.kmRun.toLocaleString()} km`} />
            <Info label="Retread Count" value={tyre.retreadCount.toString()} />
            <Info label="Health" value={tyre.health} />
          </dl>
        </div>
        <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-text">Signals</h2>
          <div className="mt-5 space-y-4">
            <Signal label="Tread" value={`${tyre.treadMm} mm`} />
            <Signal label="Pressure" value={`${tyre.pressurePsi} PSI`} />
          </div>
        </aside>
      </section>
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

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-text">{value}</p>
    </div>
  );
}
