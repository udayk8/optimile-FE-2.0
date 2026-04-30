import { Edit } from 'lucide-react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { BatteryAsset } from '../../../types';
import { batteryStatusTone } from './batteryValidation';

interface BatteryDetailPageProps {
  battery?: BatteryAsset;
  onBack: () => void;
  onEdit: () => void;
}

export function BatteryDetailPage({ battery, onBack, onEdit }: BatteryDetailPageProps) {
  if (!battery) return <EmptyState description="The requested battery asset could not be found." title="Battery not found" />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        actions={(
          <>
            <Button onClick={onBack} variant="outline">Back</Button>
            <FleetAccessGate permission={ACTION_PERMISSIONS.editBattery}>
              <Button icon={<Edit className="h-4 w-4" />} onClick={onEdit} variant="primary">Edit</Button>
            </FleetAccessGate>
          </>
        )}
        subtitle={`${battery.brand} · ${battery.chemistry}`}
        title={battery.serialNo}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-text">Battery Health</h2>
              <StatusBadge tone={batteryStatusTone(battery.status)}>{battery.status}</StatusBadge>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Info label="Vehicle" value={battery.vehicleRegistration ?? 'Unassigned'} />
              <Info label="Position" value={battery.position ?? 'Not fitted'} />
              <Info label="Capacity" value={`${battery.capacityAh} Ah`} />
              <Info label="Voltage" value={`${battery.voltage} V`} />
              <Info label="Purchase Date" value={battery.purchaseDate} />
              <Info label="Warranty Expiry" value={battery.warrantyExpiryDate} />
              <Info label="Last Inspection" value={battery.lastInspectionDate} />
              <Info label="Replacement Due" value={battery.replacementDueDate} />
            </dl>
          </div>

          <HistoryTable title="Inspection History" rows={battery.inspections.map((item) => [item.inspectedAt, item.inspector, `${item.healthPercent}% · ${item.voltage} V`, item.notes])} />
          <HistoryTable title="Replacement History" rows={battery.replacements.map((item) => [item.replacedAt, item.oldSerialNo, item.newSerialNo, item.reason])} empty="No replacement history captured." />
        </div>

        <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-text">Health Score</h2>
          <p className="mt-5 text-5xl font-extrabold text-text">{battery.healthPercent}%</p>
          <div className="mt-5 h-3 rounded-full bg-gray-100">
            <div className={`h-3 rounded-full ${battery.healthPercent < 45 ? 'bg-danger' : battery.healthPercent < 75 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${battery.healthPercent}%` }} />
          </div>
        </aside>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt><dd className="mt-1 text-sm font-bold text-text">{value}</dd></div>;
}

function HistoryTable({ empty = 'No history captured.', rows, title }: { empty?: string; rows: string[][]; title: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-text">{title}</h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.length === 0 ? <tr><td className="px-4 py-4 text-sm text-gray-500">{empty}</td></tr> : rows.map((row) => (
              <tr key={row.join('|')}>{row.map((cell) => <td className="px-4 py-4 text-sm text-gray-700" key={cell}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
