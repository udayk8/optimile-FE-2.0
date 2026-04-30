// ============================================================
// Optimile ERP — Operational Data Store (Type Definitions)
// ============================================================
// Shared type definitions consumed by OperationalDataContext,
// tripsApi, masterDataApi, and all modules (TMS, Finance, Fleet).
// All data is fetched from backend APIs — no seed/mock arrays.
// ============================================================

// ── Type Definitions ───────────────────────────────────────

export type PayableStatus =
  | 'pending_advance'
  | 'advance_paid'
  | 'pending_balance'
  | 'fully_paid'
  | 'disputed'
  | 'settled';

export interface VendorPayable {
  vendorId: string;
  advancePercentage: number;
  advanceAmount: number;
  advancePaid: boolean;
  advanceDate?: string;
  balanceAmount: number;
  balancePaid: boolean;
  balanceDate?: string;
  status: PayableStatus;
  podClean?: boolean;
  podRemarks?: string;
  invoiceReceived?: boolean;
  invoiceNumber?: string;
  invoiceDate?: string;
}

export interface CompletedTrip {
  id: string;
  bookingRef: string;
  clientId: string;
  clientName: string;
  origin: string;
  destination: string;
  distanceKm: number;
  status: 'booked' | 'in_transit' | 'delivered' | 'pod_received' | 'invoiced';
  bookedDate: string;
  dispatchDate: string;
  deliveredDate?: string;
  podReceivedDate?: string;
  vehicleId?: string;
  vehicleRegNumber?: string;
  driverName?: string;
  driverPhone?: string;
  tripType: 'own_vehicle' | 'contracted_vendor' | 'market_hire';
  bookingMode: 'FTL' | 'LTL' | 'PARTIAL';
  revenueAmount: number;
  totalCost: number;
  vendorId?: string;
  vendorName?: string;
  vendorPayable?: VendorPayable;
  podVerified: boolean;
  podUrl?: string;
  invoiced: boolean;
  invoiceId?: string;
  costBreakdown?: CostBreakdown;
}

export interface CostBreakdown {
  fuel: number;
  driver: number;
  toll: number;
  maintenance: number;
  overhead: number;
}

export interface SharedClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  contactPerson: string;
  status: 'Active' | 'Inactive';
  creditLimit: number;
  paymentTerms: number;
  tdsRate: number;
  relationshipManager: string;
}

export interface SharedVendor {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  category: string;
  rating: number;
  paymentTerms: number;
  bankAccount: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  hasContract: boolean;
  contractTerms?: string;
  status: 'Active' | 'Inactive';
  balance: number;
}

export interface SharedVehicle {
  id: string;
  regNumber: string;
  model: string;
  type: string;
  capacity: number; // in tons
  ownershipType: 'owned' | 'leased' | 'hired';
  driverName: string;
  driverPhone: string;
  status: 'available' | 'in_transit' | 'maintenance' | 'retired';
  odometerKm: number;
}

export interface CostBreakdownConfig {
  fuelCostPct: number;
  driverCostPct: number;
  tollPct: number;
  maintenancePct: number;
  overheadPct: number;
}


export const DEFAULT_COST_BREAKDOWN: CostBreakdownConfig = {
  fuelCostPct: 55,
  driverCostPct: 18,
  tollPct: 8,
  maintenancePct: 12,
  overheadPct: 7,
};
