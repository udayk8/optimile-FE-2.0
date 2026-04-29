import { apiClient } from './apiClient';
import {
  AlertRule,
  BatteryAsset,
  CostHealthDrilldown,
  DispatchAssignment,
  FleetAlert,
  FleetDriver,
  FleetReportMetric,
  FuelEvent,
  FuelReconciliationStatus,
  InventoryTransaction,
  MaintenanceWorkOrder,
  PartInventoryItem,
  TelematicsSignal,
  TyreInspection,
  TyreInventoryItem,
  TyreJobCard,
  Vehicle,
  VendorLedgerEntry,
  WorkOrderStatus,
} from '../types';
import { demoAlertRules, demoAlerts, demoBatteries, demoCostDrilldowns, demoDispatchAssignments, demoDrivers, demoFuelEvents, demoInventoryTransactions, demoPartsInventory, demoTyreInspections, demoTyreInventory, demoTyreJobCards, demoVehicles, demoVendorLedger, demoWorkOrders } from '../modules/fleet/fleetDemoData';

const VEHICLES_CACHE_KEY = 'fleet_vehicles';
const WORK_ORDERS_CACHE_KEY = 'fleet_work_orders';
const DRIVERS_CACHE_KEY = 'fleet_drivers';
const FUEL_EVENTS_CACHE_KEY = 'fleet_fuel_events';
const ALERTS_CACHE_KEY = 'fleet_alerts';
const ALERT_RULES_CACHE_KEY = 'fleet_alert_rules';
const PARTS_CACHE_KEY = 'fleet_parts_inventory';
const INVENTORY_TRANSACTIONS_CACHE_KEY = 'fleet_inventory_transactions';
const TELEMATICS_CACHE_KEY = 'fleet_telematics';
const REPORT_METRICS_CACHE_KEY = 'fleet_report_metrics';
const TYRE_INVENTORY_CACHE_KEY = 'fleet_tyre_inventory';
const TYRE_INSPECTIONS_CACHE_KEY = 'fleet_tyre_inspections';
const TYRE_JOB_CARDS_CACHE_KEY = 'fleet_tyre_job_cards';
const BATTERIES_CACHE_KEY = 'fleet_batteries';
const DISPATCH_ASSIGNMENTS_CACHE_KEY = 'fleet_dispatch_assignments';
const VENDOR_LEDGER_CACHE_KEY = 'fleet_vendor_ledger';
const COST_DRILLDOWNS_CACHE_KEY = 'fleet_cost_drilldowns';

async function getWithCache<T>(path: string, cacheKey: string, errorMessage: string): Promise<T> {
  try {
    const data = await apiClient.get<T>(path);
    localStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  } catch {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as T;
    throw new Error(errorMessage);
  }
}

export async function getFleetVehicles(): Promise<Vehicle[]> {
  return getWithCache<Vehicle[]>('/api/v1/fleet/vehicles', VEHICLES_CACHE_KEY, 'Unable to load fleet vehicles');
}

function readCachedVehicles(): Vehicle[] {
  const cached = localStorage.getItem(VEHICLES_CACHE_KEY);
  if (cached) return JSON.parse(cached) as Vehicle[];
  return demoVehicles;
}

function writeCachedVehicles(vehicles: Vehicle[]) {
  localStorage.setItem(VEHICLES_CACHE_KEY, JSON.stringify(vehicles));
}

export async function createFleetVehicle(vehicle: Vehicle): Promise<Vehicle> {
  try {
    const data = await apiClient.post<Vehicle>('/api/v1/fleet/vehicles', vehicle);
    writeCachedVehicles([...readCachedVehicles().filter((item) => item.id !== data.id), data]);
    return data;
  } catch {
    const nextVehicle = { ...vehicle, id: vehicle.id || `veh-${Date.now()}` };
    writeCachedVehicles([nextVehicle, ...readCachedVehicles()]);
    return nextVehicle;
  }
}

