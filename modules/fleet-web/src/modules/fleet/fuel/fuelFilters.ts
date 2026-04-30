import { FuelEvent, FuelEventStatus, FuelReconciliationStatus, FuelType } from '../../../types';

export interface FuelEventFilters {
  anomalyStatus: FuelEventStatus | 'All';
  dateFrom: string;
  dateTo: string;
  fuelType: FuelType | 'All';
  vehicleId: string;
}

export const defaultFuelFilters: FuelEventFilters = {
  anomalyStatus: 'All',
  dateFrom: '',
  dateTo: '',
  fuelType: 'All',
  vehicleId: 'All',
};

export function filterFuelEvents(events: FuelEvent[], filters: FuelEventFilters) {
  return events.filter((event) => {
    const eventDate = event.dateTime.slice(0, 10);
    if (filters.vehicleId !== 'All' && event.vehicleId !== filters.vehicleId) return false;
    if (filters.fuelType !== 'All' && event.fuelType !== filters.fuelType) return false;
    if (filters.anomalyStatus !== 'All' && event.status !== filters.anomalyStatus) return false;
    if (filters.dateFrom && eventDate < filters.dateFrom) return false;
    if (filters.dateTo && eventDate > filters.dateTo) return false;
    return true;
  });
}

export function reconciliationTone(status?: FuelReconciliationStatus) {
  if (status === 'Approved' || status === 'Matched') return 'success';
  if (status === 'Rejected') return 'danger';
  return 'warning';
}

export function anomalyTone(status: FuelEventStatus) {
  if (status === 'Posted') return 'success';
  if (status === 'Flagged') return 'danger';
  return 'warning';
}

export function odometerVariance(event: FuelEvent) {
  return Math.abs(((event.odometerKm - event.telematicsOdometerKm) / event.telematicsOdometerKm) * 100);
}
