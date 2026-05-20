export type BookingStatus =
  | "DRAFT"
  | "PENDING_RATE_APPROVAL"
  | "PENDING_ASSIGNMENT"
  | "VEHICLE_ASSIGNED"
  | "LOADING_STARTED"
  | "LOADING_COMPLETED"
  | "DOCUMENT_PENDING"
  | "DOCUMENT_COMPLETED"
  | "ASSIGNED"
  | "LOADING"
  | "LOADED"
  | "READY_FOR_DISPATCH"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "DELAYED"
  | "EXCEPTION"
  | "DELIVERED"
  | "INVOICED"
  | "PAID"
  | "DISPUTED"
  | "CANCELLED";

export type BookingServiceType = "FTL" | "PTL";
export type BookingCommercialType = "CONTRACT" | "SPOT";
export type BookingApprovalLevel = "AUTO" | "MANAGER" | "HO";
export type BookingModeOfTransport = "ROAD";
export type BookingRemarkType =
  | "OPS_REMARK"
  | "RATE_DEVIATION_REMARK"
  | "APPROVAL_REMARK"
  | "EXCEPTION_REMARK"
  | "CANCELLATION_REMARK"
  | "POD_REMARK"
  | "SYSTEM_REMARK"
  | "INTACT"
  | "DEPS"
  | "ACCIDENT_INCIDENT"
  | "VEHICLE_PLACEMENT_DELAY_DEVIATION"
  | "DELIVERY_DELAY"
  | "EPOD_SUBMITTED"
  | "EPOD_NOT_SUBMITTED"
  | "ORIGINAL_POD_NOT_SUBMITTED"
  | "VEHICLE_BREAKDOWN"
  | "DESTINATION_CHANGED"
  | "CONSIGNEE_DESTINATION_CHANGED";

export interface BookingAssignment {
  vendorId: string | null;
  vendorName: string;
  vehicleId: string;
  vehicleLabel: string;
  driverId: string;
  driverName: string;
  assignedAt: string;
  vendorFreight?: number | null;
  marginPercent?: number | null;
  lrNumber?: string | null;
  loadingStartedAt?: string | null;
  loadingCompletedAt?: string | null;
}

export interface BookingRemark {
  id: string;
  timestamp: string;
  actor: string;
  type: BookingRemarkType;
  message: string;
  deliveryId?: string;
  location?: string | null;
  consignee?: string | null;
  destination?: string | null;
}

export interface BookingStatusEvent {
  id: string;
  status: BookingStatus;
  timestamp: string;
  actor: string;
  note?: string;
}

export interface BookingPricingSnapshot {
  rateType: "PER_TRIP" | "PER_KM" | "PER_MT";
  contractRateCardId?: string | null;
  l1Rate?: number | null;
  enteredRate: number;
  calculatedFreight: number;
  distanceKm?: number | null;
  deviationPercent: number;
  approvalLevel?: BookingApprovalLevel | null;
  deviationRemark?: string | null;
  isAutoApproved: boolean;
}

export interface BookingPodSnapshot {
  photoName?: string | null;
  consigneeName?: string | null;
  deliveredQuantity?: number | null;
  acknowledgementMode?: "OTP" | "SIGNATURE" | null;
  podRemark?: string | null;
  eSignRequested?: boolean;
  capturedAt?: string | null;
}

export interface BookingExpenseRecord {
  id: string;
  label: string;
  amount: number;
  createdAt: string;
  createdBy: string;
}

export interface BookingDocumentSnapshot {
  id: string;
  type: "PO" | "DO" | "EWAY_BILL" | "INVOICE" | "OTHER";
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  deliveryId?: string | null;
}

export interface BookingInvoiceSnapshot {
  id: string;
  fileName: string;
  invoiceNumber: string;
  invoiceValue: number | null;
  invoiceDate: string | null;
  material: string;
  subBrand?: string | null;
  quantity: number | null;
  quantityUOM: string | null;
  weight: number | null;
  weightUOM: string | null;
  uploadedAt: string;
  extractedAt?: string | null;
}

export interface BookingActualShipmentSnapshot {
  material: string;
  subBrand?: string | null;
  quantity: number | null;
  quantityUOM: string | null;
  weight: number | null;
  weightUOM: string | null;
}

export interface BookingEwayBillSnapshot {
  fileName: string;
  ewayBillNumber: string;
  validFromDate: string | null;
  validFromTime: string | null;
  validToDate: string | null;
  validToTime: string | null;
  uploadedAt: string;
}

export interface BookingDeliveryShipmentDocuments {
  deliveryId: string;
  invoices: BookingInvoiceSnapshot[];
  actuals: BookingActualShipmentSnapshot;
  ewayBill: BookingEwayBillSnapshot | null;
  freightRate?: number | null;
  freightMessage?: string | null;
}