export async function updateFleetVehicle(vehicle: Vehicle): Promise<Vehicle> {
  try {
    const data = await apiClient.put<Vehicle>(`/api/v1/fleet/vehicles/${vehicle.id}`, vehicle);
    writeCachedVehicles(readCachedVehicles().map((item) => (item.id === data.id ? data : item)));
    return data;
  } catch {
    writeCachedVehicles(readCachedVehicles().map((item) => (item.id === vehicle.id ? vehicle : item)));
    return vehicle;
  }
}

export async function deleteFleetVehicle(vehicleId: string): Promise<string> {
  try {
    await apiClient.delete<{ id: string }>(`/api/v1/fleet/vehicles/${vehicleId}`);
  } catch {
    // Backend mutation endpoints are optional in the MVP; local cache remains the fallback source.
  }
  writeCachedVehicles(readCachedVehicles().filter((item) => item.id !== vehicleId));
  return vehicleId;
}

export async function getMaintenanceWorkOrders(): Promise<MaintenanceWorkOrder[]> {
  return getWithCache<MaintenanceWorkOrder[]>('/api/v1/fleet/work-orders', WORK_ORDERS_CACHE_KEY, 'Unable to load maintenance work orders');
}

function readCachedWorkOrders(): MaintenanceWorkOrder[] {
  const cached = localStorage.getItem(WORK_ORDERS_CACHE_KEY);
  if (cached) return JSON.parse(cached) as MaintenanceWorkOrder[];
  return demoWorkOrders;
}

function writeCachedWorkOrders(workOrders: MaintenanceWorkOrder[]) {
  localStorage.setItem(WORK_ORDERS_CACHE_KEY, JSON.stringify(workOrders));
}

export async function createMaintenanceWorkOrder(workOrder: MaintenanceWorkOrder): Promise<MaintenanceWorkOrder> {
  try {
    const data = await apiClient.post<MaintenanceWorkOrder>('/api/v1/fleet/work-orders', workOrder);
    writeCachedWorkOrders([...readCachedWorkOrders().filter((item) => item.id !== data.id), data]);
    return data;
  } catch {
    const nextWorkOrder = { ...workOrder, id: workOrder.id || `wo-${Date.now()}` };
    writeCachedWorkOrders([nextWorkOrder, ...readCachedWorkOrders()]);
    return nextWorkOrder;
  }
}

export async function updateMaintenanceWorkOrder(workOrder: MaintenanceWorkOrder): Promise<MaintenanceWorkOrder> {
  try {
    const data = await apiClient.put<MaintenanceWorkOrder>(`/api/v1/fleet/work-orders/${workOrder.id}`, workOrder);
    writeCachedWorkOrders(readCachedWorkOrders().map((item) => (item.id === data.id ? data : item)));
    return data;
  } catch {
    writeCachedWorkOrders(readCachedWorkOrders().map((item) => (item.id === workOrder.id ? workOrder : item)));
    return workOrder;
  }
}

export async function updateMaintenanceWorkOrderStatus(workOrderId: string, status: WorkOrderStatus): Promise<MaintenanceWorkOrder | undefined> {
  const workOrder = readCachedWorkOrders().find((item) => item.id === workOrderId);
  if (!workOrder) return undefined;
  return updateMaintenanceWorkOrder({ ...workOrder, status, closedAt: status === 'Completed' ? new Date().toISOString().slice(0, 10) : workOrder.closedAt });
}

export async function approveMaintenanceWorkOrder(workOrder: MaintenanceWorkOrder): Promise<MaintenanceWorkOrder> {
  const approved = {
    ...workOrder,
    approvalStatus: 'Approved' as const,
    approvedBy: workOrder.approvalRequired ?? 'Fleet Manager',
    approvedAt: new Date().toISOString().slice(0, 10),
    status: workOrder.status === 'Open' ? ('In Progress' as const) : workOrder.status,
  };

  try {
    const data = await apiClient.post<MaintenanceWorkOrder>(`/api/v1/fleet/work-orders/${workOrder.id}/approve`, approved);
    writeCachedWorkOrders(readCachedWorkOrders().map((item) => (item.id === data.id ? data : item)));
    return data;
  } catch {
    writeCachedWorkOrders(readCachedWorkOrders().map((item) => (item.id === approved.id ? approved : item)));
    return approved;
  }
}

