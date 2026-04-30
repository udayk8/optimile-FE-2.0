import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useFleetAuth } from '@shared-auth';
import {
  approveMaintenanceWorkOrder,
  closeMaintenanceWorkOrder,
  createAlertRule,
  createBatteryAsset,
  createDispatchAssignment,
  createPartInventoryItem,
  createMaintenanceWorkOrder,
  createFleetVehicle,
  createFleetDriver,
  createInventoryTransaction,
  deleteFleetDriver,
  deleteFleetVehicle,
  createTyreInspection,
  createTyreInventoryItem,
  createTyreJobCard,
  getFleetAlerts,
  getAlertRules,
  getFleetDrivers,
  getFleetReportMetrics,
  getFleetVehicles,
  getBatteries,
  getCostDrilldowns,
  getDispatchAssignments,
  getFuelEvents,
  getInventoryTransactions,
  getMaintenanceWorkOrders,
  getPartsInventory,
  getVendorLedger,
  getTelematicsSignals,
  getTyreInspections,
  getTyreInventory,
  getTyreJobCards,
  updateFleetVehicle,
  updateFleetDriver,
  updateFuelEventReview,
  updateMaintenanceWorkOrder,
  updateMaintenanceWorkOrderStatus,
  updateBatteryAsset,
  updatePartInventoryItem,
  raisePartPurchaseRequest,
  resolveFleetAlert,
  updateAlertRule,
  updateTyreInventoryItem,
} from '../services/fleetApi';
import {
  AlertRule,
  BatteryAsset,
  CostHealthDrilldown,
  DispatchAssignment,
  FleetAlert,
  FleetDriver,
  FleetReportMetric,
  FleetTask,
  FleetTaskOverride,
  FleetTaskStatus,
  FuelEvent,
  InventoryTransaction,
  MaintenanceWorkOrder,
  OperationalDataState,
  PartInventoryItem,
  TelematicsSignal,
  TyreInspection,
  TyreInventoryItem,
  TyreJobCard,
  Vehicle,
  VendorLedgerEntry,
  WorkOrderStatus,
} from '../types';
import {
  demoAlerts,
  demoAlertRules,
  demoBatteries,
  demoCostDrilldowns,
  demoDispatchAssignments,
  demoDrivers,
  demoFuelEvents,
  demoInventoryTransactions,
  demoPartsInventory,
  demoReportMetrics,
  demoTelematics,
  demoTyreInspections,
  demoTyreInventory,
  demoTyreJobCards,
  demoVehicles,
  demoVendorLedger,
  demoWorkOrders,
} from '../modules/fleet/fleetDemoData';
import { calculateCurrentStock, getInventoryItemStockStatus, getPartId } from '../modules/fleet/procurement/inventoryStock';
import { buildFleetTasks } from '../modules/fleet/fleetTasks';

interface OperationalDataContextValue extends OperationalDataState {
  approveWorkOrder: (id: string) => Promise<MaintenanceWorkOrder | undefined>;
  closeWorkOrder: (id: string) => Promise<MaintenanceWorkOrder | undefined>;
  createAlertRule: (rule: AlertRule) => Promise<AlertRule>;
  createDriver: (driver: FleetDriver) => Promise<FleetDriver>;
  createBattery: (battery: BatteryAsset) => Promise<BatteryAsset>;
  createDispatchAssignment: (assignment: DispatchAssignment) => Promise<DispatchAssignment>;
  createTyre: (tyre: TyreInventoryItem) => Promise<TyreInventoryItem>;
  createPartInventoryItem: (item: PartInventoryItem) => Promise<PartInventoryItem>;
  createTyreInspection: (inspection: TyreInspection) => Promise<TyreInspection>;
  createTyreJobCard: (jobCard: TyreJobCard) => Promise<TyreJobCard>;
  createWorkOrder: (workOrder: MaintenanceWorkOrder) => Promise<MaintenanceWorkOrder>;
  createVehicle: (vehicle: Vehicle) => Promise<Vehicle>;
  deleteDriver: (id: string) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  refreshFleetData: () => Promise<void>;
  reassignTask: (id: string, assignedTo: string, assignedRole: string) => void;
  updateDriver: (driver: FleetDriver) => Promise<FleetDriver>;
  updateAlertRule: (rule: AlertRule) => Promise<AlertRule>;
  resolveException: (id: string, resolutionNote: string) => Promise<FleetAlert | undefined>;
  updateBattery: (battery: BatteryAsset) => Promise<BatteryAsset>;
  updateFuelReview: (id: string, decision: 'Approved' | 'Rejected', reviewNote: string) => Promise<FuelEvent | undefined>;
  recordInventoryTransaction: (transaction: InventoryTransaction) => Promise<InventoryTransaction>;
  updatePartInventoryItem: (item: PartInventoryItem) => Promise<PartInventoryItem>;
  raisePurchaseRequest: (id: string) => Promise<PartInventoryItem | undefined>;
  updateTyre: (tyre: TyreInventoryItem) => Promise<TyreInventoryItem>;
  updateVehicle: (vehicle: Vehicle) => Promise<Vehicle>;
  updateWorkOrder: (workOrder: MaintenanceWorkOrder) => Promise<MaintenanceWorkOrder>;
  updateWorkOrderStatus: (id: string, status: WorkOrderStatus) => Promise<void>;
  updateTaskStatus: (id: string, status: FleetTaskStatus) => void;
}

