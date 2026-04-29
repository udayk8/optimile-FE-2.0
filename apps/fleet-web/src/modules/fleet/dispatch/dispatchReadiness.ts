import { FleetDriver, MaintenanceWorkOrder, Vehicle } from '../../../types';

export interface ReadinessResult {
  blockedReasons: string[];
  blockers: ReadinessBlocker[];
  warnings: string[];
  ready: boolean;
}

export interface ReadinessBlocker {
  category: 'Compliance' | 'Maintenance' | 'Driver readiness';
  reason: string;
  suggestedAction: string;
}

const today = new Date().toISOString().slice(0, 10);

export function getVehicleReadiness(vehicle: Vehicle, workOrders: MaintenanceWorkOrder[]): ReadinessResult {
  const blockedReasons: string[] = [];
  const blockers: ReadinessBlocker[] = [];
  const warnings: string[] = [];
  const activeWorkOrders = workOrders.filter((order) => order.vehicleId === vehicle.id && order.status !== 'Completed');

  if (vehicle.status !== 'Active') blockers.push({ category: 'Maintenance', reason: `Vehicle status is ${vehicle.status}.`, suggestedAction: 'Review vehicle status' });
  if (activeWorkOrders.length > 0) blockers.push({ category: 'Maintenance', reason: `${activeWorkOrders.length} active maintenance work order${activeWorkOrders.length > 1 ? 's' : ''}.`, suggestedAction: 'Close or defer work order' });

  vehicle.documents.forEach((document) => {
    if (document.status === 'Expired' || document.expiryDate < today) blockers.push({ category: 'Compliance', reason: `${document.name} is expired.`, suggestedAction: `Upload ${document.name}` });
    if (document.status === 'Expiring') warnings.push(`${document.name} expires in ${document.daysRemaining} days.`);
  });

  blockedReasons.push(...blockers.map((blocker) => blocker.reason));
  return { blockedReasons, blockers, ready: blockers.length === 0, warnings };
}

export function getDriverReadiness(driver: FleetDriver): ReadinessResult {
  const blockedReasons: string[] = [];
  const blockers: ReadinessBlocker[] = [];
  const warnings: string[] = [];

  if (driver.assignmentStatus !== 'Available') blockers.push({ category: 'Driver readiness', reason: `Driver status is ${driver.assignmentStatus}.`, suggestedAction: 'Release or update driver assignment' });
  if (driver.licenseExpiryDate < today) blockers.push({ category: 'Driver readiness', reason: 'Driver license is expired.', suggestedAction: 'Renew driver license' });
  if (driver.medicalExpiryDate < today) blockers.push({ category: 'Driver readiness', reason: 'Driver medical certificate is expired.', suggestedAction: 'Upload medical certificate' });
  if (driver.behaviorScore < 50) blockers.push({ category: 'Driver readiness', reason: 'Driver behavior score is below dispatch threshold.', suggestedAction: 'Complete coaching review' });
  if (driver.coachingStatus === 'Coaching Required') warnings.push('Driver has mandatory coaching flag.');
  if (driver.behaviorScore < 70 && driver.behaviorScore >= 50) warnings.push('Driver behavior score is in watch band.');

  blockedReasons.push(...blockers.map((blocker) => blocker.reason));
  return { blockedReasons, blockers, ready: blockers.length === 0, warnings };
}

export function buildDispatchAssignmentId() {
  return `dsp-${Date.now()}`;
}