export async function closeMaintenanceWorkOrder(workOrder: MaintenanceWorkOrder): Promise<MaintenanceWorkOrder> {
  const closed = { ...workOrder, status: 'Completed' as const, closedAt: new Date().toISOString().slice(0, 10) };

  try {
    const data = await apiClient.post<MaintenanceWorkOrder>(`/api/v1/fleet/work-orders/${workOrder.id}/close`, closed);
    writeCachedWorkOrders(readCachedWorkOrders().map((item) => (item.id === data.id ? data : item)));
    return data;
  } catch {
    writeCachedWorkOrders(readCachedWorkOrders().map((item) => (item.id === closed.id ? closed : item)));
    return closed;
  }
}

export async function getFleetDrivers(): Promise<FleetDriver[]> {
  return getWithCache<FleetDriver[]>('/api/v1/fleet/drivers', DRIVERS_CACHE_KEY, 'Unable to load fleet drivers');
}

function readCachedDrivers(): FleetDriver[] {
  const cached = localStorage.getItem(DRIVERS_CACHE_KEY);
  if (cached) return JSON.parse(cached) as FleetDriver[];
  return demoDrivers;
}

function writeCachedDrivers(drivers: FleetDriver[]) {
  localStorage.setItem(DRIVERS_CACHE_KEY, JSON.stringify(drivers));
}

export async function createFleetDriver(driver: FleetDriver): Promise<FleetDriver> {
  try {
    const data = await apiClient.post<FleetDriver>('/api/v1/fleet/drivers', driver);
    writeCachedDrivers([...readCachedDrivers().filter((item) => item.id !== data.id), data]);
    return data;
  } catch {
    const nextDriver = { ...driver, id: driver.id || `drv-${Date.now()}` };
    writeCachedDrivers([nextDriver, ...readCachedDrivers()]);
    return nextDriver;
  }
}

export async function updateFleetDriver(driver: FleetDriver): Promise<FleetDriver> {
  try {
    const data = await apiClient.put<FleetDriver>(`/api/v1/fleet/drivers/${driver.id}`, driver);
    writeCachedDrivers(readCachedDrivers().map((item) => (item.id === data.id ? data : item)));
    return data;
  } catch {
    writeCachedDrivers(readCachedDrivers().map((item) => (item.id === driver.id ? driver : item)));
    return driver;
  }
}

export async function deleteFleetDriver(driverId: string): Promise<string> {
  try {
    await apiClient.delete<{ id: string }>(`/api/v1/fleet/drivers/${driverId}`);
  } catch {
    // Backend mutation endpoints are optional in the MVP; local cache remains the fallback source.
  }
  writeCachedDrivers(readCachedDrivers().filter((item) => item.id !== driverId));
  return driverId;
}

export async function getFuelEvents(): Promise<FuelEvent[]> {
  return getWithCache<FuelEvent[]>('/api/v1/fleet/fuel-events', FUEL_EVENTS_CACHE_KEY, 'Unable to load fuel events');
}

function readCachedFuelEvents(): FuelEvent[] {
  const cached = localStorage.getItem(FUEL_EVENTS_CACHE_KEY);
  if (cached) return JSON.parse(cached) as FuelEvent[];
  return demoFuelEvents;
}

function writeCachedFuelEvents(fuelEvents: FuelEvent[]) {
  localStorage.setItem(FUEL_EVENTS_CACHE_KEY, JSON.stringify(fuelEvents));
}

