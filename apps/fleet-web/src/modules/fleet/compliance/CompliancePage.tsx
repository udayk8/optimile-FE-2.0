import { useMemo, useState } from 'react';
import { DataTable, DataTableColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { FilterBar } from '../../../components/FilterBar';
import { LoadingState } from '../../../components/LoadingState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { FleetDocument, Vehicle } from '../../../types';
import { DocumentComplianceWidget } from '../DocumentComplianceWidget';

interface CompliancePageProps {
  error: string | null;
  loading: boolean;
  vehicles: Vehicle[];
}

type ComplianceRow = FleetDocument & { registrationNo: string };

export function CompliancePage({ error, loading, vehicles }: CompliancePageProps) {
  const [query, setQuery] = useState('');
  const documents = useMemo(
    () => vehicles.flatMap((vehicle) => vehicle.documents.map((document) => ({ ...document, registrationNo: vehicle.registrationNo }))),
    [vehicles],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return documents;
    return documents.filter((document) => [document.name, document.registrationNo, document.status, document.expiryDate].join(' ').toLowerCase().includes(normalized));
  }, [documents, query]);
  const blockedVehicles = vehicles.filter((vehicle) => vehicle.documents.some((document) => document.status === 'Expired'));

  if (loading) return <LoadingState label="Loading compliance" />;
  if (error && vehicles.length === 0) return <ErrorState message={error} title="Compliance data unavailable" />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        subtitle="Track document expiry, dispatch blockers, and compliance readiness for fleet assets."
        title="Compliance"
      />
      {error && <ErrorState message={error} title="Showing cached or demo compliance data" />}

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <DocumentComplianceWidget vehicles={vehicles} />
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-secondary">Dispatch Gates</p>
              <h2 className="text-lg font-bold text-text">Blocked Dispatch</h2>
            </div>
            <StatusBadge tone={blockedVehicles.length > 0 ? 'danger' : 'success'}>{`${blockedVehicles.length} blocked`}</StatusBadge>
          </div>
          {blockedVehicles.length === 0 ? (
            <EmptyState description="No vehicles are blocked by expired documents." title="No dispatch blockers" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {blockedVehicles.map((vehicle) => (
                <div className="rounded-xl border border-danger/20 bg-danger/5 p-4" key={vehicle.id}>
                  <p className="font-bold text-text">{vehicle.registrationNo}</p>
                  <p className="mt-1 text-sm text-danger">{vehicle.documents.filter((document) => document.status === 'Expired').length} expired document(s)</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <FilterBar onSearchChange={setQuery} placeholder="Search documents" searchValue={query} />
        </div>
        <DataTable columns={documentColumns} emptyMessage="No compliance documents match your search." getRowKey={(document) => document.id} pageSize={10} rows={filtered} />
      </section>
    </div>
  );
}

const documentColumns: Array<DataTableColumn<ComplianceRow>> = [
  { header: 'Document', key: 'document', render: (document) => <div><p className="font-bold text-text">{document.name}</p><p className="text-xs text-gray-500">{document.registrationNo}</p></div>, sortable: true, sortValue: (document) => document.name },
  { header: 'Expiry', key: 'expiry', render: (document) => document.expiryDate, sortable: true, sortValue: (document) => document.expiryDate },
  { header: 'Days', key: 'days', render: (document) => document.daysRemaining, sortable: true, sortValue: (document) => document.daysRemaining },
  { header: 'Status', key: 'status', render: (document) => <StatusBadge tone={document.status === 'Valid' ? 'success' : document.status === 'Expired' ? 'danger' : 'warning'}>{document.status}</StatusBadge>, sortable: true, sortValue: (document) => document.status },
];
