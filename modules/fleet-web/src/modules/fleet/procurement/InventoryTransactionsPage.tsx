import { ArrowLeft, ExternalLink, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { Button } from '../../../components/Button';
import { DataTable, DataTableColumn } from '../../../components/DataTable';
import { FilterBar } from '../../../components/FilterBar';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { FleetRoute } from '../../../routing/fleetRoutes';
import { InventoryReferenceType, InventoryTransaction, InventoryTransactionType, MaintenanceWorkOrder, PartInventoryItem } from '../../../types';
import { getPartId } from './inventoryStock';

type TypeFilter = InventoryTransactionType | 'All';
type ReferenceFilter = InventoryReferenceType | 'All';

interface TransactionRow {
  part?: PartInventoryItem;
  transaction: InventoryTransaction;
  workOrder?: MaintenanceWorkOrder;
}

export function InventoryTransactionsPage({ inventoryTransactions, navigateTo, partsInventory, route, workOrders }: { inventoryTransactions: InventoryTransaction[]; navigateTo: (path: string) => void; partsInventory: PartInventoryItem[]; route: FleetRoute; workOrders: MaintenanceWorkOrder[] }) {
  const [searchValue, setSearchValue] = useState(route.id ?? '');
  const [partFilter, setPartFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [referenceFilter, setReferenceFilter] = useState<ReferenceFilter>('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const rows = useMemo<TransactionRow[]>(() => inventoryTransactions.map((transaction) => ({
    part: partsInventory.find((part) => getPartId(part) === transaction.partId),
    transaction,
    workOrder: transaction.referenceType === 'Work Order' ? workOrders.find((workOrder) => workOrder.id === transaction.referenceId) : undefined,
  })).sort((a, b) => b.transaction.timestamp.localeCompare(a.transaction.timestamp)), [inventoryTransactions, partsInventory, workOrders]);
  const filtered = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return rows.filter(({ part, transaction, workOrder }) => {
      const date = transaction.timestamp.slice(0, 10);
      const matchesSearch = !query || [
        transaction.transactionId,
        transaction.referenceId,
        transaction.referenceType,
        transaction.type,
        transaction.performedBy,
        transaction.remarks,
        part?.partName,
        part?.partNumber,
        workOrder?.title,
        workOrder?.vehicleRegistration,
      ].filter(Boolean).some((value) => value?.toLowerCase().includes(query));
      const matchesPart = partFilter === 'All' || transaction.partId === partFilter;
      const matchesType = typeFilter === 'All' || transaction.type === typeFilter;
      const matchesReference = referenceFilter === 'All' || transaction.referenceType === referenceFilter;
      const matchesFrom = !fromDate || date >= fromDate;
      const matchesTo = !toDate || date <= toDate;
      return matchesSearch && matchesPart && matchesType && matchesReference && matchesFrom && matchesTo;
    });
  }, [fromDate, partFilter, referenceFilter, rows, searchValue, toDate, typeFilter]);
  const resetFilters = () => {
    setSearchValue('');
    setPartFilter('All');
    setTypeFilter('All');
    setReferenceFilter('All');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Breadcrumbs items={[{ label: 'Inventory', onClick: () => navigateTo('/inventory') }, { label: route.id ? 'Transaction Context' : 'Transactions' }]} />
      <PageHeader
        actions={<><Button icon={<RotateCcw className="h-4 w-4" />} onClick={resetFilters} variant="outline">Reset</Button><Button icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigateTo('/inventory')} variant="outline">Inventory</Button></>}
        subtitle={route.id ? 'Review the business context for the selected stock movement.' : 'Review every inward, outward, adjustment, return, and reversal stock movement.'}
        title={route.id ? 'Transaction Context' : 'Inventory Transactions'}
      />
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_160px_180px_150px_150px]">
          <FilterBar onSearchChange={setSearchValue} placeholder="Search transactions" searchValue={searchValue} />
          <SelectFilter label="Part" onChange={setPartFilter} value={partFilter}>
            <option value="All">All</option>
            {partsInventory.map((part) => <option key={getPartId(part)} value={getPartId(part)}>{part.partName}</option>)}
          </SelectFilter>
          <SelectFilter label="Type" onChange={(value) => setTypeFilter(value as TypeFilter)} value={typeFilter}>
            {(['All', 'INWARD', 'OUTWARD', 'ADJUSTMENT', 'REVERSAL', 'RETURN'] as TypeFilter[]).map((type) => <option key={type}>{type}</option>)}
          </SelectFilter>
          <SelectFilter label="Reference" onChange={(value) => setReferenceFilter(value as ReferenceFilter)} value={referenceFilter}>
            {(['All', 'Work Order', 'Purchase', 'Manual', 'Adjustment'] as ReferenceFilter[]).map((reference) => <option key={reference}>{reference}</option>)}
          </SelectFilter>
          <DateFilter label="From" onChange={setFromDate} value={fromDate} />
          <DateFilter label="To" onChange={setToDate} value={toDate} />
        </div>
        <DataTable columns={buildColumns(navigateTo)} emptyMessage="No inventory transactions match the selected filters." getRowKey={(row) => row.transaction.transactionId} rows={filtered} />
      </section>
    </div>
  );
}