export async function updateFuelEventReview(event: FuelEvent, decision: Extract<FuelReconciliationStatus, 'Approved' | 'Rejected'>, reviewNote: string): Promise<FuelEvent> {
  const reviewed: FuelEvent = {
    ...event,
    reconciliationStatus: decision,
    reviewDecision: decision,
    reviewNote,
    reviewedAt: new Date().toISOString().slice(0, 10),
    reviewedBy: 'Rahul Mehta',
    status: decision === 'Approved' ? 'Posted' : 'Under Review',
  };

  try {
    const data = await apiClient.post<FuelEvent>(`/api/v1/fleet/fuel-events/${event.id}/${decision.toLowerCase()}`, reviewed);
    writeCachedFuelEvents(readCachedFuelEvents().map((item) => (item.id === data.id ? data : item)));
    return data;
  } catch {
    writeCachedFuelEvents(readCachedFuelEvents().map((item) => (item.id === reviewed.id ? reviewed : item)));
    return reviewed;
  }
}

export async function getFleetAlerts(): Promise<FleetAlert[]> {
  return getWithCache<FleetAlert[]>('/api/v1/fleet/alerts', ALERTS_CACHE_KEY, 'Unable to load fleet alerts');
}

function readCachedAlerts(): FleetAlert[] {
  const cached = localStorage.getItem(ALERTS_CACHE_KEY);
  if (cached) return JSON.parse(cached) as FleetAlert[];
  return demoAlerts;
}

function writeCachedAlerts(items: FleetAlert[]) {
  localStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(items));
}

export async function resolveFleetAlert(alert: FleetAlert, resolutionNote: string): Promise<FleetAlert> {
  const resolved: FleetAlert = { ...alert, status: 'Resolved', resolvedAt: new Date().toISOString().slice(0, 10), resolvedBy: 'Rahul Mehta', resolutionNote };
  try {
    const data = await apiClient.post<FleetAlert>(`/api/v1/fleet/alerts/${alert.id}/resolve`, resolved);
    writeCachedAlerts(readCachedAlerts().map((item) => (item.id === data.id ? data : item)));
    return data;
  } catch {
    writeCachedAlerts(readCachedAlerts().map((item) => (item.id === resolved.id ? resolved : item)));
    return resolved;
  }
}

export async function getAlertRules(): Promise<AlertRule[]> {
  return getWithCache<AlertRule[]>('/api/v1/fleet/alert-rules', ALERT_RULES_CACHE_KEY, 'Unable to load alert rules');
}

function readCachedAlertRules(): AlertRule[] {
  const cached = localStorage.getItem(ALERT_RULES_CACHE_KEY);
  if (cached) return JSON.parse(cached) as AlertRule[];
  return demoAlertRules;
}

function writeCachedAlertRules(items: AlertRule[]) {
  localStorage.setItem(ALERT_RULES_CACHE_KEY, JSON.stringify(items));
}

export async function createAlertRule(rule: AlertRule): Promise<AlertRule> {
  try {
    const data = await apiClient.post<AlertRule>('/api/v1/fleet/alert-rules', rule);
    writeCachedAlertRules([data, ...readCachedAlertRules().filter((item) => item.id !== data.id)]);
    return data;
  } catch {
    const nextRule = { ...rule, id: rule.id || `rule-${Date.now()}` };
    writeCachedAlertRules([nextRule, ...readCachedAlertRules()]);
    return nextRule;
  }
}

export async function updateAlertRule(rule: AlertRule): Promise<AlertRule> {
  try {
    const data = await apiClient.put<AlertRule>(`/api/v1/fleet/alert-rules/${rule.id}`, rule);
    writeCachedAlertRules(readCachedAlertRules().map((item) => (item.id === data.id ? data : item)));
    return data;
  } catch {
    writeCachedAlertRules(readCachedAlertRules().map((item) => (item.id === rule.id ? rule : item)));
    return rule;
  }
}

export async function getPartsInventory(): Promise<PartInventoryItem[]> {
  return getWithCache<PartInventoryItem[]>('/api/v1/fleet/parts-inventory', PARTS_CACHE_KEY, 'Unable to load parts inventory');
}

