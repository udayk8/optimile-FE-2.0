import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../../components/Button';
import { DataTable, DataTableColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { FilterBar } from '../../../components/FilterBar';
import { LoadingState } from '../../../components/LoadingState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { FleetRoute } from '../../../routing/fleetRoutes';
import { VendorLedgerEntry } from '../../../types';

export function VendorLedgerPage({ error, loading, navigateTo, route, vendorLedger }: { error: string | null; loading: boolean; navigateTo: (path: string) => void; route: FleetRoute; vendorLedger: VendorLedgerEntry[] }) {
  const [searchValue, setSearchValue] = useState('');
  const basePath = `/${route.section}`;
  const vendorId = route.id;
  const grouped = useMemo(() => summarizeVendors(vendorLedger), [vendorLedger]);
  const filtered = useMemo(() => grouped.filter((vendor) => vendor.vendorName.toLowerCase().includes(searchValue.toLowerCase().trim())), [grouped, searchValue]);
  const entries = vendorLedger.filter((entry) => entry.vendorId === vendorId);
  if (loading) return <LoadingState label="Loading vendor ledger" />;
  if (error && vendorLedger.length === 0) return <ErrorState message={error} title="Vendor ledger unavailable" />;
  if (route.mode === 'detail') {
    if (entries.length === 0) return <EmptyState description="No ledger entries found for this vendor." title="Vendor not found" />;
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeader actions={<><Button onClick={() => navigateTo(basePath)} variant="outline">Back</Button><FleetAccessGate permission={ACTION_PERMISSIONS.exportReports}><Button icon={<Download className="h-4 w-4" />} variant="outline">Export</Button></FleetAccessGate></>} subtitle={`${entries.length} invoices`} title={entries[0].vendorName} />
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><DataTable columns={entryColumns} getRowKey={(entry) => entry.id} rows={entries} /></section>
      </div>
    );
  }
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<FleetAccessGate permission={ACTION_PERMISSIONS.exportReports}><Button icon={<Download className="h-4 w-4" />} variant="outline">Export</Button></FleetAccessGate>} subtitle="Review vendor outstanding, disputes, paid invoices, and category exposure." title="Vendor Ledger" />
      {error && <ErrorState message={error} title="Showing cached or demo vendor ledger" />}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4"><FilterBar onSearchChange={setSearchValue} placeholder="Search vendors" searchValue={searchValue} /></div>
        <DataTable columns={summaryColumns} emptyMessage="No vendors match your search." getRowKey={(vendor) => vendor.vendorId} onRowClick={(vendor) => navigateTo(`${basePath}/${vendor.vendorId}`)} rows={filtered} />
      </section>
    </div>
  );
}

function summarizeVendors(entries: VendorLedgerEntry[]) {
  return Object.values(entries.reduce<Record<string, { disputed: number; openAmount: number; paidAmount: number; totalAmount: number; vendorId: string; vendorName: string }>>((acc, entry) => {
    acc[entry.vendorId] ??= { disputed: 0, openAmount: 0, paidAmount: 0, totalAmount: 0, vendorId: entry.vendorId, vendorName: entry.vendorName };
    acc[entry.vendorId].totalAmount += entry.amount;
    acc[entry.vendorId].paidAmount += entry.paidAmount;
    acc[entry.vendorId].openAmount += entry.amount - entry.paidAmount;
    if (entry.status === 'Disputed') acc[entry.vendorId].disputed += 1;
    return acc;
  }, {}));
}

const summaryColumns: Array<DataTableColumn<ReturnType<typeof summarizeVendors>[number]>> = [
  { header: 'Vendor', key: 'vendor', render: (row) => <p className="font-bold text-text">{row.vendorName}</p> },
  { header: 'Open', key: 'open', render: (row) => `Rs ${row.openAmount.toLocaleString()}` },
  { header: 'Paid', key: 'paid', render: (row) => `Rs ${row.paidAmount.toLocaleString()}` },
  { header: 'Disputes', key: 'disputes', render: (row) => <StatusBadge tone={row.disputed > 0 ? 'danger' : 'success'}>{row.disputed > 0 ? `${row.disputed} Open` : 'Clear'}</StatusBadge> },
  { align: 'right', header: 'Total', key: 'total', render: (row) => `Rs ${row.totalAmount.toLocaleString()}` },
];

const entryColumns: Array<DataTableColumn<VendorLedgerEntry>> = [
  { header: 'Invoice', key: 'invoice', render: (row) => <div><p className="font-bold text-text">{row.invoiceNo}</p><p className="text-xs text-gray-500">{row.invoiceDate}</p></div> },
  { header: 'Category', key: 'category', render: (row) => row.category },
  { header: 'Status', key: 'status', render: (row) => <StatusBadge tone={row.status === 'Paid' ? 'success' : row.status === 'Disputed' ? 'danger' : 'warning'}>{row.status}</StatusBadge> },
  { header: 'Paid', key: 'paid', render: (row) => `Rs ${row.paidAmount.toLocaleString()}` },
  { align: 'right', header: 'Amount', key: 'amount', render: (row) => `Rs ${row.amount.toLocaleString()}` },
];
