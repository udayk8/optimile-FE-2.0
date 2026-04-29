import { Download, TrendingUp } from 'lucide-react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../../components/Button';
import { DataTable, DataTableColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { FleetRoute } from '../../../routing/fleetRoutes';
import { CostHealthDrilldown, FleetReportMetric } from '../../../types';

export function CostHealthPage({ costDrilldowns, error, loading, navigateTo, reportMetrics, route }: { costDrilldowns: CostHealthDrilldown[]; error: string | null; loading: boolean; navigateTo: (path: string) => void; reportMetrics: FleetReportMetric[]; route: FleetRoute }) {
  const basePath = `/${route.section}`;
  const metric = route.id ? reportMetrics.find((item) => item.id === route.id) : undefined;
  const rows = route.id ? costDrilldowns.filter((item) => item.metricId === route.id) : costDrilldowns;
  if (loading) return <LoadingState label="Loading cost health" />;
  if (error && reportMetrics.length === 0) return <ErrorState message={error} title="Cost health unavailable" />;
  if (route.mode === 'detail') {
    if (!metric) return <EmptyState description="The requested cost report could not be found." title="Report not found" />;
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeader actions={<><Button onClick={() => navigateTo(basePath)} variant="outline">Back</Button><FleetAccessGate permission={ACTION_PERMISSIONS.exportReports}><Button icon={<Download className="h-4 w-4" />} variant="outline">Export</Button></FleetAccessGate></>} subtitle={metric.trend} title={metric.label} />
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><DataTable columns={drilldownColumns} emptyMessage="No drilldowns found for this metric." getRowKey={(item) => item.id} rows={rows} /></section>
      </div>
    );
  }
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<FleetAccessGate permission={ACTION_PERMISSIONS.exportReports}><Button icon={<Download className="h-4 w-4" />} variant="outline">Export</Button></FleetAccessGate>} subtitle="Drill into fuel, maintenance, tyre, compliance, and vendor cost signals." title="Cost Health" />
      {error && <ErrorState message={error} title="Showing cached or demo cost health data" />}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportMetrics.map((metric) => (
          <button className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:bg-gray-50" key={metric.id} onClick={() => navigateTo(`${basePath}/${metric.id}`)} type="button">
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary"><TrendingUp className="h-5 w-5" /></div>
            <p className="text-sm font-bold text-gray-600">{metric.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-text">{metric.value}</p>
            <p className="mt-2 text-xs text-gray-500">{metric.trend}</p>
          </button>
        ))}
      </section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><DataTable columns={drilldownColumns} emptyMessage="No cost drilldowns found." getRowKey={(item) => item.id} rows={costDrilldowns} /></section>
    </div>
  );
}

const drilldownColumns: Array<DataTableColumn<CostHealthDrilldown>> = [
  { header: 'Signal', key: 'signal', render: (row) => <div><p className="font-bold text-text">{row.title}</p><p className="text-xs text-gray-500">{row.recommendation}</p></div> },
  { header: 'Cost Center', key: 'costCenter', render: (row) => row.costCenter },
  { header: 'Status', key: 'status', render: (row) => <StatusBadge tone={row.status === 'Healthy' ? 'success' : row.status === 'Watch' ? 'warning' : 'danger'}>{row.status}</StatusBadge> },
  { header: 'Variance', key: 'variance', render: (row) => `${row.variancePercent}%` },
  { align: 'right', header: 'Amount', key: 'amount', render: (row) => `Rs ${row.amount.toLocaleString()}` },
];
