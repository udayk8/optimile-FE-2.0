import { AppPage } from '../../app/navigation';
import { FleetRoute } from '../../routing/fleetRoutes';
import { AlertRule, BatteryAsset, DispatchAssignment, FleetAlert, FleetDriver, FuelEvent, InventoryTransaction, MaintenanceWorkOrder, OperationalDataState, PartInventoryItem, TyreInspection, TyreInventoryItem, TyreJobCard, Vehicle, WorkOrderStatus } from '../../types';
import { DriverReadinessPanel } from './DriverReadinessPanel';
import { LiveFleetVisibilityPanel } from './LiveFleetVisibilityPanel';
import { TyreIntelligenceDashboard } from './TyreIntelligenceDashboard';
import { AlertRulePage } from './alerts/AlertRulePage';
import { ExceptionQueuePage } from './alerts/ExceptionQueuePage';
import { BatteryManagementPage } from './batteries/BatteryManagementPage';
import { CompliancePage } from './compliance/CompliancePage';
import { DispatchConsolePage } from './dispatch/DispatchConsolePage';
import { DriverManagementPage } from './drivers/DriverManagementPage';
import { FuelWorkflowPage } from './fuel/FuelWorkflowPage';
import { MaintenanceManagementPage } from './maintenance/MaintenanceManagementPage';
import { CostHealthPage } from './procurement/CostHealthPage';
import { InventoryPage } from './procurement/InventoryPage';
import { InventoryTransactionsPage } from './procurement/InventoryTransactionsPage';
import { VendorLedgerPage } from './procurement/VendorLedgerPage';
import { TyreInspectionPage } from './tyres/TyreInspectionPage';
import { TyreInventoryPage } from './tyres/TyreInventoryPage';
import { TyreJobCardPage } from './tyres/TyreJobCardPage';
import { VehicleManagementPage } from './vehicles/VehicleManagementPage';
import { BehaviorSignalsPage } from './shared/BehaviorSignalsPage';
import { DataCoveragePage } from './shared/DataCoveragePage';
import { MvpSubModule } from './shared/MvpSubModule';
import { PageFrame } from './shared/PageFrame';

interface FleetSectionPageProps extends OperationalDataState {
  approveWorkOrder: (id: string) => Promise<MaintenanceWorkOrder | undefined>;
  closeWorkOrder: (id: string) => Promise<MaintenanceWorkOrder | undefined>;
  createAlertRule: (rule: AlertRule) => Promise<AlertRule>;
  createBattery: (battery: BatteryAsset) => Promise<BatteryAsset>;
  createDispatchAssignment: (assignment: DispatchAssignment) => Promise<DispatchAssignment>;
  createDriver: (driver: FleetDriver) => Promise<FleetDriver>;
  createPartInventoryItem: (item: PartInventoryItem) => Promise<PartInventoryItem>;
  createTyre: (tyre: TyreInventoryItem) => Promise<TyreInventoryItem>;
  createTyreInspection: (inspection: TyreInspection) => Promise<TyreInspection>;
  createTyreJobCard: (jobCard: TyreJobCard) => Promise<TyreJobCard>;
  createWorkOrder: (workOrder: MaintenanceWorkOrder) => Promise<MaintenanceWorkOrder>;
  createVehicle: (vehicle: Vehicle) => Promise<Vehicle>;
  deleteDriver: (id: string) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  navigateTo: (path: string) => void;
  page: AppPage;
  refreshFleetData: () => Promise<void>;
  recordInventoryTransaction: (transaction: InventoryTransaction) => Promise<InventoryTransaction>;
  route: FleetRoute;
  updateAlertRule: (rule: AlertRule) => Promise<AlertRule>;
  resolveException: (id: string, resolutionNote: string) => Promise<FleetAlert | undefined>;
  updateBattery: (battery: BatteryAsset) => Promise<BatteryAsset>;
  updateDriver: (driver: FleetDriver) => Promise<FleetDriver>;
  updateFuelReview: (id: string, decision: 'Approved' | 'Rejected', reviewNote: string) => Promise<FuelEvent | undefined>;
  updatePartInventoryItem: (item: PartInventoryItem) => Promise<PartInventoryItem>;
  raisePurchaseRequest: (id: string) => Promise<PartInventoryItem | undefined>;
  updateTyre: (tyre: TyreInventoryItem) => Promise<TyreInventoryItem>;
  updateVehicle: (vehicle: Vehicle) => Promise<Vehicle>;
  updateWorkOrder: (workOrder: MaintenanceWorkOrder) => Promise<MaintenanceWorkOrder>;
  updateWorkOrderStatus: (id: string, status: WorkOrderStatus) => Promise<void>;
}