export async function getInventoryTransactions(): Promise<InventoryTransaction[]> {
  try {
    return await getWithCache<InventoryTransaction[]>('/api/v1/fleet/inventory-transactions', INVENTORY_TRANSACTIONS_CACHE_KEY, 'Unable to load inventory transactions');
  } catch {
    localStorage.setItem(INVENTORY_TRANSACTIONS_CACHE_KEY, JSON.stringify(demoInventoryTransactions));
    return demoInventoryTransactions;
  }
}

function readCachedInventoryTransactions(): InventoryTransaction[] {
  const cached = localStorage.getItem(INVENTORY_TRANSACTIONS_CACHE_KEY);
  if (cached) return JSON.parse(cached) as InventoryTransaction[];
  return demoInventoryTransactions;
}

function writeCachedInventoryTransactions(items: InventoryTransaction[]) {
  localStorage.setItem(INVENTORY_TRANSACTIONS_CACHE_KEY, JSON.stringify(items));
}

export async function createInventoryTransaction(transaction: InventoryTransaction): Promise<InventoryTransaction> {
  try {
    const data = await apiClient.post<InventoryTransaction>('/api/v1/fleet/inventory-transactions', transaction);
    writeCachedInventoryTransactions([data, ...readCachedInventoryTransactions().filter((item) => item.transactionId !== data.transactionId)]);
    return data;
  } catch {
    const nextTransaction = { ...transaction, transactionId: transaction.transactionId || `txn-${Date.now()}` };
    writeCachedInventoryTransactions([nextTransaction, ...readCachedInventoryTransactions()]);
    return nextTransaction;
  }
}

function readCachedPartsInventory(): PartInventoryItem[] {
  const cached = localStorage.getItem(PARTS_CACHE_KEY);
  if (cached) return JSON.parse(cached) as PartInventoryItem[];
  return demoPartsInventory;
}

function writeCachedPartsInventory(items: PartInventoryItem[]) {
  localStorage.setItem(PARTS_CACHE_KEY, JSON.stringify(items));
}

export async function createPartInventoryItem(item: PartInventoryItem): Promise<PartInventoryItem> {
  try {
    const data = await apiClient.post<PartInventoryItem>('/api/v1/fleet/parts-inventory', item);
    writeCachedPartsInventory([data, ...readCachedPartsInventory().filter((part) => part.id !== data.id)]);
    return data;
  } catch {
    const nextItem = { ...item, id: item.id || `part-${Date.now()}` };
    writeCachedPartsInventory([nextItem, ...readCachedPartsInventory()]);
    return nextItem;
  }
}

export async function updatePartInventoryItem(item: PartInventoryItem): Promise<PartInventoryItem> {
  try {
    const data = await apiClient.put<PartInventoryItem>(`/api/v1/fleet/parts-inventory/${item.id}`, item);
    writeCachedPartsInventory(readCachedPartsInventory().map((part) => (part.id === data.id ? data : part)));
    return data;
  } catch {
    writeCachedPartsInventory(readCachedPartsInventory().map((part) => (part.id === item.id ? item : part)));
    return item;
  }
}

export async function raisePartPurchaseRequest(item: PartInventoryItem): Promise<PartInventoryItem> {
  return updatePartInventoryItem({ ...item, status: 'PR Raised', urgency: item.urgency ?? 'Urgent' });
}

export async function getVendorLedger(): Promise<VendorLedgerEntry[]> {
  return getWithCache<VendorLedgerEntry[]>('/api/v1/fleet/vendor-ledger', VENDOR_LEDGER_CACHE_KEY, 'Unable to load vendor ledger');
}

export async function getCostDrilldowns(): Promise<CostHealthDrilldown[]> {
  return getWithCache<CostHealthDrilldown[]>('/api/v1/fleet/cost-drilldowns', COST_DRILLDOWNS_CACHE_KEY, 'Unable to load cost drilldowns');
}