function buildColumns(navigateTo: (path: string) => void): Array<DataTableColumn<TransactionRow>> {
  return [
    { header: 'Movement', key: 'transaction', render: ({ transaction }) => <div><p className="font-bold text-text">{transactionActionLabel(transaction.type)}</p><p className="text-xs text-gray-500">{formatDateTime(transaction.timestamp)} · {transaction.transactionId}</p></div> },
    { header: 'Part', key: 'part', render: ({ part, transaction }) => <button className="text-left" onClick={() => part && navigateTo(`/inventory/${part.id}`)} type="button"><p className="font-bold text-primary">{part?.partName ?? transaction.partId}</p><p className="text-xs text-gray-500">{part?.partNumber ?? 'Part master missing'}</p></button> },
    { header: 'Action', key: 'type', render: ({ transaction }) => <StatusBadge tone={transactionTone(transaction.type)}>{transactionActionLabel(transaction.type)}</StatusBadge> },
    { align: 'right', header: 'Qty', key: 'quantity', render: ({ transaction }) => <span className="font-bold text-text">{transaction.quantity.toLocaleString()}</span> },
    { header: 'Business Context', key: 'reference', render: ({ transaction, workOrder }) => transaction.referenceType === 'Work Order' && transaction.referenceId ? <button className="inline-flex items-center gap-1 font-bold text-primary" onClick={() => navigateTo(`/maintenance/${transaction.referenceId}`)} type="button">{workOrder?.title ?? 'Work order'}<ExternalLink className="h-3 w-3" /></button> : `${transaction.referenceType}${transaction.referenceId ? ` · ${transaction.referenceId}` : ''}` },
    { header: 'Performed By', key: 'performedBy', render: ({ transaction }) => transaction.performedBy },
    { header: 'Remarks', key: 'remarks', render: ({ transaction }) => transaction.remarks ?? 'None' },
  ];
}

function SelectFilter({ children, label, onChange, value }: { children: ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return <label className="space-y-1"><span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span><select className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4" onChange={(event) => onChange(event.target.value)} value={value}>{children}</select></label>;
}

function DateFilter({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <label className="space-y-1"><span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span><input className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4" onChange={(event) => onChange(event.target.value)} type="date" value={value} /></label>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function transactionTone(type: InventoryTransactionType) {
  if (type === 'INWARD' || type === 'RETURN' || type === 'REVERSAL') return 'success';
  if (type === 'ADJUSTMENT') return 'warning';
  return 'danger';
}

function transactionActionLabel(type: InventoryTransactionType) {
  if (type === 'INWARD') return 'Added';
  if (type === 'OUTWARD') return 'Used';
  if (type === 'ADJUSTMENT') return 'Adjusted';
  if (type === 'RETURN') return 'Returned';
  return 'Reversed';
}
