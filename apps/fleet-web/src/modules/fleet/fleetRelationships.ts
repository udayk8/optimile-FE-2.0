import { AlertEntityType, DispatchAssignment, FleetAlert, InventoryTransaction, MaintenanceWorkOrder, WorkOrderPartUsage } from '../../types';

export function getWorkOrdersByVehicle(workOrders: MaintenanceWorkOrder[], vehicleId: string) {
  return workOrders.filter((workOrder) => workOrder.vehicleId === vehicleId);
}

export function getPartsUsedByVehicle(workOrders: MaintenanceWorkOrder[], vehicleId: string): WorkOrderPartUsage[] {
  return getWorkOrdersByVehicle(workOrders, vehicleId).flatMap((workOrder) => workOrder.partsUsed ?? []);
}

export function getTransactionsByWorkOrder(transactions: InventoryTransaction[], workOrderId: string) {
  return transactions.filter((transaction) => transaction.referenceType === 'Work Order' && transaction.referenceId === workOrderId);
}

export function getWorkOrdersByPart(workOrders: MaintenanceWorkOrder[], partId: string) {
  return workOrders.filter((workOrder) => workOrder.partsUsed?.some((part) => part.partId === partId || part.partNumber === partId));
}

export function getAlertsByEntity(alerts: FleetAlert[], entityType: AlertEntityType, entityId: string) {
  return alerts.filter((alert) => alert.entityType === entityType && alert.entityId === entityId);
}

export function getAssignmentsByDriver(assignments: DispatchAssignment[], driverId: string) {
  return assignments.filter((assignment) => assignment.driverId === driverId);
}

export function getAssignmentsByVehicle(assignments: DispatchAssignment[], vehicleId: string) {
  return assignments.filter((assignment) => assignment.vehicleId === vehicleId);
}

export function getAlertSeverity(alert: FleetAlert) {
  return alert.severity ?? alert.priority ?? 'Medium';
}