export async function getTelematicsSignals(): Promise<TelematicsSignal[]> {
  return getWithCache<TelematicsSignal[]>('/api/v1/fleet/telematics', TELEMATICS_CACHE_KEY, 'Unable to load telematics signals');
}

export async function getFleetReportMetrics(): Promise<FleetReportMetric[]> {
  return getWithCache<FleetReportMetric[]>('/api/v1/fleet/report-metrics', REPORT_METRICS_CACHE_KEY, 'Unable to load report metrics');
}

export async function getTyreInventory(): Promise<TyreInventoryItem[]> {
  return getWithCache<TyreInventoryItem[]>('/api/v1/fleet/tyres', TYRE_INVENTORY_CACHE_KEY, 'Unable to load tyre inventory');
}

function readCachedTyreInventory(): TyreInventoryItem[] {
  const cached = localStorage.getItem(TYRE_INVENTORY_CACHE_KEY);
  if (cached) return JSON.parse(cached) as TyreInventoryItem[];
  return demoTyreInventory;
}

function writeCachedTyreInventory(items: TyreInventoryItem[]) {
  localStorage.setItem(TYRE_INVENTORY_CACHE_KEY, JSON.stringify(items));
}

export async function createTyreInventoryItem(item: TyreInventoryItem): Promise<TyreInventoryItem> {
  try {
    const data = await apiClient.post<TyreInventoryItem>('/api/v1/fleet/tyres', item);
    writeCachedTyreInventory([data, ...readCachedTyreInventory().filter((tyre) => tyre.id !== data.id)]);
    return data;
  } catch {
    const nextItem = { ...item, id: item.id || `tyre-${Date.now()}` };
    writeCachedTyreInventory([nextItem, ...readCachedTyreInventory()]);
    return nextItem;
  }
}

export async function updateTyreInventoryItem(item: TyreInventoryItem): Promise<TyreInventoryItem> {
  try {
    const data = await apiClient.put<TyreInventoryItem>(`/api/v1/fleet/tyres/${item.id}`, item);
    writeCachedTyreInventory(readCachedTyreInventory().map((tyre) => (tyre.id === data.id ? data : tyre)));
    return data;
  } catch {
    writeCachedTyreInventory(readCachedTyreInventory().map((tyre) => (tyre.id === item.id ? item : tyre)));
    return item;
  }
}

export async function getTyreInspections(): Promise<TyreInspection[]> {
  return getWithCache<TyreInspection[]>('/api/v1/fleet/tyre-inspections', TYRE_INSPECTIONS_CACHE_KEY, 'Unable to load tyre inspections');
}

function readCachedTyreInspections(): TyreInspection[] {
  const cached = localStorage.getItem(TYRE_INSPECTIONS_CACHE_KEY);
  if (cached) return JSON.parse(cached) as TyreInspection[];
  return demoTyreInspections;
}

function writeCachedTyreInspections(items: TyreInspection[]) {
  localStorage.setItem(TYRE_INSPECTIONS_CACHE_KEY, JSON.stringify(items));
}

export async function createTyreInspection(item: TyreInspection): Promise<TyreInspection> {
  try {
    const data = await apiClient.post<TyreInspection>('/api/v1/fleet/tyre-inspections', item);
    writeCachedTyreInspections([data, ...readCachedTyreInspections().filter((inspection) => inspection.id !== data.id)]);
    return data;
  } catch {
    const nextItem = { ...item, id: item.id || `tin-${Date.now()}` };
    writeCachedTyreInspections([nextItem, ...readCachedTyreInspections()]);
    return nextItem;
  }
}

export async function getTyreJobCards(): Promise<TyreJobCard[]> {
  return getWithCache<TyreJobCard[]>('/api/v1/fleet/tyre-job-cards', TYRE_JOB_CARDS_CACHE_KEY, 'Unable to load tyre job cards');
}

