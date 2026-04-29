import { DocumentStatus, TyreHealth, VehicleStatus } from '../../types';

export function vehicleStatusClass(status: VehicleStatus) {
  return {
    Active: 'bg-success/10 text-success ring-success/20',
    Maintenance: 'bg-warning/10 text-warning ring-warning/20',
    Inactive: 'bg-gray-100 text-gray-600 ring-gray-200',
  }[status];
}

export function documentStatusClass(status: DocumentStatus) {
  return {
    Valid: 'text-success',
    Expiring: 'text-warning',
    Expired: 'text-danger',
  }[status];
}

export function tyreHealthClass(health: TyreHealth) {
  return {
    Good: 'bg-success',
    Watch: 'bg-warning',
    Critical: 'bg-danger',
  }[health];
}
