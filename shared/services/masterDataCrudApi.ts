// ============================================================
// Master Data CRUD API — write operations
// ============================================================
// Wraps POST / PUT / DELETE for Vendor, Customer, Vehicle,
// and Driver master data endpoints.
//
// Consumed by:
//   - masterDataStore.ts  (vendor + customer writes)
//   - fleet mockDatabase.ts (vehicle + driver writes — Phase 9B)
//
// All methods return void. The caller's in-memory store remains
// the reactive source of truth; the backend persists for
// cross-session durability.
// ============================================================

import { apiClient } from './apiClient';

const BASE_VENDOR   = '/api/v1/master/vendors';
const BASE_CUSTOMER = '/api/v1/master/customers';
const BASE_VEHICLE  = '/api/v1/master/vehicles';
const BASE_DRIVER   = '/api/v1/master/drivers';

// ── Vendor DTOs ────────────────────────────────────────────

export interface VendorCreateRequest {
  id?: string;
  companyName: string;
  legalEntityName?: string;
  type: 'Company' | 'Individual' | 'Broker';
  status: string;
  verificationLevel?: 'BASIC' | 'FULL';
  createdFrom?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  zonesServed?: string[];
  vehicleTypes?: string[];
  fleetSize?: number;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBeneficiaryName?: string;
  bankName?: string;
}

export interface VendorUpdateRequest {
  companyName?: string;
  legalEntityName?: string;
  type?: string;
  status?: string;
  verificationLevel?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  zonesServed?: string[];
  vehicleTypes?: string[];
  fleetSize?: number;
}

// ── Customer DTOs ──────────────────────────────────────────

export interface CustomerCreateRequest {
  id?: string;
  name: string;
  legalName?: string;
  tier?: 'Premium' | 'Standard' | 'Basic';
  status?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  gstin?: string;
  pan?: string;
  billingAddress?: string;
  creditLimit?: number;
  creditDays?: number;
  tdsApplicable?: boolean;
  tdsRate?: number;
}

export interface CustomerUpdateRequest {
  name?: string;
  legalName?: string;
  tier?: string;
  status?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  gstin?: string;
  pan?: string;
  billingAddress?: string;
  creditLimit?: number;
  creditDays?: number;
}

// ── Vehicle DTOs ───────────────────────────────────────────

export interface VehicleCreateRequest {
  id?: string;
  registrationNumber: string;
  vehicleType: string;
  make?: string;
  model?: string;
  year?: number;
  capacity?: number;
  fuelType?: string;
  status?: string;
  hubId?: string;
  driverId?: string;
}

export interface VehicleUpdateRequest {
  registrationNumber?: string;
  vehicleType?: string;
  status?: string;
  hubId?: string;
  driverId?: string;
  make?: string;
  model?: string;
  capacity?: number;
}

// ── Driver DTOs ────────────────────────────────────────────

export interface DriverCreateRequest {
  id?: string;
  name: string;
  phone: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  status?: string;
  vehicleId?: string;
  hubId?: string;
}

export interface DriverUpdateRequest {
  name?: string;
  phone?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  status?: string;
  vehicleId?: string;
  hubId?: string;
}

// ── Public API ─────────────────────────────────────────────

export const masterDataCrudApi = {

  // ── Vendors ──────────────────────────────────────────────

  async createVendor(req: VendorCreateRequest): Promise<void> {
    await apiClient.post(BASE_VENDOR, req);
  },

  async updateVendor(id: string, req: VendorUpdateRequest): Promise<void> {
    await apiClient.put(`${BASE_VENDOR}/${id}`, req);
  },

  async deleteVendor(id: string): Promise<void> {
    await apiClient.delete(`${BASE_VENDOR}/${id}`);
  },

  // ── Customers ─────────────────────────────────────────────

  async createCustomer(req: CustomerCreateRequest): Promise<void> {
    await apiClient.post(BASE_CUSTOMER, req);
  },

  async updateCustomer(id: string, req: CustomerUpdateRequest): Promise<void> {
    await apiClient.put(`${BASE_CUSTOMER}/${id}`, req);
  },

  async deleteCustomer(id: string): Promise<void> {
    await apiClient.delete(`${BASE_CUSTOMER}/${id}`);
  },

  // ── Vehicles ──────────────────────────────────────────────

  async createVehicle(req: VehicleCreateRequest): Promise<void> {
    await apiClient.post(BASE_VEHICLE, req);
  },

  async updateVehicle(id: string, req: VehicleUpdateRequest): Promise<void> {
    await apiClient.put(`${BASE_VEHICLE}/${id}`, req);
  },

  async deleteVehicle(id: string): Promise<void> {
    await apiClient.delete(`${BASE_VEHICLE}/${id}`);
  },

  // ── Drivers ───────────────────────────────────────────────

  async createDriver(req: DriverCreateRequest): Promise<void> {
    await apiClient.post(BASE_DRIVER, req);
  },

  async updateDriver(id: string, req: DriverUpdateRequest): Promise<void> {
    await apiClient.put(`${BASE_DRIVER}/${id}`, req);
  },

  async deleteDriver(id: string): Promise<void> {
    await apiClient.delete(`${BASE_DRIVER}/${id}`);
  },
};
