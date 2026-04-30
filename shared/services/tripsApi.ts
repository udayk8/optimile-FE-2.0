import { apiClient, ApiError } from './apiClient';
import type { CompletedTrip, CostBreakdown, PayableStatus, VendorPayable } from '../context/OperationalDataStore';

type NumericLike = number | string | null | undefined;

interface TripVendorPayableResponseDto {
  vendorId: string | null;
  advancePercentage: NumericLike;
  advanceAmount: NumericLike;
  advancePaid: boolean | null;
  advanceDate: string | null;
  balanceAmount: NumericLike;
  balancePaid: boolean | null;
  balanceDate: string | null;
  status: string | null;
  podClean: boolean | null;
  podRemarks: string | null;
  invoiceReceived: boolean | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
}

interface TripCostBreakdownResponseDto {
  fuel: NumericLike;
  driver: NumericLike;
  toll: NumericLike;
  maintenance: NumericLike;
  overhead: NumericLike;
}

interface TripVendorPayableRequestDto {
  vendorId?: string;
  advancePercentage?: number;
  advanceAmount?: number;
  advancePaid?: boolean;
  advanceDate?: string;
  balanceAmount?: number;
  balancePaid?: boolean;
  balanceDate?: string;
  status?: PayableStatus;
  podClean?: boolean;
  podRemarks?: string;
  invoiceReceived?: boolean;
  invoiceNumber?: string;
  invoiceDate?: string;
}

interface TripCostBreakdownRequestDto {
  fuel: number;
  driver: number;
  toll: number;
  maintenance: number;
  overhead: number;
}

interface TripCreateRequestDto {
  id?: string;
  bookingRef?: string;
  clientId: string;
  clientName?: string;
  origin: string;
  destination: string;
  distanceKm: number;
  status: CompletedTrip['status'];
  bookedDate?: string;
  dispatchDate?: string;
  deliveredDate?: string;
  podReceivedDate?: string;
  vehicleId?: string;
  vehicleRegNumber?: string;
  driverName?: string;
  driverPhone?: string;
  tripType: CompletedTrip['tripType'];
  bookingMode: CompletedTrip['bookingMode'];
  revenueAmount: number;
  totalCost: number;
  vendorId?: string;
  vendorName?: string;
  vendorPayable?: TripVendorPayableRequestDto;
  podVerified?: boolean;
  podUrl?: string;
  invoiced?: boolean;
  invoiceId?: string;
  costBreakdown?: TripCostBreakdownRequestDto;
}

interface MarkInvoicedRequestDto {
  invoiceId: string;
}

interface MarkInvoicedResponseDto {
  id: string;
  externalId?: string;
  bookingRef: string | null;
  status: string | null;
  invoiced: boolean | null;
  invoiceId: string | null;
}

export interface MarkInvoicedResult {
  id: string;
  bookingRef?: string;
  status: CompletedTrip['status'];
  invoiced: boolean;
  invoiceId?: string;
}

export interface TripReadResponseDto {
  id: string;
  externalId?: string;
  bookingRef: string | null;
  clientId: string | null;
  clientName: string | null;
  origin: string | null;
  destination: string | null;
  distanceKm: NumericLike;
  status: string | null;
  bookedDate: string | null;
  dispatchDate: string | null;
  deliveredDate: string | null;
  podReceivedDate: string | null;
  vehicleId: string | null;
  vehicleRegNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  tripType: string | null;
  bookingMode: string | null;
  revenueAmount: NumericLike;
  totalCost: NumericLike;
  vendorId: string | null;
  vendorName: string | null;
  vendorPayable: TripVendorPayableResponseDto | null;
  podVerified: boolean | null;
  podUrl: string | null;
  invoiced: boolean | null;
  invoiceId: string | null;
  costBreakdown: TripCostBreakdownResponseDto | null;
}

interface TripExpenseReadResponseDto {
  id: string;
  externalId?: string;
  tripId: string | null;
  tripExternalId?: string;
  category: string | null;
  description: string | null;
  amount: NumericLike;
  quantity: NumericLike;
  rate: NumericLike;
  date: string | null;
  time: string | null;
  location: {
    name: string | null;
    address: string | null;
  } | null;
  status: string | null;
  rejectionReason: string | null;
  submittedBy: {
    name: string | null;
    role: string | null;
    time: string | null;
  } | null;
  receiptUrl: string | null;
  isAdvance: boolean | null;
  advanceType: string | null;
  paymentStatus: string | null;
  paidDate: string | null;
  paidBy: string | null;
  remarks: string | null;
}

