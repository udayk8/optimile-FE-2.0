import { DispatchAssignment, FleetAlert, FleetDriver, FleetTask, FleetTaskOverride, MaintenanceWorkOrder, PartInventoryItem, Vehicle } from '../../types';
import { getAlertSeverity } from './fleetRelationships';
import { getVehicleReadiness, getDriverReadiness } from './dispatch/dispatchReadiness';
import { buildPartFromInventoryItem, getInventoryStockStatus } from './procurement/inventoryStock';

interface BuildFleetTasksInput {
  alerts: FleetAlert[];
  assignments: DispatchAssignment[];
  drivers: FleetDriver[];
  inventoryTransactions: Parameters<typeof buildPartFromInventoryItem>[1];
  overrides: Record<string, FleetTaskOverride>;
  partsInventory: PartInventoryItem[];
  vehicles: Vehicle[];
  workOrders: MaintenanceWorkOrder[];
}

const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

export function buildFleetTasks({ alerts, assignments, drivers, inventoryTransactions, overrides, partsInventory, vehicles, workOrders }: BuildFleetTasksInput): FleetTask[] {
  const baseTasks = [
    ...tasksFromAlerts(alerts),
    ...tasksFromBlockedDispatch({ drivers, vehicles, workOrders }),
    ...tasksFromWorkOrders(workOrders),
    ...tasksFromLowStock(partsInventory, inventoryTransactions),
  ];
  return baseTasks
    .map((task) => applyOverride(task, overrides[task.id]))
    .sort((a, b) => taskRank(b) - taskRank(a) || a.dueAt.localeCompare(b.dueAt));
}

export function getTaskEntityPath(task: FleetTask) {
  if (task.relatedEntityType === 'Vehicle') return `/vehicle-management/${task.relatedEntityId}`;
  if (task.relatedEntityType === 'Driver') return `/driver-management/${task.relatedEntityId}`;
  if (task.relatedEntityType === 'WorkOrder') return `/maintenance/${task.relatedEntityId}`;
  if (task.relatedEntityType === 'Part') return `/inventory/${task.relatedEntityId}`;
  return '/dispatch-console';
}

export function isTaskOverdue(task: FleetTask) {
  return task.status !== 'Completed' && task.dueAt.slice(0, 10) < today();
}

function tasksFromAlerts(alerts: FleetAlert[]): FleetTask[] {
  return alerts.map((alert) => ({
    id: `task-alert-${alert.id}`,
    audit: { createdBy: alert.assignedTo ?? 'System' },
    assignedRole: roleForType(typeFromAlert(alert)),
    assignedTo: alert.assignedTo ?? roleForType(typeFromAlert(alert)),
    createdAt: alert.createdAt ? `${alert.createdAt}T09:00:00` : nowIso(),
    dueAt: dueFromSeverity(getAlertSeverity(alert), alert.createdAt),
    relatedEntityId: alert.entityId,
    relatedEntityLabel: alert.entityLabel,
    relatedEntityType: alert.entityType,
    severity: getAlertSeverity(alert),
    sourceId: alert.id,
    sourceType: 'Alert',
    status: alert.status === 'Resolved' ? 'Completed' : 'Open',
    title: alert.title,
    type: typeFromAlert(alert),
    updatedAt: alert.resolvedAt ? `${alert.resolvedAt}T17:00:00` : alert.createdAt ? `${alert.createdAt}T09:00:00` : nowIso(),
  }));
}

function tasksFromBlockedDispatch({ drivers, vehicles, workOrders }: Pick<BuildFleetTasksInput, 'drivers' | 'vehicles' | 'workOrders'>): FleetTask[] {
  const vehicleTasks = vehicles.flatMap((vehicle) => {
    const readiness = getVehicleReadiness(vehicle, workOrders);
    if (readiness.ready) return [];
    const blocker = readiness.blockers[0];
    return [{
      id: `task-dispatch-vehicle-${vehicle.id}`,
      audit: { createdBy: 'Dispatch Engine' },
      assignedRole: 'Operations Manager',
      assignedTo: 'Operations Manager',
      createdAt: nowIso(),
      dueAt: `${today()}T18:00:00`,
      relatedEntityId: vehicle.id,
      relatedEntityLabel: vehicle.registrationNo,
      relatedEntityType: 'Vehicle' as const,
      severity: blocker?.category === 'Compliance' ? 'Critical' as const : 'High' as const,
      sourceId: vehicle.id,
      sourceType: 'Dispatch' as const,
      status: 'Open' as const,
      title: `Resolve dispatch blocker: ${vehicle.registrationNo}`,
      type: 'dispatch' as const,
      updatedAt: nowIso(),
    }];
  });

  const driverTasks = drivers.flatMap((driver) => {
    const readiness = getDriverReadiness(driver);
    if (readiness.ready) return [];
    return [{
      id: `task-dispatch-driver-${driver.id}`,
      audit: { createdBy: 'Dispatch Engine' },
      assignedRole: 'Operations Manager',
      assignedTo: 'Operations Manager',
      createdAt: nowIso(),
      dueAt: `${today()}T18:00:00`,
      relatedEntityId: driver.id,
      relatedEntityLabel: driver.name,
      relatedEntityType: 'Driver' as const,
      severity: driver.behaviorScore < 50 ? 'High' as const : 'Medium' as const,
      sourceId: driver.id,
      sourceType: 'Dispatch' as const,
      status: 'Open' as const,
      title: `Resolve driver readiness: ${driver.name}`,
      type: 'dispatch' as const,
      updatedAt: nowIso(),
    }];
  });

  return [...vehicleTasks, ...driverTasks];
}

