import { SlidersHorizontal } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { DataTable, DataTableColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { FleetRoute } from '../../../routing/fleetRoutes';
import { FuelEvent, FuelEventStatus, FuelType, Vehicle } from '../../../types';
import { FuelEnergyPanel } from '../FuelEnergyPanel';
import { FuelEventDetailPage } from './FuelEventDetailPage';
import { anomalyTone, defaultFuelFilters, filterFuelEvents, FuelEventFilters, odometerVariance, reconciliationTone } from './fuelFilters';

interface FuelWorkflowPageProps {
  error: string | null;
  fuelEvents: FuelEvent[];
  loading: boolean;
  navigateTo: (path: string) => void;
  route: FleetRoute;
  updateFuelReview: (id: string, decision: 'Approved' | 'Rejected', reviewNote: string) => Promise<FuelEvent | undefined>;
  vehicles: Vehicle[];
}

const anomalyStatuses: Array<FuelEventStatus | 'All'> = ['All', 'Posted', 'Flagged', 'Under Review'];
const fuelTypes: Array<FuelType | 'All'> = ['All', 'Diesel', 'Petrol', 'CNG', 'EV'];

export function FuelWorkflowPage({ error, fuelEvents, loading, navigateTo, route, updateFuelReview, vehicles }: FuelWorkflowPageProps) {
  const [filters, setFilters] = useState<FuelEventFilters>(defaultFuelFilters);
  const basePath = `/${route.section}`;
  const event = route.id ? fuelEvents.find((item) => item.id === route.id) : undefined;
  const isReconciliation = route.section === 'reconciliation';

  const filteredEvents = useMemo(() => {
    const events = filterFuelEvents(fuelEvents, filters);
    if (!isReconciliation) return events;
    return events.filter((item) => (item.reconciliationStatus ?? 'Queued') !== 'Matched' || item.flags.length > 0);
  }, [filters, fuelEvents, isReconciliation]);

  if (loading) return <LoadingState label="Loading fuel events" />;
  if (error && fuelEvents.length === 0) return <ErrorState message={error} title="Fuel data unavailable" />;

  if (route.mode === 'detail') {
    return (
      <FleetAccessGate fallback={<EmptyState description="You do not have permission to review fuel anomalies." title="Review unavailable" />} permission={ACTION_PERMISSIONS.reviewFuel}>
        <FuelEventDetailPage
          event={event}
          mode={isReconciliation ? 'reconciliation' : 'fuel'}
          onBack={() => navigateTo(basePath)}
          onReview={async (decision, note) => {
            if (!event) return;
            await updateFuelReview(event.id, decision, note);
            navigateTo(basePath);
          }}
        />
      </FleetAccessGate>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        subtitle={isReconciliation ? 'Review fuel slips against telematics, receipts, and finance posting readiness.' : 'Monitor fuel validation, anomalies, economy variance, and receipt confidence.'}
        title={isReconciliation ? 'Fuel Reconciliation Queue' : 'Fuel & Energy'}
      />
      {error && <ErrorState message={error} title="Showing cached or demo fuel data" />}

      <FuelFilters filters={filters} onChange={setFilters} vehicles={vehicles} />

      {!isReconciliation && (
        <FuelEnergyPanel fuelEvents={filteredEvents} onEventSelect={(selected) => navigateTo(`${basePath}/${selected.id}`)} />
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-secondary">{isReconciliation ? 'Finance Sync' : 'Fuel Events'}</p>
            <h2 className="text-lg font-bold text-text">{isReconciliation ? 'Reconciliation Queue' : 'Event Register'}</h2>
          </div>
          <div className="rounded-full bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
            {filteredEvents.length} records
          </div>
        </div>
        <DataTable
          columns={columns}
          emptyMessage="No fuel events match the selected filters."
          getRowKey={(item) => item.id}
          onRowClick={(selected) => navigateTo(`${basePath}/${selected.id}`)}
          rows={filteredEvents}
        />
      </section>
    </div>
  );
}

function FuelFilters({ filters, onChange, vehicles }: { filters: FuelEventFilters; onChange: (filters: FuelEventFilters) => void; vehicles: Vehicle[] }) {
  const update = (field: keyof FuelEventFilters, value: string) => onChange({ ...filters, [field]: value });

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-text">Filters</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Select label="Vehicle" onChange={(value) => update('vehicleId', value)} value={filters.vehicleId}>
          <option value="All">All vehicles</option>
          {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registrationNo}</option>)}
        </Select>
        <Select label="Fuel Type" onChange={(value) => update('fuelType', value)} value={filters.fuelType}>
          {fuelTypes.map((type) => <option key={type}>{type}</option>)}
        </Select>
        <Select label="Anomaly Status" onChange={(value) => update('anomalyStatus', value)} value={filters.anomalyStatus}>
          {anomalyStatuses.map((status) => <option key={status}>{status}</option>)}
        </Select>
        <Field label="From" onChange={(value) => update('dateFrom', value)} value={filters.dateFrom} />
        <Field label="To" onChange={(value) => update('dateTo', value)} value={filters.dateTo} />
      </div>
    </section>
  );
}

function Field({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4" onChange={(event) => onChange(event.target.value)} type="date" value={value} />
    </label>
  );
}

function Select({ children, label, onChange, value }: { children: ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <select className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4" onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}

const columns: Array<DataTableColumn<FuelEvent>> = [
  {
    header: 'Fuel Event',
    key: 'event',
    render: (row) => (
      <div>
        <p className="font-bold text-text">{row.vehicleRegistration}</p>
        <p className="text-xs font-semibold text-secondary">{row.pumpLocation} · {row.dateTime}</p>
      </div>
    ),
  },
  {
    header: 'Driver',
    key: 'driver',
    render: (row) => row.driverName,
  },
  {
    header: 'Anomaly',
    key: 'status',
    render: (row) => <StatusBadge tone={anomalyTone(row.status)}>{row.status}</StatusBadge>,
  },
  {
    header: 'Recon',
    key: 'reconciliation',
    render: (row) => <StatusBadge tone={reconciliationTone(row.reconciliationStatus)}>{row.reconciliationStatus ?? 'Queued'}</StatusBadge>,
  },
  {
    align: 'right',
    header: 'Variance',
    key: 'variance',
    render: (row) => `${odometerVariance(row).toFixed(1)}%`,
  },
  {
    align: 'right',
    header: 'Amount',
    key: 'amount',
    render: (row) => `Rs ${row.totalAmount.toLocaleString()}`,
  },
];