function readCachedTyreJobCards(): TyreJobCard[] {
  const cached = localStorage.getItem(TYRE_JOB_CARDS_CACHE_KEY);
  if (cached) return JSON.parse(cached) as TyreJobCard[];
  return demoTyreJobCards;
}

function writeCachedTyreJobCards(items: TyreJobCard[]) {
  localStorage.setItem(TYRE_JOB_CARDS_CACHE_KEY, JSON.stringify(items));
}

export async function createTyreJobCard(item: TyreJobCard): Promise<TyreJobCard> {
  try {
    const data = await apiClient.post<TyreJobCard>('/api/v1/fleet/tyre-job-cards', item);
    writeCachedTyreJobCards([data, ...readCachedTyreJobCards().filter((jobCard) => jobCard.id !== data.id)]);
    return data;
  } catch {
    const nextItem = { ...item, id: item.id || `tjc-${Date.now()}` };
    writeCachedTyreJobCards([nextItem, ...readCachedTyreJobCards()]);
    return nextItem;
  }
}

export async function getBatteries(): Promise<BatteryAsset[]> {
  return getWithCache<BatteryAsset[]>('/api/v1/fleet/batteries', BATTERIES_CACHE_KEY, 'Unable to load batteries');
}

function readCachedBatteries(): BatteryAsset[] {
  const cached = localStorage.getItem(BATTERIES_CACHE_KEY);
  if (cached) return JSON.parse(cached) as BatteryAsset[];
  return demoBatteries;
}

function writeCachedBatteries(items: BatteryAsset[]) {
  localStorage.setItem(BATTERIES_CACHE_KEY, JSON.stringify(items));
}

export async function createBatteryAsset(item: BatteryAsset): Promise<BatteryAsset> {
  try {
    const data = await apiClient.post<BatteryAsset>('/api/v1/fleet/batteries', item);
    writeCachedBatteries([data, ...readCachedBatteries().filter((battery) => battery.id !== data.id)]);
    return data;
  } catch {
    const nextItem = { ...item, id: item.id || `bat-${Date.now()}` };
    writeCachedBatteries([nextItem, ...readCachedBatteries()]);
    return nextItem;
  }
}

export async function updateBatteryAsset(item: BatteryAsset): Promise<BatteryAsset> {
  try {
    const data = await apiClient.put<BatteryAsset>(`/api/v1/fleet/batteries/${item.id}`, item);
    writeCachedBatteries(readCachedBatteries().map((battery) => (battery.id === data.id ? data : battery)));
    return data;
  } catch {
    writeCachedBatteries(readCachedBatteries().map((battery) => (battery.id === item.id ? item : battery)));
    return item;
  }
}

export async function getDispatchAssignments(): Promise<DispatchAssignment[]> {
  return getWithCache<DispatchAssignment[]>('/api/v1/fleet/dispatch-assignments', DISPATCH_ASSIGNMENTS_CACHE_KEY, 'Unable to load dispatch assignments');
}

function readCachedDispatchAssignments(): DispatchAssignment[] {
  const cached = localStorage.getItem(DISPATCH_ASSIGNMENTS_CACHE_KEY);
  if (cached) return JSON.parse(cached) as DispatchAssignment[];
  return demoDispatchAssignments;
}

function writeCachedDispatchAssignments(items: DispatchAssignment[]) {
  localStorage.setItem(DISPATCH_ASSIGNMENTS_CACHE_KEY, JSON.stringify(items));
}

export async function createDispatchAssignment(item: DispatchAssignment): Promise<DispatchAssignment> {
  try {
    const data = await apiClient.post<DispatchAssignment>('/api/v1/fleet/dispatch-assignments', item);
    writeCachedDispatchAssignments([data, ...readCachedDispatchAssignments().filter((assignment) => assignment.id !== data.id)]);
    return data;
  } catch {
    const nextItem = { ...item, id: item.id || `dsp-${Date.now()}` };
    writeCachedDispatchAssignments([nextItem, ...readCachedDispatchAssignments()]);
    return nextItem;
  }
}