function tasksFromWorkOrders(workOrders: MaintenanceWorkOrder[]): FleetTask[] {
  return workOrders.filter((workOrder) => workOrder.status !== 'Completed').map((workOrder) => ({
    id: `task-workorder-${workOrder.id}`,
    audit: { createdBy: workOrder.approvedBy ?? 'Garage Manager' },
    assignedRole: workOrder.approvalRequired ?? 'Garage Manager',
    assignedTo: workOrder.technician,
    createdAt: workOrder.approvedAt ? `${workOrder.approvedAt}T09:00:00` : nowIso(),
    dueAt: `${workOrder.dueDate}T18:00:00`,
    relatedEntityId: workOrder.id,
    relatedEntityLabel: workOrder.title,
    relatedEntityType: 'WorkOrder',
    severity: workOrder.priority === 'High' ? 'High' : 'Medium',
    sourceId: workOrder.id,
    sourceType: 'WorkOrder',
    status: workOrder.status === 'In Progress' || workOrder.status === 'Pending Inspection' ? 'In Progress' : 'Open',
    title: `Complete work order: ${workOrder.title}`,
    type: 'maintenance',
    updatedAt: nowIso(),
  }));
}

function tasksFromLowStock(partsInventory: PartInventoryItem[], inventoryTransactions: Parameters<typeof buildPartFromInventoryItem>[1]): FleetTask[] {
  return partsInventory.flatMap((item) => {
    const part = buildPartFromInventoryItem(item, inventoryTransactions);
    const stockStatus = getInventoryStockStatus(part);
    if (part.status === 'Inactive' || (stockStatus !== 'Low Stock' && stockStatus !== 'Out of Stock')) return [];
    return [{
      id: `task-inventory-${part.partId}`,
      audit: { createdBy: 'Inventory Engine' },
      assignedRole: 'Garage Manager',
      assignedTo: 'Garage Manager',
      createdAt: nowIso(),
      dueAt: `${today()}T17:00:00`,
      relatedEntityId: item.id,
      relatedEntityLabel: part.partName,
      relatedEntityType: 'Part' as const,
      severity: stockStatus === 'Out of Stock' ? 'Critical' as const : 'High' as const,
      sourceId: part.partId,
      sourceType: 'Inventory' as const,
      status: item.status === 'PR Raised' ? 'In Progress' as const : 'Open' as const,
      title: `${stockStatus}: ${part.partName}`,
      type: 'inventory' as const,
      updatedAt: nowIso(),
    }];
  });
}

function typeFromAlert(alert: FleetAlert): FleetTask['type'] {
  if (alert.source === 'Compliance') return 'compliance';
  if (alert.source === 'Maintenance') return 'maintenance';
  if (alert.source === 'Dispatch') return 'dispatch';
  return alert.entityType === 'Part' ? 'inventory' : 'dispatch';
}

function roleForType(type: FleetTask['type']) {
  if (type === 'maintenance' || type === 'inventory') return 'Garage Manager';
  if (type === 'dispatch') return 'Operations Manager';
  return 'Fleet Manager';
}

function dueFromSeverity(severity: FleetTask['severity'], createdAt?: string) {
  const date = createdAt ? new Date(`${createdAt}T09:00:00`) : new Date();
  const hours = severity === 'Critical' ? 4 : severity === 'High' ? 24 : 72;
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function applyOverride(task: FleetTask, override?: FleetTaskOverride): FleetTask {
  if (!override) return task;
  return {
    ...task,
    assignedTo: override.assignedTo ?? task.assignedTo,
    assignedRole: override.assignedRole ?? task.assignedRole,
    audit: {
      ...task.audit,
      assignedBy: override.assignedBy ?? task.audit.assignedBy,
      completedAt: override.completedAt ?? task.audit.completedAt,
      completedBy: override.completedBy ?? task.audit.completedBy,
    },
    status: override.status ?? task.status,
    updatedAt: override.updatedAt ?? task.updatedAt,
  };
}

function taskRank(task: FleetTask) {
  const status = task.status === 'Completed' ? 0 : task.status === 'In Progress' ? 2 : 3;
  const severity = { Critical: 3, High: 2, Medium: 1 }[task.severity];
  return status * 10 + severity;
}