export function FleetSectionPage(props: FleetSectionPageProps) {
  const { alertRules, alerts, approveWorkOrder, batteries, closeWorkOrder, costDrilldowns, createAlertRule, createBattery, createDispatchAssignment, createDriver, createPartInventoryItem, createTyre, createTyreInspection, createTyreJobCard, createVehicle, createWorkOrder, deleteDriver, deleteVehicle, dispatchAssignments, drivers, error, fuelEvents, inventoryTransactions, loading, navigateTo, page, partsInventory, raisePurchaseRequest, recordInventoryTransaction, reportMetrics, resolveException, route, telematics, tyreInspections, tyreInventory, tyreJobCards, updateAlertRule, updateBattery, updateDriver, updateFuelReview, updatePartInventoryItem, updateTyre, updateVehicle, updateWorkOrder, updateWorkOrderStatus, vehicles, vendorLedger, workOrders } = props;

  if (page === 'vehicle-management' || page === 'vehicle-master') {
    return (
      <VehicleManagementPage
        createVehicle={createVehicle}
        deleteVehicle={deleteVehicle}
        alerts={alerts}
        dispatchAssignments={dispatchAssignments}
        error={error}
        loading={loading}
        navigateTo={navigateTo}
        partsInventory={partsInventory}
        route={route}
        updateVehicle={updateVehicle}
        vehicles={vehicles}
        workOrders={workOrders}
      />
    );
  }

  if (page === 'driver-management') {
    return (
      <DriverManagementPage
        alerts={alerts}
        createDriver={createDriver}
        deleteDriver={deleteDriver}
        dispatchAssignments={dispatchAssignments}
        drivers={drivers}
        error={error}
        loading={loading}
        navigateTo={navigateTo}
        route={route}
        updateDriver={updateDriver}
        vehicles={vehicles}
        workOrders={workOrders}
      />
    );
  }

  if (page === 'driver-behavior') {
    return (
      <PageFrame page={page}>
        <DriverReadinessPanel drivers={drivers} />
        <BehaviorSignalsPage drivers={drivers} />
      </PageFrame>
    );
  }

  if (page === 'dispatch-console') {
    return (
      <DispatchConsolePage
        createDispatchAssignment={createDispatchAssignment}
        dispatchAssignments={dispatchAssignments}
        drivers={drivers}
        error={error}
        loading={loading}
        navigateTo={navigateTo}
        route={route}
        vehicles={vehicles}
        workOrders={workOrders}
      />
    );
  }

  if (page === 'compliance') {
    return (
      <CompliancePage error={error} loading={loading} vehicles={vehicles} />
    );
  }

  if (page === 'maintenance' || page === 'garage-mgmt') {
    return (
      <MaintenanceManagementPage
        alerts={alerts}
        approveWorkOrder={approveWorkOrder}
        closeWorkOrder={closeWorkOrder}
        createWorkOrder={createWorkOrder}
        error={error}
        inventoryTransactions={inventoryTransactions}
        loading={loading}
        navigateTo={navigateTo}
        partsInventory={partsInventory}
        recordInventoryTransaction={recordInventoryTransaction}
        route={route}
        updateWorkOrder={updateWorkOrder}
        updateWorkOrderStatus={updateWorkOrderStatus}
        vehicles={vehicles}
        workOrders={workOrders}
      />
    );
  }

  if (page === 'fuel-energy' || page === 'reconciliation') {
    return (
      <FuelWorkflowPage
        error={error}
        fuelEvents={fuelEvents}
        loading={loading}
        navigateTo={navigateTo}
        route={route}
        updateFuelReview={updateFuelReview}
        vehicles={vehicles}
      />
    );
  }

  if (page === 'battery-mgmt') {
    return (
      <BatteryManagementPage
        batteries={batteries}
        createBattery={createBattery}
        error={error}
        loading={loading}
        navigateTo={navigateTo}
        route={route}
        updateBattery={updateBattery}
        vehicles={vehicles}
      />
    );
  }

  if (page === 'live-map' || page === 'data-coverage') {
    return (
      <PageFrame page={page}>
        <LiveFleetVisibilityPanel telematics={telematics} />
        {page === 'data-coverage' && <DataCoveragePage telematics={telematics} vehiclesCount={vehicles.length} />}
      </PageFrame>
    );
  }

  if (page === 'tyre-inventory') {
    return (
      <TyreInventoryPage
        createTyre={createTyre}
        error={error}
        loading={loading}
        navigateTo={navigateTo}
        route={route}
        tyreInventory={tyreInventory}
        updateTyre={updateTyre}
        vehicles={vehicles}
      />
    );
  }

  if (page === 'tyre-inspections') {
    return (
      <TyreInspectionPage
        createTyreInspection={createTyreInspection}
        error={error}
        loading={loading}
        navigateTo={navigateTo}
        route={route}
        tyreInspections={tyreInspections}
        tyreInventory={tyreInventory}
      />
    );
  }

  if (page === 'tyre-job-cards') {
    return (
      <TyreJobCardPage
        createTyreJobCard={createTyreJobCard}
        error={error}
        loading={loading}
        navigateTo={navigateTo}
        route={route}
        tyreInventory={tyreInventory}
        tyreJobCards={tyreJobCards}
      />
    );
  }

  if (page === 'tyre-management' || page === 'tyre-visual-tracker') {
    return (
      <PageFrame page={page}>
        <TyreIntelligenceDashboard vehicles={vehicles} />
      </PageFrame>
    );
  }

  if (page === 'exception-center') {
    return (
      <ExceptionQueuePage
        alerts={alerts}
        error={error}
        loading={loading}
        navigateTo={navigateTo}
        resolveException={resolveException}
        route={route}
      />
    );
  }

  if (page === 'alert-management') {
    return (
      <AlertRulePage
        alertRules={alertRules}
        createAlertRule={createAlertRule}
        error={error}
        loading={loading}
        navigateTo={navigateTo}
        route={route}
        updateAlertRule={updateAlertRule}
      />
    );
  }

  if (page === 'inventory') {
    return (
      <InventoryPage
        createPartInventoryItem={createPartInventoryItem}
        error={error}
        loading={loading}
        navigateTo={navigateTo}
        inventoryTransactions={inventoryTransactions}
        partsInventory={partsInventory}
        raisePurchaseRequest={raisePurchaseRequest}
        recordInventoryTransaction={recordInventoryTransaction}
        route={route}
        workOrders={workOrders}
        updatePartInventoryItem={updatePartInventoryItem}
      />
    );
  }

  if (page === 'inventory-transactions') {
    return (
      <InventoryTransactionsPage
        inventoryTransactions={inventoryTransactions}
        navigateTo={navigateTo}
        partsInventory={partsInventory}
        route={route}
        workOrders={workOrders}
      />
    );
  }

  if (page === 'vendor-ledger') {
    return (
      <VendorLedgerPage
        error={error}
        loading={loading}
        navigateTo={navigateTo}
        route={route}
        vendorLedger={vendorLedger}
      />
    );
  }

  if (page === 'cost-health') {
    return (
      <CostHealthPage
        costDrilldowns={costDrilldowns}
        error={error}
        loading={loading}
        navigateTo={navigateTo}
        reportMetrics={reportMetrics}
        route={route}
      />
    );
  }

  return (
    <PageFrame page={page}>
      <MvpSubModule page={page} vehiclesCount={vehicles.length} />
    </PageFrame>
  );
}