const OperationalDataContext = createContext<OperationalDataContextValue | undefined>(undefined);
const TASK_OVERRIDES_KEY = 'fleet_task_overrides';

function readTaskOverrides(): Record<string, FleetTaskOverride> {
  try {
    return JSON.parse(localStorage.getItem(TASK_OVERRIDES_KEY) ?? '{}') as Record<string, FleetTaskOverride>;
  } catch {
    return {};
  }
}

export function OperationalDataProvider({ children }: { children: ReactNode }) {
  const { user } = useFleetAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [fuelEvents, setFuelEvents] = useState<FuelEvent[]>([]);
  const [batteries, setBatteries] = useState<BatteryAsset[]>([]);
  const [dispatchAssignments, setDispatchAssignments] = useState<DispatchAssignment[]>([]);
  const [tyreInventory, setTyreInventory] = useState<TyreInventoryItem[]>([]);
  const [tyreInspections, setTyreInspections] = useState<TyreInspection[]>([]);
  const [tyreJobCards, setTyreJobCards] = useState<TyreJobCard[]>([]);
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [partsInventory, setPartsInventory] = useState<PartInventoryItem[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [vendorLedger, setVendorLedger] = useState<VendorLedgerEntry[]>([]);
  const [costDrilldowns, setCostDrilldowns] = useState<CostHealthDrilldown[]>([]);
  const [telematics, setTelematics] = useState<TelematicsSignal[]>([]);
  const [reportMetrics, setReportMetrics] = useState<FleetReportMetric[]>([]);
  const [taskOverrides, setTaskOverrides] = useState<Record<string, FleetTaskOverride>>(() => readTaskOverrides());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshFleetData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [
      vehicleResult,
      driverResult,
      workOrderResult,
      fuelResult,
      alertResult,
      alertRuleResult,
      partsResult,
      inventoryTransactionResult,
      telematicsResult,
      reportResult,
      tyreInventoryResult,
      tyreInspectionResult,
      tyreJobCardResult,
      batteryResult,
      dispatchResult,
      vendorLedgerResult,
      costDrilldownResult,
    ] = await Promise.allSettled([
      getFleetVehicles(),
      getFleetDrivers(),
      getMaintenanceWorkOrders(),
      getFuelEvents(),
      getFleetAlerts(),
      getAlertRules(),
      getPartsInventory(),
      getInventoryTransactions(),
      getTelematicsSignals(),
      getFleetReportMetrics(),
      getTyreInventory(),
      getTyreInspections(),
      getTyreJobCards(),
      getBatteries(),
      getDispatchAssignments(),
      getVendorLedger(),
      getCostDrilldowns(),
    ]);

    if (vehicleResult.status === 'fulfilled') {
      setVehicles(vehicleResult.value);
    } else {
      setVehicles(demoVehicles);
      setError('Live fleet data unavailable. Showing operational snapshot.');
    }

    if (workOrderResult.status === 'fulfilled') {
      setWorkOrders(workOrderResult.value);
    } else {
      setWorkOrders(demoWorkOrders);
    }
    setDrivers(driverResult.status === 'fulfilled' ? driverResult.value : demoDrivers);
    setFuelEvents(fuelResult.status === 'fulfilled' ? fuelResult.value : demoFuelEvents);
    setAlerts(alertResult.status === 'fulfilled' ? alertResult.value : demoAlerts);
    setAlertRules(alertRuleResult.status === 'fulfilled' ? alertRuleResult.value : demoAlertRules);
    setPartsInventory(partsResult.status === 'fulfilled' ? partsResult.value : demoPartsInventory);
    setInventoryTransactions(inventoryTransactionResult.status === 'fulfilled' ? inventoryTransactionResult.value : demoInventoryTransactions);
    setTelematics(telematicsResult.status === 'fulfilled' ? telematicsResult.value : demoTelematics);
    setReportMetrics(reportResult.status === 'fulfilled' ? reportResult.value : demoReportMetrics);
    setTyreInventory(tyreInventoryResult.status === 'fulfilled' ? tyreInventoryResult.value : demoTyreInventory);
    setTyreInspections(tyreInspectionResult.status === 'fulfilled' ? tyreInspectionResult.value : demoTyreInspections);
    setTyreJobCards(tyreJobCardResult.status === 'fulfilled' ? tyreJobCardResult.value : demoTyreJobCards);
    setBatteries(batteryResult.status === 'fulfilled' ? batteryResult.value : demoBatteries);
    setDispatchAssignments(dispatchResult.status === 'fulfilled' ? dispatchResult.value : demoDispatchAssignments);
    setVendorLedger(vendorLedgerResult.status === 'fulfilled' ? vendorLedgerResult.value : demoVendorLedger);
    setCostDrilldowns(costDrilldownResult.status === 'fulfilled' ? costDrilldownResult.value : demoCostDrilldowns);

    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshFleetData();
  }, [refreshFleetData]);

  const updateWorkOrderStatus = useCallback(async (id: string, status: WorkOrderStatus) => {
    setWorkOrders((current) => current.map((order) => (order.id === id ? { ...order, status, closedAt: status === 'Completed' ? new Date().toISOString().slice(0, 10) : order.closedAt } : order)));
    const updated = await updateMaintenanceWorkOrderStatus(id, status);
    if (updated) setWorkOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
  }, []);

  const createWorkOrder = useCallback(async (workOrder: MaintenanceWorkOrder) => {
    const created = await createMaintenanceWorkOrder(workOrder);
    setWorkOrders((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
  }, []);

  const updateWorkOrder = useCallback(async (workOrder: MaintenanceWorkOrder) => {
    const updated = await updateMaintenanceWorkOrder(workOrder);
    setWorkOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  }, []);

  const approveWorkOrder = useCallback(async (id: string) => {
    const workOrder = workOrders.find((item) => item.id === id);
    if (!workOrder) return undefined;
    const approved = await approveMaintenanceWorkOrder(workOrder);
    setWorkOrders((current) => current.map((item) => (item.id === approved.id ? approved : item)));
    return approved;
  }, [workOrders]);

  const closeWorkOrder = useCallback(async (id: string) => {
    const workOrder = workOrders.find((item) => item.id === id);
    if (!workOrder) return undefined;
    const closed = await closeMaintenanceWorkOrder(workOrder);
    setWorkOrders((current) => current.map((item) => (item.id === closed.id ? closed : item)));
    return closed;
  }, [workOrders]);

  const createVehicle = useCallback(async (vehicle: Vehicle) => {
    const created = await createFleetVehicle(vehicle);
    setVehicles((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
  }, []);

  const updateVehicle = useCallback(async (vehicle: Vehicle) => {
    const updated = await updateFleetVehicle(vehicle);
    setVehicles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  }, []);

  const deleteVehicle = useCallback(async (id: string) => {
    await deleteFleetVehicle(id);
    setVehicles((current) => current.filter((item) => item.id !== id));
  }, []);

  const createDriver = useCallback(async (driver: FleetDriver) => {
    const created = await createFleetDriver(driver);
    setDrivers((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
  }, []);

  const updateDriver = useCallback(async (driver: FleetDriver) => {
    const updated = await updateFleetDriver(driver);
    setDrivers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  }, []);

  const deleteDriver = useCallback(async (id: string) => {
    await deleteFleetDriver(id);
    setDrivers((current) => current.filter((item) => item.id !== id));
  }, []);

  const createBattery = useCallback(async (battery: BatteryAsset) => {
    const created = await createBatteryAsset(battery);
    setBatteries((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
  }, []);

  const updateBattery = useCallback(async (battery: BatteryAsset) => {
    const updated = await updateBatteryAsset(battery);
    setBatteries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  }, []);

  const createDispatchAssignmentRecord = useCallback(async (assignment: DispatchAssignment) => {
    const created = await createDispatchAssignment(assignment);
    setDispatchAssignments((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
  }, []);

  const createInventoryItem = useCallback(async (item: PartInventoryItem) => {
    const created = await createPartInventoryItem(item);
    setPartsInventory((current) => [created, ...current.filter((part) => part.id !== created.id)]);
    return created;
  }, []);

  const updateInventoryItem = useCallback(async (item: PartInventoryItem) => {
    const updated = await updatePartInventoryItem(item);
    setPartsInventory((current) => current.map((part) => (part.id === updated.id ? updated : part)));
    return updated;
  }, []);

  const syncPartStockFromTransactions = useCallback((partId: string, nextTransactions: InventoryTransaction[]) => {
    setPartsInventory((current) => current.map((part) => {
      if (getPartId(part) !== partId) return part;
      const currentStock = calculateCurrentStock(partId, nextTransactions);
      const stockStatus = getInventoryItemStockStatus(part, currentStock);
      return {
        ...part,
        currentStock,
        stockOnHand: currentStock,
        status: stockStatus === 'Out of Stock' ? 'Out of Stock' : stockStatus === 'Low Stock' ? 'Low Stock' : part.status === 'PR Raised' ? 'PR Raised' : 'In Stock',
      };
    }));
  }, []);

  const recordInventoryTransaction = useCallback(async (transaction: InventoryTransaction) => {
    const created = await createInventoryTransaction(transaction);
    const nextTransactions = [created, ...inventoryTransactions.filter((item) => item.transactionId !== created.transactionId)];
    setInventoryTransactions(nextTransactions);
    syncPartStockFromTransactions(created.partId, nextTransactions);
    return created;
  }, [inventoryTransactions, syncPartStockFromTransactions]);

  const raisePurchaseRequest = useCallback(async (id: string) => {
    const item = partsInventory.find((part) => part.id === id);
    if (!item) return undefined;
    const updated = await raisePartPurchaseRequest(item);
    setPartsInventory((current) => current.map((part) => (part.id === updated.id ? updated : part)));
    return updated;
  }, [partsInventory]);

  const createTyre = useCallback(async (tyre: TyreInventoryItem) => {
    const created = await createTyreInventoryItem(tyre);
    setTyreInventory((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
  }, []);

  const updateTyre = useCallback(async (tyre: TyreInventoryItem) => {
    const updated = await updateTyreInventoryItem(tyre);
    setTyreInventory((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  }, []);

  const createTyreInspectionRecord = useCallback(async (inspection: TyreInspection) => {
    const created = await createTyreInspection(inspection);
    setTyreInspections((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
  }, []);

  const createTyreJobCardRecord = useCallback(async (jobCard: TyreJobCard) => {
    const created = await createTyreJobCard(jobCard);
    setTyreJobCards((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
  }, []);

  const updateFuelReview = useCallback(async (id: string, decision: 'Approved' | 'Rejected', reviewNote: string) => {
    const event = fuelEvents.find((item) => item.id === id);
    if (!event) return undefined;
    const reviewed = await updateFuelEventReview(event, decision, reviewNote);
    setFuelEvents((current) => current.map((item) => (item.id === reviewed.id ? reviewed : item)));
    return reviewed;
  }, [fuelEvents]);

  const resolveException = useCallback(async (id: string, resolutionNote: string) => {
    const alert = alerts.find((item) => item.id === id);
    if (!alert) return undefined;
    const resolved = await resolveFleetAlert(alert, resolutionNote);
    setAlerts((current) => current.map((item) => (item.id === resolved.id ? resolved : item)));
    return resolved;
  }, [alerts]);

  const createAlertRuleRecord = useCallback(async (rule: AlertRule) => {
    const created = await createAlertRule(rule);
    setAlertRules((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
  }, []);

  const updateAlertRuleRecord = useCallback(async (rule: AlertRule) => {
    const updated = await updateAlertRule(rule);
    setAlertRules((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  }, []);

  const updateTaskOverride = useCallback((id: string, override: FleetTaskOverride) => {
    setTaskOverrides((current) => {
      const next = { ...current, [id]: { ...current[id], ...override, updatedAt: new Date().toISOString() } };
      localStorage.setItem(TASK_OVERRIDES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateTaskStatus = useCallback((id: string, status: FleetTaskStatus) => {
    updateTaskOverride(id, {
      completedAt: status === 'Completed' ? new Date().toISOString() : undefined,
      completedBy: status === 'Completed' ? user.name : undefined,
      status,
    });
  }, [updateTaskOverride, user.name]);

  const reassignTask = useCallback((id: string, assignedTo: string, assignedRole: string) => {
    updateTaskOverride(id, {
      assignedBy: user.name,
      assignedRole,
      assignedTo,
    });
  }, [updateTaskOverride, user.name]);

  const tasks = useMemo<FleetTask[]>(() => buildFleetTasks({
    alerts,
    assignments: dispatchAssignments,
    drivers,
    inventoryTransactions,
    overrides: taskOverrides,
    partsInventory,
    vehicles,
    workOrders,
  }), [alerts, dispatchAssignments, drivers, inventoryTransactions, partsInventory, taskOverrides, vehicles, workOrders]);

  const value = useMemo(
    () => ({
      approveWorkOrder,
      closeWorkOrder,
      createAlertRule: createAlertRuleRecord,
      createBattery,
      createDispatchAssignment: createDispatchAssignmentRecord,
      createDriver,
      createPartInventoryItem: createInventoryItem,
      createTyre,
      createTyreInspection: createTyreInspectionRecord,
      createTyreJobCard: createTyreJobCardRecord,
      createWorkOrder,
      createVehicle,
      deleteDriver,
      deleteVehicle,
      vehicles,
      drivers,
      workOrders,
      fuelEvents,
      batteries,
      dispatchAssignments,
      tyreInventory,
      tyreInspections,
      tyreJobCards,
      alerts,
      alertRules,
      partsInventory,
      inventoryTransactions,
      vendorLedger,
      costDrilldowns,
      telematics,
      reportMetrics,
      tasks,
      loading,
      error,
      refreshFleetData,
      reassignTask,
      updateDriver,
      updateAlertRule: updateAlertRuleRecord,
      resolveException,
      updateBattery,
      updateFuelReview,
      recordInventoryTransaction,
      updatePartInventoryItem: updateInventoryItem,
      raisePurchaseRequest,
      updateTyre,
      updateVehicle,
      updateWorkOrder,
      updateWorkOrderStatus,
      updateTaskStatus,
    }),
    [
      alerts,
      approveWorkOrder,
      alertRules,
      closeWorkOrder,
      createAlertRuleRecord,
      batteries,
      createBattery,
      createDispatchAssignmentRecord,
      createDriver,
      createInventoryItem,
      createTyre,
      createTyreInspectionRecord,
      createTyreJobCardRecord,
      createWorkOrder,
      createVehicle,
      deleteDriver,
      deleteVehicle,
      drivers,
      error,
      fuelEvents,
      inventoryTransactions,
      dispatchAssignments,
      tyreInventory,
      tyreInspections,
      tyreJobCards,
      loading,
      partsInventory,
      vendorLedger,
      costDrilldowns,
      raisePurchaseRequest,
      refreshFleetData,
      recordInventoryTransaction,
      reportMetrics,
      reassignTask,
      resolveException,
      tasks,
      telematics,
      updateDriver,
      updateAlertRuleRecord,
      updateBattery,
      updateFuelReview,
      updateInventoryItem,
      updateTyre,
      updateVehicle,
      updateWorkOrder,
      updateWorkOrderStatus,
      updateTaskStatus,
      vehicles,
      workOrders,
    ],
  );

  return <OperationalDataContext.Provider value={value}>{children}</OperationalDataContext.Provider>;
}

export function useOperationalData() {
  const context = useContext(OperationalDataContext);
  if (!context) {
    throw new Error('useOperationalData must be used within OperationalDataProvider');
  }
  return context;
}