export interface TripExpenseReadModel {
  id: string;
  tripId: string;
  category: string;
  description: string;
  amount: number;
  quantity?: number;
  rate?: number;
  date: string;
  time: string;
  location?: { name: string; address: string };
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  submittedBy: { name: string; role: string; time: string };
  receiptUrl?: string;
  isAdvance?: boolean;
  advanceType?: 'fuel' | 'driver_batta' | 'toll' | 'vendor_advance' | 'other';
  paymentStatus?: 'pending_payment' | 'paid';
  paidDate?: string;
  paidBy?: string;
  remarks?: string;
}

const TRIP_STATUSES: CompletedTrip['status'][] = ['booked', 'in_transit', 'delivered', 'pod_received', 'invoiced'];
const TRIP_TYPES: CompletedTrip['tripType'][] = ['own_vehicle', 'contracted_vendor', 'market_hire'];
const BOOKING_MODES: CompletedTrip['bookingMode'][] = ['FTL', 'LTL', 'PARTIAL'];
const PAYABLE_STATUSES: PayableStatus[] = ['pending_advance', 'advance_paid', 'pending_balance', 'fully_paid', 'disputed', 'settled'];

function toNumber(value: NumericLike): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toDate(value: string | null | undefined): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return value;
}

function toOptionalString(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toNonNegativeNumber(value: NumericLike, fallback = 0): number {
  const normalized = toNumber(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    return fallback;
  }
  return normalized;
}

function normalizeStatus(status: string | null | undefined): CompletedTrip['status'] {
  const candidate = (status || '').trim().toLowerCase().replace('-', '_');
  if (TRIP_STATUSES.includes(candidate as CompletedTrip['status'])) {
    return candidate as CompletedTrip['status'];
  }
  return 'booked';
}

function normalizeTripType(tripType: string | null | undefined): CompletedTrip['tripType'] {
  const candidate = (tripType || '').trim().toLowerCase().replace('-', '_');
  if (TRIP_TYPES.includes(candidate as CompletedTrip['tripType'])) {
    return candidate as CompletedTrip['tripType'];
  }
  return 'own_vehicle';
}

function normalizeBookingMode(mode: string | null | undefined): CompletedTrip['bookingMode'] {
  const candidate = (mode || '').trim().toUpperCase();
  if (BOOKING_MODES.includes(candidate as CompletedTrip['bookingMode'])) {
    return candidate as CompletedTrip['bookingMode'];
  }
  return 'FTL';
}

function normalizePayableStatus(status: string | null | undefined): PayableStatus {
  const candidate = (status || '').trim().toLowerCase().replace('-', '_');
  if (PAYABLE_STATUSES.includes(candidate as PayableStatus)) {
    return candidate as PayableStatus;
  }
  return 'pending_advance';
}

function mapCostBreakdown(costBreakdown: TripCostBreakdownResponseDto | null): CostBreakdown | undefined {
  if (!costBreakdown) {
    return undefined;
  }

  return {
    fuel: toNumber(costBreakdown.fuel),
    driver: toNumber(costBreakdown.driver),
    toll: toNumber(costBreakdown.toll),
    maintenance: toNumber(costBreakdown.maintenance),
    overhead: toNumber(costBreakdown.overhead),
  };
}

function mapVendorPayable(vendorPayable: TripVendorPayableResponseDto | null): VendorPayable | undefined {
  if (!vendorPayable) {
    return undefined;
  }

  return {
    vendorId: vendorPayable.vendorId || '',
    advancePercentage: toNumber(vendorPayable.advancePercentage),
    advanceAmount: toNumber(vendorPayable.advanceAmount),
    advancePaid: Boolean(vendorPayable.advancePaid),
    advanceDate: toDate(vendorPayable.advanceDate),
    balanceAmount: toNumber(vendorPayable.balanceAmount),
    balancePaid: Boolean(vendorPayable.balancePaid),
    balanceDate: toDate(vendorPayable.balanceDate),
    status: normalizePayableStatus(vendorPayable.status),
    podClean: vendorPayable.podClean ?? undefined,
    podRemarks: vendorPayable.podRemarks || undefined,
    invoiceReceived: vendorPayable.invoiceReceived ?? undefined,
    invoiceNumber: vendorPayable.invoiceNumber || undefined,
    invoiceDate: toDate(vendorPayable.invoiceDate),
  };
}

function mapVendorPayableForCreate(vendorPayable: VendorPayable | null | undefined): TripVendorPayableRequestDto | undefined {
  if (!vendorPayable) {
    return undefined;
  }

  return {
    vendorId: toOptionalString(vendorPayable.vendorId),
    advancePercentage: toNonNegativeNumber(vendorPayable.advancePercentage),
    advanceAmount: toNonNegativeNumber(vendorPayable.advanceAmount),
    advancePaid: Boolean(vendorPayable.advancePaid),
    advanceDate: toDate(vendorPayable.advanceDate),
    balanceAmount: toNonNegativeNumber(vendorPayable.balanceAmount),
    balancePaid: Boolean(vendorPayable.balancePaid),
    balanceDate: toDate(vendorPayable.balanceDate),
    status: normalizePayableStatus(vendorPayable.status),
    podClean: vendorPayable.podClean,
    podRemarks: toOptionalString(vendorPayable.podRemarks),
    invoiceReceived: vendorPayable.invoiceReceived,
    invoiceNumber: toOptionalString(vendorPayable.invoiceNumber),
    invoiceDate: toDate(vendorPayable.invoiceDate),
  };
}

function mapCostBreakdownForCreate(costBreakdown: CostBreakdown | null | undefined): TripCostBreakdownRequestDto | undefined {
  if (!costBreakdown) {
    return undefined;
  }
  return {
    fuel: toNonNegativeNumber(costBreakdown.fuel),
    driver: toNonNegativeNumber(costBreakdown.driver),
    toll: toNonNegativeNumber(costBreakdown.toll),
    maintenance: toNonNegativeNumber(costBreakdown.maintenance),
    overhead: toNonNegativeNumber(costBreakdown.overhead),
  };
}

export function mapCompletedTripToTripCreateRequest(tripData: Partial<CompletedTrip>): TripCreateRequestDto {
  const revenueAmount = toNonNegativeNumber(tripData.revenueAmount);
  const totalCost = toNonNegativeNumber(tripData.totalCost);

  return {
    id: toOptionalString(tripData.id),
    bookingRef: toOptionalString(tripData.bookingRef),
    clientId: toOptionalString(tripData.clientId) || '',
    clientName: toOptionalString(tripData.clientName),
    origin: toOptionalString(tripData.origin) || '',
    destination: toOptionalString(tripData.destination) || '',
    distanceKm: toNonNegativeNumber(tripData.distanceKm),
    status: normalizeStatus(tripData.status),
    bookedDate: toDate(tripData.bookedDate),
    dispatchDate: toDate(tripData.dispatchDate),
    deliveredDate: toDate(tripData.deliveredDate),
    podReceivedDate: toDate(tripData.podReceivedDate),
    vehicleId: toOptionalString(tripData.vehicleId),
    vehicleRegNumber: toOptionalString(tripData.vehicleRegNumber),
    driverName: toOptionalString(tripData.driverName),
    driverPhone: toOptionalString(tripData.driverPhone),
    tripType: normalizeTripType(tripData.tripType),
    bookingMode: normalizeBookingMode(tripData.bookingMode),
    revenueAmount,
    totalCost,
    vendorId: toOptionalString(tripData.vendorId),
    vendorName: toOptionalString(tripData.vendorName),
    vendorPayable: mapVendorPayableForCreate(tripData.vendorPayable),
    podVerified: tripData.podVerified,
    podUrl: toOptionalString(tripData.podUrl),
    invoiced: tripData.invoiced,
    invoiceId: toOptionalString(tripData.invoiceId),
    costBreakdown: mapCostBreakdownForCreate(tripData.costBreakdown),
  };
}

export function mapTripReadResponseToCompletedTrip(trip: TripReadResponseDto): CompletedTrip {
  const canonicalTripId = (trip.id || trip.externalId || '').trim();

  return {
    id: canonicalTripId,
    bookingRef: trip.bookingRef || canonicalTripId,
    clientId: trip.clientId || '',
    clientName: trip.clientName || '',
    origin: trip.origin || '',
    destination: trip.destination || '',
    distanceKm: toNumber(trip.distanceKm),
    status: normalizeStatus(trip.status),
    bookedDate: trip.bookedDate || '',
    dispatchDate: trip.dispatchDate || '',
    deliveredDate: toDate(trip.deliveredDate),
    podReceivedDate: toDate(trip.podReceivedDate),
    vehicleId: trip.vehicleId || undefined,
    vehicleRegNumber: trip.vehicleRegNumber || undefined,
    driverName: trip.driverName || undefined,
    driverPhone: trip.driverPhone || undefined,
    tripType: normalizeTripType(trip.tripType),
    bookingMode: normalizeBookingMode(trip.bookingMode),
    revenueAmount: toNumber(trip.revenueAmount),
    totalCost: toNumber(trip.totalCost),
    vendorId: trip.vendorId || undefined,
    vendorName: trip.vendorName || undefined,
    vendorPayable: mapVendorPayable(trip.vendorPayable),
    podVerified: Boolean(trip.podVerified),
    podUrl: trip.podUrl || undefined,
    invoiced: Boolean(trip.invoiced),
    invoiceId: trip.invoiceId || undefined,
    costBreakdown: mapCostBreakdown(trip.costBreakdown),
  };
}

function mapTripExpenseStatus(status: string | null | undefined): TripExpenseReadModel['status'] {
  const candidate = (status || '').trim().toLowerCase();
  if (candidate === 'approved') {
    return 'Approved';
  }
  if (candidate === 'rejected') {
    return 'Rejected';
  }
  return 'Pending';
}

function mapTripExpenseReadResponse(expense: TripExpenseReadResponseDto): TripExpenseReadModel {
  return {
    id: (expense.id || expense.externalId || '').trim(),
    tripId: (expense.tripId || expense.tripExternalId || '').trim(),
    category: expense.category || '',
    description: expense.description || '',
    amount: toNumber(expense.amount),
    quantity: expense.quantity == null ? undefined : toNumber(expense.quantity),
    rate: expense.rate == null ? undefined : toNumber(expense.rate),
    date: expense.date || '',
    time: expense.time || '',
    location: expense.location && (expense.location.name || expense.location.address)
      ? {
          name: expense.location.name || '',
          address: expense.location.address || '',
        }
      : undefined,
    status: mapTripExpenseStatus(expense.status),
    rejectionReason: toOptionalString(expense.rejectionReason),
    submittedBy: {
      name: expense.submittedBy?.name || '',
      role: expense.submittedBy?.role || '',
      time: expense.submittedBy?.time || '',
    },
    receiptUrl: toOptionalString(expense.receiptUrl),
    isAdvance: expense.isAdvance ?? undefined,
    advanceType: (toOptionalString(expense.advanceType) as TripExpenseReadModel['advanceType']) ?? undefined,
    paymentStatus: (toOptionalString(expense.paymentStatus) as TripExpenseReadModel['paymentStatus']) ?? undefined,
    paidDate: toDate(expense.paidDate),
    paidBy: toOptionalString(expense.paidBy),
    remarks: toOptionalString(expense.remarks),
  };
}

function mapMarkInvoicedResponse(response: MarkInvoicedResponseDto): MarkInvoicedResult {
  return {
    id: (response.id || response.externalId || '').trim(),
    bookingRef: toOptionalString(response.bookingRef),
    status: normalizeStatus(response.status),
    invoiced: Boolean(response.invoiced),
    invoiceId: toOptionalString(response.invoiceId),
  };
}

// ── Action request DTOs ────────────────────────────────────

export interface AssignVehicleRequest {
  vehicleId: string;
  vehicleRegNumber?: string;
  driverName?: string;
  driverPhone?: string;
}

export interface AssignMarketHireRequest {
  vendorId: string;
  vehicleRegNumber?: string;
  driverName?: string;
  driverPhone?: string;
  freightAmount?: number;
}

export interface MarkDeliveredRequest {
  deliveredDate?: string;
}

export interface MarkPodReceivedRequest {
  podClean: boolean;
  podRemarks?: string;
  podReceivedDate?: string;
}

export interface SetStatusRequest {
  status: string;
}

export interface TripExpenseRequest {
  id?: string;
  category: string;
  description: string;
  amount: number;
  quantity?: number;
  rate?: number;
  date: string;
  status?: string;
  isAdvance?: boolean;
  advanceType?: string;
}

export interface TripUpdateRequest {
  status?: string;
  dispatchDate?: string;
  deliveredDate?: string;
  podReceivedDate?: string;
  vehicleId?: string;
  vehicleRegNumber?: string;
  driverName?: string;
  driverPhone?: string;
  vendorId?: string;
  vendorName?: string;
  totalCost?: number;
  invoiced?: boolean;
  invoiceId?: string;
  podVerified?: boolean;
  podUrl?: string;
}

export interface RequestAdvanceRequest {
  advancePercentage: number;
  advanceAmount: number;
}

export interface VendorInvoiceRequest {
  invoiceNumber: string;
  invoiceDate?: string;
}

export const tripsApi = {
  async listTrips(): Promise<CompletedTrip[]> {
    try {
      const trips = await apiClient.get<TripReadResponseDto[]>('/api/v1/trips');
      if (!Array.isArray(trips)) {
        return [];
      }
      return trips.map(mapTripReadResponseToCompletedTrip);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405)) {
        const legacyTrips = await apiClient.get<TripReadResponseDto[]>('/trips');
        if (!Array.isArray(legacyTrips)) {
          return [];
        }
        return legacyTrips.map(mapTripReadResponseToCompletedTrip);
      }
      throw error;
    }
  },

  async getTrip(tripId: string): Promise<CompletedTrip> {
    const encodedTripId = encodeURIComponent(tripId);

    try {
      const trip = await apiClient.get<TripReadResponseDto>(`/api/v1/trips/${encodedTripId}`);
      return mapTripReadResponseToCompletedTrip(trip);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405)) {
        const legacyTrip = await apiClient.get<TripReadResponseDto>(`/trips/${encodedTripId}`);
        return mapTripReadResponseToCompletedTrip(legacyTrip);
      }
      throw error;
    }
  },

  async getTripByBookingRef(bookingRef: string): Promise<CompletedTrip> {
    const encodedBookingRef = encodeURIComponent(bookingRef);

    try {
      const trip = await apiClient.get<TripReadResponseDto>(`/api/v1/trips/lookup/by-booking-ref/${encodedBookingRef}`);
      return mapTripReadResponseToCompletedTrip(trip);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405)) {
        const legacyTrip = await apiClient.get<TripReadResponseDto>(`/trips/lookup/by-booking-ref/${encodedBookingRef}`);
        return mapTripReadResponseToCompletedTrip(legacyTrip);
      }
      throw error;
    }
  },

  async listTripExpenses(tripId: string): Promise<TripExpenseReadModel[]> {
    const encodedTripId = encodeURIComponent(tripId);

    try {
      const expenses = await apiClient.get<TripExpenseReadResponseDto[]>(`/api/v1/trips/${encodedTripId}/expenses`);
      if (!Array.isArray(expenses)) {
        return [];
      }
      return expenses.map(mapTripExpenseReadResponse);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405)) {
        const legacyExpenses = await apiClient.get<TripExpenseReadResponseDto[]>(`/trips/${encodedTripId}/expenses`);
        if (!Array.isArray(legacyExpenses)) {
          return [];
        }
        return legacyExpenses.map(mapTripExpenseReadResponse);
      }
      throw error;
    }
  },

  async getVendorPayable(tripId: string): Promise<VendorPayable> {
    const encodedTripId = encodeURIComponent(tripId);

    try {
      const payable = await apiClient.get<TripVendorPayableResponseDto>(`/api/v1/trips/${encodedTripId}/vendor-payable`);
      return mapVendorPayable(payable) || {
        vendorId: '',
        advancePercentage: 0,
        advanceAmount: 0,
        advancePaid: false,
        balanceAmount: 0,
        balancePaid: false,
        status: 'pending_advance',
      };
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405)) {
        const legacyPayable = await apiClient.get<TripVendorPayableResponseDto>(`/trips/${encodedTripId}/vendor-payable`);
        return mapVendorPayable(legacyPayable) || {
          vendorId: '',
          advancePercentage: 0,
          advanceAmount: 0,
          advancePaid: false,
          balanceAmount: 0,
          balancePaid: false,
          status: 'pending_advance',
        };
      }
      throw error;
    }
  },

  async createTrip(tripData: Partial<CompletedTrip>): Promise<CompletedTrip> {
    const payload = mapCompletedTripToTripCreateRequest(tripData);

    try {
      const createdTrip = await apiClient.post<TripReadResponseDto>('/api/v1/trips', payload);
      return mapTripReadResponseToCompletedTrip(createdTrip);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405)) {
        const createdLegacyTrip = await apiClient.post<TripReadResponseDto>('/trips', payload);
        return mapTripReadResponseToCompletedTrip(createdLegacyTrip);
      }
      throw error;
    }
  },

  async updateTrip(tripId: string, req: TripUpdateRequest): Promise<void> {
    await apiClient.put(`/api/v1/trips/${encodeURIComponent(tripId)}`, req);
  },

  async assignVehicle(tripId: string, req: AssignVehicleRequest): Promise<void> {
    await apiClient.post(`/api/v1/trips/${encodeURIComponent(tripId)}/actions/assign-vehicle`, req);
  },

  async assignMarketHire(tripId: string, req: AssignMarketHireRequest): Promise<void> {
    await apiClient.post(`/api/v1/trips/${encodeURIComponent(tripId)}/actions/assign-market-hire`, req);
  },

  async markDelivered(tripId: string, req: MarkDeliveredRequest = {}): Promise<void> {
    await apiClient.post(`/api/v1/trips/${encodeURIComponent(tripId)}/actions/mark-delivered`, req);
  },

  async markPodReceived(tripId: string, req: MarkPodReceivedRequest): Promise<void> {
    await apiClient.post(`/api/v1/trips/${encodeURIComponent(tripId)}/actions/mark-pod-received`, req);
  },

  async setStatus(tripId: string, req: SetStatusRequest): Promise<void> {
    await apiClient.post(`/api/v1/trips/${encodeURIComponent(tripId)}/actions/set-status`, req);
  },

  async createExpense(tripId: string, req: TripExpenseRequest): Promise<void> {
    await apiClient.post(`/api/v1/trips/${encodeURIComponent(tripId)}/expenses`, req);
  },

  async updateExpense(tripId: string, expenseId: string, req: Partial<TripExpenseRequest>): Promise<void> {
    await apiClient.put(`/api/v1/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(expenseId)}`, req);
  },

  async requestAdvance(tripId: string, req: RequestAdvanceRequest): Promise<void> {
    await apiClient.post(`/api/v1/trips/${encodeURIComponent(tripId)}/vendor-payable/request-advance`, req);
  },

  async payAdvance(tripId: string): Promise<void> {
    await apiClient.post(`/api/v1/trips/${encodeURIComponent(tripId)}/vendor-payable/pay-advance`, {});
  },

  async settleBalance(tripId: string): Promise<void> {
    await apiClient.post(`/api/v1/trips/${encodeURIComponent(tripId)}/vendor-payable/settle-balance`, {});
  },

  async receiveVendorInvoice(tripId: string, req: VendorInvoiceRequest): Promise<void> {
    await apiClient.post(`/api/v1/trips/${encodeURIComponent(tripId)}/vendor-payable/receive-vendor-invoice`, req);
  },

  async markInvoiced(tripId: string, invoiceId: string): Promise<MarkInvoicedResult> {
    const normalizedInvoiceId = toOptionalString(invoiceId);
    const normalizedTripId = toOptionalString(tripId);
    if (!normalizedInvoiceId) {
      throw new Error('invoiceId is required to mark trip invoiced');
    }
    if (!normalizedTripId) {
      throw new Error('tripId is required to mark trip invoiced');
    }

    const payload: MarkInvoicedRequestDto = { invoiceId: normalizedInvoiceId };
    const encodedTripId = encodeURIComponent(normalizedTripId);
    const v1Path = `/api/v1/trips/${encodedTripId}/actions/mark-invoiced`;
    const legacyPath = `/trips/${encodedTripId}/actions/mark-invoiced`;

    try {
      const response = await apiClient.post<MarkInvoicedResponseDto>(v1Path, payload);
      return mapMarkInvoicedResponse(response);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405)) {
        const legacyResponse = await apiClient.post<MarkInvoicedResponseDto>(legacyPath, payload);
        return mapMarkInvoicedResponse(legacyResponse);
      }
      throw error;
    }
  },
};
