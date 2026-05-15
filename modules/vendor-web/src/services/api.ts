import apiClient from '../lib/api-client';
import { Vehicle, Driver, Indent, Trip } from '../types';

export const FleetService = {
  getVehicles: async () => {
    const response = await apiClient.get<Vehicle[]>('/vehicles');
    return response.data;
  },
  createVehicle: async (vehicle: Vehicle) => {
    const response = await apiClient.post<Vehicle>('/vehicles', vehicle);
    return response.data;
  },
  getDrivers: async () => {
    const response = await apiClient.get<Driver[]>('/drivers');
    return response.data;
  },
  createDriver: async (driver: Driver) => {
    const response = await apiClient.post<Driver>('/drivers', driver);
    return response.data;
  }
};

export const TripService = {
  getIndents: async () => {
    const response = await apiClient.get<Indent[]>('/indents');
    return response.data;
  },
  acceptIndent: async (indentId: string, vehicleId: string, driverId: string) => {
    const response = await apiClient.post<Indent>(`/indents/${indentId}/accept?vehicleId=${vehicleId}&driverId=${driverId}`);
    return response.data;
  },
  declineIndent: async (indentId: string) => {
    const response = await apiClient.post<Indent>(`/indents/${indentId}/decline`);
    return response.data;
  },
  getTrips: async () => {
    const response = await apiClient.get<Trip[]>('/trips');
    return response.data;
  }
};
