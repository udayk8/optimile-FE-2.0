import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DataTable, DataTableColumn } from '../../../components/DataTable';
import { ErrorState } from '../../../components/ErrorState';
import { FilterBar } from '../../../components/FilterBar';
import { LoadingState } from '../../../components/LoadingState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { FleetRoute } from '../../../routing/fleetRoutes';
import { FleetAlert } from '../../../types';
import { getAlertSeverity } from '../fleetRelationships';
import { exceptionStatusTone, severityTone } from './alertValidation';
import { ExceptionDetailPage } from './ExceptionDetailPage';

export function ExceptionQueuePage({ alerts, error, loading, navigateTo, resolveException, route }: { alerts: FleetAlert[]; error: string | null; loading: boolean; navigateTo: (path: string) => void; resolveException: (id: string, note: string) => Promise<FleetAlert | undefined>; route: FleetRoute }) {
  const [searchValue, setSearchValue] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const basePath = `/${route.section}`;
  const alert = route.id ? alerts.find((item) => item.id === route.id) : undefined;
  const filtered = useMemo(() => {
    const query = searchValue.toLowerCase().trim();
    return alerts.filter((item) => {
      const severity = getAlertSeverity(item);
      const matchesSearch = !query || [item.title, item.detail, item.source, severity, item.status, item.entityLabel].filter(Boolean).some((value) => value?.toLowerCase().includes(query));
      const matchesSeverity = severityFilter === 'All' || severity === severityFilter;
      const matchesStatus = statusFilter === 'All' || (item.status ?? 'Open') === statusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [alerts, searchValue, severityFilter, statusFilter]);
  if (loading) return <LoadingState label="Loading exceptions" />;
  if (error && alerts.length === 0) return <ErrorState message={error} title="Exception queue unavailable" />;
  if (route.mode === 'detail') return <ExceptionDetailPage alert={alert} onBack={() => navigateTo(basePath)} onNavigateEntity={navigateTo} onResolve={async (note) => { if (alert) await resolveException(alert.id, note); navigateTo(basePath); }} />;
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader subtitle="Prioritize fleet exceptions by source, severity, and resolution status." title="Exception Center" />
      {error && <ErrorState message={error} title="Showing cached or demo exceptions" />}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <FilterBar
            actions={(
              <>
                <SelectFilter label="Severity" onChange={setSeverityFilter} value={severityFilter}>
                  {['All', 'Medium', 'High', 'Critical'].map((status) => <option key={status}>{status}</option>)}
                </SelectFilter>
                <SelectFilter label="Status" onChange={setStatusFilter} value={statusFilter}>
                  {['All', 'Open', 'Resolved'].map((status) => <option key={status}>{status}</option>)}
                </SelectFilter>
              </>
            )}
            onSearchChange={setSearchValue}
            placeholder="Search exceptions"
            searchValue={searchValue}
          />
        </div>
        <DataTable columns={columns} emptyMessage="No exceptions match your search." getRowKey={(item) => item.id} onRowClick={(item) => navigateTo(`${basePath}/${item.id}`)} pageSize={10} rows={filtered} />
      </section>
    </div>
  );
}

const columns: Array<DataTableColumn<FleetAlert>> = [
  { header: 'Exception', key: 'exception', render: (row) => <div><p className="font-bold text-text">{row.title}</p><p className="text-xs text-gray-500">{row.source ?? 'Fleet'} · {row.createdAt ?? 'Open'}</p></div>, sortable: true, sortValue: (row) => row.title },
  { header: 'Severity', key: 'severity', render: (row) => <StatusBadge tone={severityTone(getAlertSeverity(row))}>{getAlertSeverity(row)}</StatusBadge>, sortable: true, sortValue: (row) => getAlertSeverity(row) },
  { header: 'Status', key: 'status', render: (row) => <StatusBadge tone={exceptionStatusTone(row.status)}>{row.status ?? 'Open'}</StatusBadge>, sortable: true, sortValue: (row) => row.status ?? 'Open' },
  { header: 'Entity', key: 'entity', render: (row) => <span>{row.entityLabel}<br /><span className="text-xs text-gray-500">{row.entityType}</span></span>, sortable: true, sortValue: (row) => row.entityLabel },
  { header: 'Owner', key: 'owner', render: (row) => row.assignedTo ?? 'Unassigned', sortable: true, sortValue: (row) => row.assignedTo ?? '' },
  { header: 'Action', key: 'action', render: (row) => row.status === 'Resolved' ? 'Resolved' : 'Open to resolve' },
];

function SelectFilter({ children, label, onChange, value }: { children: ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      <select className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4" onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}
