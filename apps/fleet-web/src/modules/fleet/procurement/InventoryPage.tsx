import { AlertTriangle, Download, Edit, Eye, History, Plus, Send, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { FleetAccessGate } from '@shared-auth';
import { useFleetAuth } from '@shared-auth';
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
import { InventoryStockStatus, InventoryTransaction, MaintenanceWorkOrder, Part, PartInventoryItem, PartStatus } from '../../../types';
import { InventoryDetailPage } from './InventoryDetailPage';
import { InventoryFormPage } from './InventoryFormPage';
import { buildPartFromInventoryItem, getInventoryStockStatus } from './inventoryStock';
import { StockTransactionModal } from './StockTransactionModal';

interface InventoryRow {
  item: PartInventoryItem;
  part: Part;
  stockStatus: InventoryStockStatus;
}

export function InventoryPage({ createPartInventoryItem, error, inventoryTransactions, loading, navigateTo, partsInventory, raisePurchaseRequest, recordInventoryTransaction, route, updatePartInventoryItem, workOrders }: { createPartInventoryItem: (item: PartInventoryItem) => Promise<PartInventoryItem>; error: string | null; inventoryTransactions: InventoryTransaction[]; loading: boolean; navigateTo: (path: string) => void; partsInventory: PartInventoryItem[]; raisePurchaseRequest: (id: string) => Promise<PartInventoryItem | undefined>; recordInventoryTransaction: (transaction: InventoryTransaction) => Promise<InventoryTransaction>; route: FleetRoute; updatePartInventoryItem: (item: PartInventoryItem) => Promise<PartInventoryItem>; workOrders: MaintenanceWorkOrder[] }) {
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState<InventoryStockStatus | 'All'>('All');
  const [transactionMode, setTransactionMode] = useState<'inward' | 'adjustment' | null>(null);
  const { can } = useFleetAuth();
  const basePath = `/${route.section}`;
  const item = route.id ? partsInventory.find((part) => part.id === route.id) : undefined;
  const rows = useMemo<InventoryRow[]>(() => partsInventory.map((inventoryItem) => {
    const part = buildPartFromInventoryItem(inventoryItem, inventoryTransactions);
    return { item: inventoryItem, part, stockStatus: getInventoryStockStatus(part) };
  }), [inventoryTransactions, partsInventory]);
  const categories = useMemo(() => ['All', ...Array.from(new Set(rows.map((row) => row.part.category))).sort()], [rows]);
  const stockSummary = useMemo(() => ({
    inactive: rows.filter((row) => row.stockStatus === 'Inactive').length,
    low: rows.filter((row) => row.stockStatus === 'Low Stock').length,
    out: rows.filter((row) => row.stockStatus === 'Out of Stock').length,
  }), [rows]);
  const filtered = useMemo(() => {
    const query = searchValue.toLowerCase().trim();
    return rows.filter(({ item, part, stockStatus }) => {
      const matchesSearch = !query || [part.partName, part.partNumber, part.category, part.unit, item.vendorName, stockStatus, part.status].filter(Boolean).some((value) => value?.toLowerCase().includes(query));
      const matchesCategory = categoryFilter === 'All' || part.category === categoryFilter;
      const matchesStock = stockFilter === 'All' || stockStatus === stockFilter;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [categoryFilter, rows, searchValue, stockFilter]);
  if (loading) return <LoadingState label="Loading inventory" />;
  if (error && partsInventory.length === 0) return <ErrorState message={error} title="Inventory unavailable" />;
  if (route.mode === 'create') return <FleetAccessGate fallback={<EmptyState description="You do not have permission to create inventory items." title="Create unavailable" />} permission={ACTION_PERMISSIONS.createInventoryItem}><InventoryFormPage mode="create" onCancel={() => navigateTo(basePath)} onSubmit={async (next) => { const created = await createPartInventoryItem(next); navigateTo(`${basePath}/${created.id}`); }} /></FleetAccessGate>;
  if (route.mode === 'edit') return <FleetAccessGate fallback={<EmptyState description="You do not have permission to edit inventory items." title="Edit unavailable" />} permission={ACTION_PERMISSIONS.editInventoryItem}><InventoryFormPage item={item} mode="edit" onCancel={() => navigateTo(item ? `${basePath}/${item.id}` : basePath)} onSubmit={async (next) => { const updated = await updatePartInventoryItem(next); navigateTo(`${basePath}/${updated.id}`); }} /></FleetAccessGate>;
  if (route.mode === 'detail') return <InventoryDetailPage inventoryTransactions={inventoryTransactions} item={item} navigateTo={navigateTo} onAdjustStock={() => setTransactionMode('adjustment')} onBack={() => navigateTo(basePath)} onEdit={() => item && navigateTo(`${basePath}/${item.id}/edit`)} onRaisePR={async () => { if (item) await raisePurchaseRequest(item.id); }} onStockInward={() => setTransactionMode('inward')} recordInventoryTransaction={recordInventoryTransaction} transactionMode={transactionMode} onTransactionModalClose={() => setTransactionMode(null)} partsInventory={partsInventory} workOrders={workOrders} />;
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        actions={<><FleetAccessGate permission={ACTION_PERMISSIONS.exportReports}><Button icon={<Download className="h-4 w-4" />} variant="outline">Export</Button></FleetAccessGate><FleetAccessGate permission={ACTION_PERMISSIONS.viewInventoryTransactions}><Button icon={<History className="h-4 w-4" />} onClick={() => navigateTo('/inventory-transactions')} variant="outline">Transactions</Button></FleetAccessGate><FleetAccessGate permission={ACTION_PERMISSIONS.stockInInventory}><Button icon={<Plus className="h-4 w-4" />} onClick={() => setTransactionMode('inward')} variant="outline">Stock In</Button></FleetAccessGate><FleetAccessGate permission={ACTION_PERMISSIONS.adjustInventory}><Button icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setTransactionMode('adjustment')} variant="outline">Adjust</Button></FleetAccessGate><FleetAccessGate permission={ACTION_PERMISSIONS.createInventoryItem}><Button icon={<Plus className="h-4 w-4" />} onClick={() => navigateTo(`${basePath}/create`)} variant="accent">Add Item</Button></FleetAccessGate></>}
        subtitle="Search, replenish, and raise purchase requests for operational parts stock."
        title="Inventory"
      />
      {error && <ErrorState message={error} title="Showing cached or demo inventory data" />}
      {(stockSummary.out > 0 || stockSummary.low > 0 || stockSummary.inactive > 0) && (
        <section className="grid gap-3 md:grid-cols-3">
          <AlertTile count={stockSummary.out} label="Out of stock" onClick={() => setStockFilter('Out of Stock')} tone="danger" />
          <AlertTile count={stockSummary.low} label="Low stock" onClick={() => setStockFilter('Low Stock')} tone="warning" />
          <AlertTile count={stockSummary.inactive} label="Inactive parts" onClick={() => setStockFilter('Inactive')} tone="neutral" />
        </section>
      )}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
          <FilterBar onSearchChange={setSearchValue} placeholder="Search inventory" searchValue={searchValue} />
          <SelectFilter label="Category" onChange={setCategoryFilter} value={categoryFilter}>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </SelectFilter>
          <SelectFilter label="Stock Status" onChange={(value) => setStockFilter(value as InventoryStockStatus | 'All')} value={stockFilter}>
            {['All', 'In Stock', 'Low Stock', 'Out of Stock', 'Inactive'].map((status) => <option key={status}>{status}</option>)}
          </SelectFilter>
        </div>
        <DataTable columns={buildColumns({ basePath, canEdit: can(ACTION_PERMISSIONS.editInventoryItem), canRaisePr: can(ACTION_PERMISSIONS.raisePurchaseRequest), navigateTo, onRaisePr: raisePurchaseRequest })} emptyMessage="No inventory items match your search." getRowKey={(row) => row.item.id} onRowClick={(row) => navigateTo(`${basePath}/${row.item.id}`)} rows={filtered} />
      </section>
      <StockTransactionModal
        inventoryTransactions={inventoryTransactions}
        key={transactionMode ?? 'closed'}
        mode={transactionMode ?? 'inward'}
        onClose={() => setTransactionMode(null)}
        onSubmit={recordInventoryTransaction}
        open={transactionMode !== null}
        partsInventory={partsInventory}
      />
    </div>
  );
}

function AlertTile({ count, label, onClick, tone }: { count: number; label: string; onClick: () => void; tone: 'danger' | 'warning' | 'neutral' }) {
  const toneClass = tone === 'danger' ? 'border-danger/30 bg-danger/10 text-danger' : tone === 'warning' ? 'border-warning/30 bg-warning/10 text-warning' : 'border-gray-200 bg-gray-50 text-gray-600';
  return (
    <button className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition hover:shadow-sm ${toneClass}`} onClick={onClick} type="button">
      <span className="flex items-center gap-2 text-sm font-bold"><AlertTriangle className="h-4 w-4" />{label}</span>
      <span className="text-lg font-extrabold">{count}</span>
    </button>
  );
}

function buildColumns({ basePath, canEdit, canRaisePr, navigateTo, onRaisePr }: { basePath: string; canEdit: boolean; canRaisePr: boolean; navigateTo: (path: string) => void; onRaisePr: (id: string) => Promise<PartInventoryItem | undefined> }): Array<DataTableColumn<InventoryRow>> {
  return [
    { header: 'Part Name', key: 'part', render: ({ part }) => <div><p className="font-bold text-text">{part.partName}</p><p className="text-xs text-gray-500">{part.partNumber ?? part.partId}</p></div> },
    { header: 'Category', key: 'category', render: ({ part }) => part.category },
    { header: 'Unit', key: 'unit', render: ({ part }) => part.unit },
    { header: 'Current Stock', key: 'currentStock', render: ({ part }) => <span className="font-bold text-text">{part.currentStock.toLocaleString()}</span> },
    { header: 'Minimum Stock', key: 'minimumStock', render: ({ part }) => part.minimumStockLevel.toLocaleString() },
    { header: 'Stock Status', key: 'stockStatus', render: ({ stockStatus }) => <StatusBadge tone={stockStatusTone(stockStatus)}>{stockStatus}</StatusBadge> },
    { header: 'Status', key: 'status', render: ({ part }) => <StatusBadge tone={partStatusTone(part.status)}>{part.status}</StatusBadge> },
    {
      align: 'right',
      header: 'Actions',
      key: 'actions',
      render: ({ item }) => (
        <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
          <Button className="h-9 px-3" icon={<Eye className="h-4 w-4" />} onClick={() => navigateTo(`${basePath}/${item.id}`)} variant="ghost">View</Button>
          {canEdit && <Button className="h-9 px-3" icon={<Edit className="h-4 w-4" />} onClick={() => navigateTo(`${basePath}/${item.id}/edit`)} variant="outline">Edit</Button>}
          {canRaisePr && item.status !== 'PR Raised' && <Button className="h-9 px-3" icon={<Send className="h-4 w-4" />} onClick={() => void onRaisePr(item.id)} variant="outline">PR</Button>}
        </div>
      ),
    },
  ];
}

function SelectFilter({ children, label, onChange, value }: { children: ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      <select className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4" onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}

function stockStatusTone(status: InventoryStockStatus) {
  if (status === 'In Stock') return 'success';
  if (status === 'Low Stock') return 'warning';
  if (status === 'Inactive') return 'neutral';
  return 'danger';
}

function partStatusTone(status: PartStatus) {
  return status === 'Active' ? 'success' : 'neutral';
}