export interface BookingLRSnapshot {
  number: string;
  generatedAt: string;
  viewMode: "COMBINED" | "ROW_WISE";
  extraCharges: number;
  advance: number;
}

export interface BookingShipmentDocuments {
  deliveries: BookingDeliveryShipmentDocuments[];
  totalFreightRate?: number | null;
  freightStatus?: "PENDING" | "READY" | "NO_RATE" | "MISSING_WEIGHT" | "PLACEHOLDER";
  freightMessage?: string | null;
  submittedAt?: string | null;
  lr?: BookingLRSnapshot | null;
}

export interface BookingDeliveryRecord {
  id: string;
  deliveryNo: number;
  trackingId: string;
  originAddressId: string;
  destinationAddressId: string;
  materialId: string;
  quantity?: number;
  uom?: string | null;
  weight?: number;
  weightUom?: string | null;
  distanceKm?: number | null;
  status: BookingStatus;
  lrNumber?: string | null;
  pod?: BookingPodSnapshot | null;
}

export interface BookingRecord {
  id: string;
  bookingId: string;
  tenantId: string;
  modeOfTransport?: BookingModeOfTransport;
  numberOfDeliveries?: number;
  customerId: string;
  materialIds: string[];
  sourceAddressId: string;
  destinationAddressId: string;
  consignorAddressId: string;
  consigneeAddressId: string;
  laneKey?: string | null;
  laneFound: boolean;
  poNumber?: string | null;
  doNumber?: string | null;
  ewayBillNumber?: string | null;
  pickupDate?: string | null;
  pickupTime?: string | null;
  tat?: string | null;
  serviceType: BookingServiceType;
  commercialType: BookingCommercialType;
  pricing: BookingPricingSnapshot;
  chargeType?: string | null;
  subBrand?: string | null;
  quantity: number;
  weight: number;
  uom: string;
  weightUom?: string | null;
  vehicleTypeId?: string | null;
  lrType: "AUTO" | "MANUAL" | "PRE_GENERATED";
  status: BookingStatus;
  opsRemark?: string | null;
  pod?: BookingPodSnapshot | null;
  documents?: BookingDocumentSnapshot[];
  shipmentDocuments?: BookingShipmentDocuments | null;
  deliveries?: BookingDeliveryRecord[];
  expenses?: BookingExpenseRecord[];
  assignment?: BookingAssignment | null;
  remarks: BookingRemark[];
  statusTimeline: BookingStatusEvent[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface BookingInput {
  modeOfTransport?: BookingModeOfTransport;
  numberOfDeliveries?: number;
  customerId: string;
  materialIds: string[];
  sourceAddressId: string;
  destinationAddressId: string;
  consignorAddressId: string;
  consigneeAddressId: string;
  laneKey?: string | null;
  laneFound: boolean;
  poNumber?: string | null;
  doNumber?: string | null;
  ewayBillNumber?: string | null;
  pickupDate?: string | null;
  pickupTime?: string | null;
  tat?: string | null;
  serviceType: BookingServiceType;
  commercialType: BookingCommercialType;
  pricing: BookingPricingSnapshot;
  chargeType?: string | null;
  subBrand?: string | null;
  quantity: number;
  weight: number;
  uom: string;
  weightUom?: string | null;
  vehicleTypeId?: string | null;
  lrType: "AUTO" | "MANUAL" | "PRE_GENERATED";
  status: BookingStatus;
  opsRemark?: string | null;
  pod?: BookingPodSnapshot | null;
  documents?: BookingDocumentSnapshot[];
  shipmentDocuments?: BookingShipmentDocuments | null;
  deliveries?: BookingDeliveryRecord[];
  expenses?: BookingExpenseRecord[];
  assignment?: BookingAssignment | null;
  remarks?: BookingRemark[];
}

export interface BookingStatusTransitionInput {
  status: BookingStatus;
  actor: string;
  note?: string;
}

export interface BookingAssignmentInput {
  vendorId: string | null;
  vendorName: string;
  vehicleId: string;
  vehicleLabel: string;
  driverId: string;
  driverName: string;
  vendorFreight: number;
  marginPercent: number;
  actor: string;
}

export const bookingStatuses: BookingStatus[] = [
  "DRAFT",
  "PENDING_RATE_APPROVAL",
  "PENDING_ASSIGNMENT",
  "VEHICLE_ASSIGNED",
  "LOADING_STARTED",
  "LOADING_COMPLETED",
  "DOCUMENT_PENDING",
  "DOCUMENT_COMPLETED",
  "ASSIGNED",
  "LOADING",
  "LOADED",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
  "IN_TRANSIT",
  "ARRIVED",
  "DELAYED",
  "EXCEPTION",
  "DELIVERED",
  "INVOICED",
  "PAID",
  "DISPUTED",
  "CANCELLED",
];
