import { apiClient } from './apiClient';
import type { SharedClient, SharedVendor, SharedVehicle } from '../context/OperationalDataStore';

// ── Backend DTO shapes (matching Java records) ─────────────────────────────

interface CustomerApiResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  contactPerson: string | null;
  creditLimit: number | string | null;
  paymentTerms: number | null;
  tdsRate: number | string | null;
  relationshipManager: string | null;
  status: string | null;
}

interface VendorApiResponse {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  category: string | null;
  rating: number | string | null;
  paymentTerms: number | null;
  hasContract: boolean | null;
  contractTerms: string | null;
  status: string | null;
}

interface VehicleApiResponse {
  id: string;
  regNumber: string | null;
  model: string | null;
  vehicleType: string | null;
  capacityTons: number | string | null;
  ownershipType: string | null;
  assignedDriverId: string | null;
  status: string | null;
  odometerKm: number | string | null;
}

interface DriverApiResponse {
  id: string;
  name: string | null;
  phone: string | null;
  assignedVehicleId: string | null;
  status: string | null;
}

export interface SharedDriverRecord {
  id: string;
  name: string;
  phone: string;
  assignedVehicleId?: string;
  status: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toNum(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return isFinite(n) ? n : 0;
}

function toStr(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function normalizeOwnership(type: string | null | undefined): 'owned' | 'leased' | 'hired' {
  const t = (type ?? '').toLowerCase();
  if (t === 'leased') return 'leased';
  if (t === 'hired') return 'hired';
  return 'owned';
}

function normalizeVehicleStatus(status: string | null | undefined): SharedVehicle['status'] {
  const s = (status ?? '').toLowerCase().replace(/[\s-]/g, '_');
  if (s === 'in_transit' || s === 'intransit' || s === 'dispatched') return 'in_transit';
  if (s === 'maintenance') return 'maintenance';
  if (s === 'retired') return 'retired';
  return 'available';
}

// ── Mappers ────────────────────────────────────────────────────────────────

function mapCustomer(c: CustomerApiResponse): SharedClient {
  return {
    id: c.id,
    name: toStr(c.name),
    email: toStr(c.email),
    phone: toStr(c.phone),
    address: toStr(c.address),
    gstin: toStr(c.gstin),
    contactPerson: toStr(c.contactPerson),
    status: (c.status ?? '').toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
    creditLimit: toNum(c.creditLimit),
    paymentTerms: c.paymentTerms ?? 30,
    tdsRate: toNum(c.tdsRate),
    relationshipManager: toStr(c.relationshipManager),
  };
}

function mapVendor(v: VendorApiResponse): SharedVendor {
  return {
    id: v.id,
    name: toStr(v.name),
    code: toStr(v.code),
    email: toStr(v.email),
    phone: toStr(v.phone),
    address: toStr(v.address),
    gstin: toStr(v.gstin),
    category: toStr(v.category),
    rating: toNum(v.rating),
    paymentTerms: v.paymentTerms ?? 30,
    // bankAccount is not exposed by the backend yet — default to empty
    bankAccount: { accountNumber: '', ifscCode: '', bankName: '' },
    hasContract: Boolean(v.hasContract),
    contractTerms: toStr(v.contractTerms),
    status: (v.status ?? '').toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
    // balance is a runtime ledger value tracked in-memory by the context
    balance: 0,
  };
}

function mapVehicle(
  v: VehicleApiResponse,
  driverMap: Map<string, DriverApiResponse>,
): SharedVehicle {
  const driver = v.assignedDriverId ? driverMap.get(v.assignedDriverId) : undefined;
  return {
    id: v.id,
    regNumber: toStr(v.regNumber),
    model: toStr(v.model),
    type: toStr(v.vehicleType),
    capacity: toNum(v.capacityTons),
    ownershipType: normalizeOwnership(v.ownershipType),
    driverName: toStr(driver?.name),
    driverPhone: toStr(driver?.phone),
    status: normalizeVehicleStatus(v.status),
    odometerKm: toNum(v.odometerKm),
  };
}

function mapDriver(d: DriverApiResponse): SharedDriverRecord {
  return {
    id: d.id,
    name: toStr(d.name),
    phone: toStr(d.phone),
    assignedVehicleId: d.assignedVehicleId ?? undefined,
    status: toStr(d.status),
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export const masterDataApi = {
  async fetchCustomers(): Promise<SharedClient[]> {
    const data = await apiClient.get<CustomerApiResponse[]>('/api/v1/master/customers?size=500');
    if (!Array.isArray(data)) return [];
    return data.map(mapCustomer);
  },

  async fetchCustomerById(id: string): Promise<SharedClient> {
    const data = await apiClient.get<CustomerApiResponse>(`/api/v1/master/customers/${encodeURIComponent(id)}`);
    return mapCustomer(data);
  },

  async fetchVendors(): Promise<SharedVendor[]> {
    const data = await apiClient.get<VendorApiResponse[]>('/api/v1/master/vendors?size=500');
    if (!Array.isArray(data)) return [];
    return data.map(mapVendor);
  },

  async fetchVendorById(id: string): Promise<SharedVendor> {
    const data = await apiClient.get<VendorApiResponse>(`/api/v1/master/vendors/${encodeURIComponent(id)}`);
    return mapVendor(data);
  },

  async fetchVehicles(): Promise<SharedVehicle[]> {
    const [vehicles, drivers] = await Promise.all([
      apiClient.get<VehicleApiResponse[]>('/api/v1/master/vehicles?size=500'),
      apiClient
        .get<DriverApiResponse[]>('/api/v1/master/drivers?size=500')
        .catch(() => [] as DriverApiResponse[]),
    ]);
    if (!Array.isArray(vehicles)) return [];
    const driverMap = new Map<string, DriverApiResponse>(
      (Array.isArray(drivers) ? drivers : []).map(d => [d.id, d]),
    );
    return vehicles.map(v => mapVehicle(v, driverMap));
  },

  async fetchVehicleById(id: string): Promise<SharedVehicle> {
    const vehicle = await apiClient.get<VehicleApiResponse>(`/api/v1/master/vehicles/${encodeURIComponent(id)}`);
    const driver = vehicle.assignedDriverId
      ? await apiClient
          .get<DriverApiResponse>(`/api/v1/master/drivers/${encodeURIComponent(vehicle.assignedDriverId)}`)
          .catch(() => null as DriverApiResponse | null)
      : null;
    const driverMap = new Map<string, DriverApiResponse>();
    if (driver?.id) {
      driverMap.set(driver.id, driver);
    }
    return mapVehicle(vehicle, driverMap);
  },

  async fetchDriverById(id: string): Promise<SharedDriverRecord> {
    const data = await apiClient.get<DriverApiResponse>(`/api/v1/master/drivers/${encodeURIComponent(id)}`);
    return mapDriver(data);
  },
};
