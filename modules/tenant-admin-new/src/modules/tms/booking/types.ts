export type BookingStatus =
  | "DRAFT"
  | "PENDING_RATE_APPROVAL"
  | "PENDING_ASSIGNMENT"
  | "ACCEPTED"
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
  | "POD_PENDING"
  | "ARRIVED"
  | "DELAYED"
  | "EXCEPTION"
  | "COMPLETED"
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
  | "CONSIGNEE_DESTINATION_CHANGED"
  | "DRIVER_CHANGED"
  | "VEHICLE_CHANGED"
  | "VEHICLE_DRIVER_CHANGED"
  | "VENDOR_VEHICLE_DRIVER_CHANGED"
  | "DRIVER_AND_VEHICLE_CHANGED"
  | "VEHICLE_REPLACED"
  | "VENDOR_REPLACEMENT_REJECTED"
  | "VENDOR_ASSIGNED_REPLACEMENT_VEHICLE"
  | "INTERNAL_VENDOR_VEHICLE_DRIVER_REPLACED";

export type BookingAssignmentChangeType =
  | "DRIVER"
  | "VEHICLE"
  | "VEHICLE_DRIVER"
  | "VENDOR_VEHICLE_DRIVER"
  | "DRIVER_AND_VEHICLE";
export type BookingReassignmentReason =
  | "DRIVER_UNAVAILABLE"
  | "DRIVER_SICK"
  | "DRIVER_SHIFT_CHANGE"
  | "VEHICLE_BREAKDOWN"
  | "VEHICLE_COMPLIANCE_ISSUE"
  | "VEHICLE_PLACEMENT_ISSUE"
  | "VENDOR_REPLACEMENT"
  | "ROUTE_OPERATIONAL_ISSUE"
  | "CUSTOMER_REQUEST"
  | "EMERGENCY_REPLACEMENT"
  | "OTHER";

export type BookingVehicleReplacementType =
  | "VEHICLE_ONLY"
  | "VENDOR_VEHICLE_DRIVER"
  | "VENDOR_APP_REPLACEMENT";

export type BookingVehicleReplacementReason =
  | "VEHICLE_BREAKDOWN"
  | "VEHICLE_COMPLIANCE_ISSUE"
  | "VEHICLE_PLACEMENT_ISSUE"
  | "VENDOR_REPLACEMENT"
  | "ROUTE_OPERATIONAL_ISSUE"
  | "CUSTOMER_REQUEST"
  | "EMERGENCY_REPLACEMENT"
  | "OTHER";

export type BookingVehicleReplacementStatus =
  | "REQUESTED"
  | "SENT_TO_VENDOR"
  | "VENDOR_ASSIGNED_REPLACEMENT"
  | "VENDOR_REJECTED"
  | "INTERNAL_REPLACEMENT_REQUIRED"
  | "INTERNAL_REPLACEMENT_COMPLETED"
  | "COMPLETED"
  | "CANCELLED";

export interface BookingAssignment {
  vendorId: string | null;
  vendorName: string;
  vehicleId: string;
  vehicleLabel: string;
  driverId: string;
  driverName: string;
  assignedAt: string;
  vendorFreight?: number | null;
  vendorRateCardId?: string | null;
  vendorRateType?: "PER_TRIP" | "PER_KM" | "PER_MT" | null;
  vendorContractSource?: "RATE_CARD" | "MANUAL" | "SPOT_AUCTION" | null;
  customerFreight?: number | null;
  sellingRateLabel?: string | null;
  buyingRateLabel?: string | null;
  marginAmount?: number | null;
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

export type BookingBreakdownRepairStatus =
  | "WAITING_FOR_REPAIR"
  | "REPAIRED_CONTINUED"
  | "REPLACEMENT_REQUIRED"
  | "REPLACED";

export interface BookingBreakdownEvent {
  id: string;
  remarkId: string;
  deliveryId?: string | null;
  location: string;
  reportedAt: string;
  reportedBy: string;
  reportedByRole?: string | null;
  description: string;
  expectedRepairAt?: string | null;
  expectedRepairTimeHours?: number | null;
  photoEvidence?: string | null;
  repairStatus: BookingBreakdownRepairStatus;
  repairStartedAt?: string | null;
  repairCompletedAt?: string | null;
  downtimeMinutes?: number | null;
  repairRemark?: string | null;
  responsiblePerson?: string | null;
  replacementHistoryId?: string | null;
  createdAt: string;
}

export type BookingOperationalMarker =
  | "DESTINATION_CHANGED"
  | "DELIVERY_REVISED"
  | "BOOKING_EDITED";

export type DestinationChangePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type DestinationChangeWorkflowStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "IMPLEMENTED";
export type DeliveryRevisionStatus = "PROPOSED" | "ACTIVE" | "SUPERSEDED" | "REJECTED";

export interface DestinationChangeTemporaryAddress {
  id: string;
  consigneeId?: string | null;
  consigneeName?: string | null;
  addressLabel: string;
  fullAddress: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  contactPerson: string;
  contactNumber: string;
  gstNumber?: string | null;
  remarks?: string | null;
  isTemporary: true;
}

export interface DeliveryRevisionSnapshot {
  deliveryId: string;
  deliveryNo: number;
  consigneeId?: string | null;
  consigneeName?: string | null;
  addressId: string;
  addressLabel: string;
  fullAddress: string;
  city: string;
  state: string;
  pincode: string;
  route: string;
  distanceKm: number | null;
  freight: number;
  eta: string | null;
  sequence: number;
  lrNumber?: string | null;
  tripImpact: string;
  contactPerson?: string | null;
  contactNumber?: string | null;
  unloadingNotes?: string | null;
  instructions?: string | null;
  isTemporary?: boolean;
}

export interface DeliveryRevisionImpact {
  freightDelta: number;
  distanceDeltaKm: number;
  routeDelta: string;
  etaDeltaHours: number;
  tripImpactSummary: string;
}

export interface BookingDestinationChangeRequest {
  id: string;
  bookingId: string;
  deliveryId: string;
  remarkType: "DESTINATION_CHANGED";
  reason: string;
  requestNotes?: string | null;
  requestedAddressId?: string | null;
  temporaryAddress?: DestinationChangeTemporaryAddress | null;
  raisedBy: string;
  raisedAt: string;
  priority: DestinationChangePriority;
  status: DestinationChangeWorkflowStatus;
  reviewNote?: string | null;
  requestedConsigneeId?: string | null;
  requestedConsigneeName?: string | null;
  requestedContactPerson?: string | null;
  requestedContactNumber?: string | null;
  unloadingNotes?: string | null;
  instructions?: string | null;
  requestedRoute?: string | null;
  requestedDistanceKm?: number | null;
  requestedFreight?: number | null;
  requestedEta?: string | null;
  notificationRecipients?: string[];
  eventLabel?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  implementedBy?: string | null;
  implementedAt?: string | null;
  revisionId?: string | null;
}

export interface DeliveryRevisionRecord {
  id: string;
  requestId: string;
  deliveryId: string;
  revisionNo: number;
  status: DeliveryRevisionStatus;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  implementedBy?: string | null;
  implementedAt?: string | null;
  previousSnapshot: DeliveryRevisionSnapshot;
  proposedSnapshot: DeliveryRevisionSnapshot;
  impact: DeliveryRevisionImpact;
}

export interface BookingStatusEvent {
  id: string;
  status: BookingStatus;
  timestamp: string;
  actor: string;
  eventLabel?: string | null;
  note?: string;
}

export interface BookingAssignmentHistoryRecord {
  id: string;
  changeType: BookingAssignmentChangeType;
  previousVendorId?: string | null;
  previousVendorName?: string | null;
  previousVehicleId?: string | null;
  previousVehicleNumber?: string | null;
  previousDriverId?: string | null;
  previousDriverName?: string | null;
  newVendorId?: string | null;
  newVendorName?: string | null;
  newVehicleId?: string | null;
  newVehicleNumber?: string | null;
  newDriverId?: string | null;
  newDriverName?: string | null;
  previousVendorFreight?: number | null;
  newVendorFreight?: number | null;
  customerFreight?: number | null;
  marginImpact?: number | null;
  reason: BookingReassignmentReason;
  remark: string;
  location?: string | null;
  effectiveAt: string;
  newInvoiceDocument?: string | null;
  newEwayBillDocument?: string | null;
  changedByUserId?: string | null;
  changedByUserName: string;
  changedByRole?: string | null;
  bookingStatusAtChange: BookingStatus;
  createdAt: string;
}

export interface BookingVehicleReplacementHistoryRecord {
  id: string;
  requestStage: BookingStatus;
  replacementType: BookingVehicleReplacementType;
  previousVendorId?: string | null;
  previousVendorName?: string | null;
  previousVehicleId?: string | null;
  previousVehicleNumber?: string | null;
  previousDriverId?: string | null;
  previousDriverName?: string | null;
  newVendorId?: string | null;
  newVendorName?: string | null;
  newVehicleId?: string | null;
  newVehicleNumber?: string | null;
  newDriverId?: string | null;
  newDriverName?: string | null;
  documentUploadedBeforeReplacement: boolean;
  oldInvoiceNumbers?: string[];
  oldEwayBillNumbers?: string[];
  newInvoiceDocument?: string | null;
  newEwayBillDocument?: string | null;
  oldVendorRate?: number | null;
  newVendorRate?: number | null;
  marginImpact?: number | null;
  vendorActionStatus?: BookingVehicleReplacementStatus | null;
  vendorRemark?: string | null;
  rejectionReason?: string | null;
  internalActionTakenBy?: string | null;
  reason: BookingVehicleReplacementReason;
  remark: string;
  requestedBy: string;
  requestedAt: string;
  approvedOrCompletedAt?: string | null;
  bookingStatusAtReplacement: BookingStatus;
  location?: string | null;
  effectiveAt?: string | null;
  status: BookingVehicleReplacementStatus;
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
  podDocument?: string | null;
  podUploaded?: boolean;
  podUploadedAt?: string | null;
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
  consigneeName?: string | null;
  consigneeAddress?: string | null;
  consigneeCity?: string | null;
  consigneePincode?: string | null;
  consigneeGstin?: string | null;
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
  extractedConsignee?: BookingConsigneeSnapshot | null;
  finalConsigneeChoice?: BookingConsigneeChoice | null;
}

export interface BookingConsigneeSnapshot {
  name: string;
  addressLine: string;
  city: string;
  pincode: string;
  gstin?: string | null;
}

export interface BookingAddressComparisonResult {
  matchStatus: "MATCH" | "POSSIBLE_MATCH" | "DIFFERENT";
  confidence: number;
  reasons: string[];
}

export interface BookingConsigneeChoice {
  mode: "KEEP_SELECTED_ADDRESS" | "USE_INVOICE_ADDRESS" | "SAVE_INVOICE_ADDRESS_AND_USE_IT" | "USE_SAVED_ADDRESS";
  selectedAddressId?: string | null;
  comparison?: BookingAddressComparisonResult | null;
}

export interface BookingLRSnapshot {
  number: string;
  generatedAt: string;
  viewMode: "COMBINED" | "ROW_WISE";
  extraCharges: number;
  advance: number;
}

export interface TenantInvoiceRecord {
  invoiceId: string;
  tenantId: string;
  customerId: string;
  bookingIds: string[];
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  createdAt: string;
  // AR lifecycle stage (BRD 4.x). Persisted so finance Approve/Dispute/Correction
  // stick across renders in embedded mode. Absent ⇒ treated as 'submitted'.
  stage?: "submitted" | "approved" | "disputed" | "correction";
  approvedAt?: string | null;
  dueDate?: string | null;
  // Customer payment (AR). Absent ⇒ unpaid. A paid invoice no longer counts
  // toward the customer's credit utilisation (BRD 3.5).
  paymentStatus?: "unpaid" | "paid";
  paidAt?: string | null;
  paidAmount?: number | null;
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
  originCity?: string | null;
  originAddressId: string;
  destinationCity?: string | null;
  destinationAddressId: string;
  destinationAddressSource?: "SAVED_ADDRESS" | "FROM_INVOICE_LATER";
  consigneeFinalizationStatus?: "PENDING" | "CONFIRMED";
  materialId: string;
  quantity?: number;
  uom?: string | null;
  weight?: number;
  weightUom?: string | null;
  distanceKm?: number | null;
  status: BookingStatus;
  lrNumber?: string | null;
  lrId?: string | null;
  pod?: BookingPodSnapshot | null;
  routeLabel?: string | null;
  eta?: string | null;
  deliverySequence?: number | null;
  freightRate?: number | null;
  tripImpactSummary?: string | null;
  contactPerson?: string | null;
  contactNumber?: string | null;
  unloadingNotes?: string | null;
  instructions?: string | null;
  activeRevisionId?: string | null;
  revisions?: DeliveryRevisionRecord[];
}

export type TenantLrStatus = "GENERATED" | "ASSIGNED" | "IN_TRANSIT" | "COMPLETED" | "VOID";
export type TenantLrGenerationType = "MANUAL" | "PREGENERATED" | "AUTO";
export type TenantLrPoolStatus =
  | "AVAILABLE"
  | "USED"
  | "VOID"
  | "LOST"
  | "DAMAGED"
  | "ALLOCATED"
  | "REQUESTED"
  | "APPROVAL_PENDING"
  | "TRANSFER_PENDING"
  | "TRANSFERRED";
export type TenantLrPoolType = "GENERAL" | "CUSTOMER_RESERVED";
export type TenantLrPoolSource = "RANGE" | "LIST" | "CSV";
export type TenantLrAllocationRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PARTIALLY_APPROVED"
  | "CANCELLED";
export type TenantLrTransferStatus = "PENDING" | "COMPLETED" | "REJECTED" | "CANCELLED";

export interface TenantLrRecord {
  id: string;
  tenantId: string;
  lrNumber: string;
  bookingId: string;
  deliveryId: string;
  customerId: string;
  vehicleNumber: string;
  driverName: string;
  status: TenantLrStatus;
  type: TenantLrGenerationType;
  configId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantLrPoolRecord {
  id: string;
  lrNumberId?: string | null;
  tenantId: string;
  configId: string;
  lrNumber: string;
  poolType?: TenantLrPoolType;
  status: TenantLrPoolStatus;
  customerId?: string | null;
  vendorId?: string | null;
  ownerPlaceId?: string | null;
  currentPlaceId?: string | null;
  ownerLevelId?: string | null;
  ownerUserId?: string | null;
  bookingId?: string | null;
  deliveryId?: string | null;
  usedAt?: string | null;
  voidReason?: string | null;
  createdBy?: string | null;
  auditEvents?: Array<{
    id: string;
    action: string;
    poolType: TenantLrPoolType;
    customerId?: string | null;
    fromPlaceId?: string | null;
    toPlaceId?: string | null;
    actor: string;
    role: string;
    timestamp: string;
    note?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface TenantLrAllocationRequestRecord {
  id: string;
  tenantId: string;
  sourceLevelId: string;
  targetLevelId: string;
  requestedCount: number;
  approvedCount: number;
  status: TenantLrAllocationRequestStatus;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string | null;
  note?: string | null;
  sourceOrgUnitId?: string | null;
  targetOrgUnitId?: string | null;
  sourceUserId?: string | null;
  targetUserId?: string | null;
  lrType?: TenantLrGenerationType | null;
  configId?: string | null;
  customerId?: string | null;
  branchName?: string | null;
  branchCode?: string | null;
  lastSequenceNumber?: string | null;
  rejectionReason?: string | null;
}

export interface TenantLrTransferRecord {
  id: string;
  tenantId: string;
  fromLevelId: string;
  toLevelId: string;
  lrIds: string[];
  status: TenantLrTransferStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  note?: string | null;
  fromOrgUnitId?: string | null;
  toOrgUnitId?: string | null;
  fromUserId?: string | null;
  toUserId?: string | null;
  lrType?: TenantLrGenerationType | null;
  customerId?: string | null;
  configId?: string | null;
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
  /** One-time spot-auction contract attached at creation (lane match). */
  spotContract?: {
    contractId: string;
    sourceAuctionId: string;
    vendorId: string;
    vendorName: string;
    rate: number;
    rateUnit: "PER_TRIP" | "PER_KM" | "PER_MT";
    /** Lane = source/destination city pair. */
    originCity: string;
    destinationCity: string;
  } | null;

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
  manualLrPoolPreference?: "GENERAL" | "PRE_GENERATED";
  status: BookingStatus;
  opsRemark?: string | null;
  pod?: BookingPodSnapshot | null;
  isInvoiced?: boolean;
  invoiceId?: string | null;
  lrIds?: string[];
  documents?: BookingDocumentSnapshot[];
  shipmentDocuments?: BookingShipmentDocuments | null;
  deliveries?: BookingDeliveryRecord[];
  expenses?: BookingExpenseRecord[];
  assignment?: BookingAssignment | null;
  assignmentHistory?: BookingAssignmentHistoryRecord[];
  breakdownEvents?: BookingBreakdownEvent[];
  vehicleReplacementHistory?: BookingVehicleReplacementHistoryRecord[];
  remarks: BookingRemark[];
  destinationChangeRequests?: BookingDestinationChangeRequest[];
  operationalFlags?: BookingOperationalMarker[];
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
  /** One-time spot-auction contract attached at creation (lane match). */
  spotContract?: {
    contractId: string;
    sourceAuctionId: string;
    vendorId: string;
    vendorName: string;
    rate: number;
    rateUnit: "PER_TRIP" | "PER_KM" | "PER_MT";
    /** Lane = source/destination city pair. */
    originCity: string;
    destinationCity: string;
  } | null;

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
  manualLrPoolPreference?: "GENERAL" | "PRE_GENERATED";
  status: BookingStatus;
  opsRemark?: string | null;
  pod?: BookingPodSnapshot | null;
  isInvoiced?: boolean;
  invoiceId?: string | null;
  lrIds?: string[];
  documents?: BookingDocumentSnapshot[];
  shipmentDocuments?: BookingShipmentDocuments | null;
  deliveries?: BookingDeliveryRecord[];
  expenses?: BookingExpenseRecord[];
  assignment?: BookingAssignment | null;
  assignmentHistory?: BookingAssignmentHistoryRecord[];
  breakdownEvents?: BookingBreakdownEvent[];
  vehicleReplacementHistory?: BookingVehicleReplacementHistoryRecord[];
  remarks?: BookingRemark[];
  destinationChangeRequests?: BookingDestinationChangeRequest[];
  operationalFlags?: BookingOperationalMarker[];
  statusTimeline?: BookingStatusEvent[];
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
  vendorRateCardId?: string | null;
  vendorRateType?: "PER_TRIP" | "PER_KM" | "PER_MT" | null;
  vendorContractSource?: "RATE_CARD" | "MANUAL" | "SPOT_AUCTION" | null;
  customerFreight?: number | null;
  sellingRateLabel?: string | null;
  buyingRateLabel?: string | null;
  marginAmount?: number | null;
  marginPercent: number;
  actor: string;
  orgUnitId?: string | null;
  actorUserId?: string | null;
  lrType?: "AUTO" | "MANUAL" | "PRE_GENERATED";
  lrConfigId?: string | null;
  preferredLrNumber?: string | null;
  manualLrPoolPreference?: "GENERAL" | "PRE_GENERATED";
  /** Why the dispatcher bypassed the default L1/lowest contract — required for
   *  manual assignment (deviation from the recommended contract vendor). */
  manualAssignmentReason?: string | null;
}

export interface BookingReassignmentInput {
  changeType: BookingAssignmentChangeType;
  vendorId?: string | null;
  vendorName?: string | null;
  vehicleId?: string | null;
  vehicleLabel?: string | null;
  driverId?: string | null;
  driverName?: string | null;
  reason: BookingReassignmentReason;
  remark: string;
  effectiveAt: string;
  location?: string | null;
  actor: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  overrideAvailability?: boolean;
  newVendorFreight?: number | null;
  newInvoiceDocument?: string | null;
  newEwayBillDocument?: string | null;
}

export interface BookingVehicleReplacementInput {
  replacementType: BookingVehicleReplacementType;
  vehicleId?: string | null;
  driverId?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  reason: BookingVehicleReplacementReason;
  remark: string;
  actor: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  location?: string | null;
  effectiveAt?: string | null;
  newInvoiceDocument?: string | null;
  newEwayBillDocument?: string | null;
  newVendorRate?: number | null;
}

export interface BookingVehicleReplacementVendorActionInput {
  requestId: string;
  action: "ASSIGN_REPLACEMENT" | "REJECT" | "INTERNAL_COMPLETE";
  vehicleId?: string | null;
  driverId?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  vendorRemark?: string | null;
  rejectionReason?: string | null;
  remark: string;
  actor: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  overrideAvailability?: boolean;
  newInvoiceDocument?: string | null;
  newEwayBillDocument?: string | null;
  newVendorRate?: number | null;
}

export const bookingStatuses: BookingStatus[] = [
  "DRAFT",
  "PENDING_RATE_APPROVAL",
  "PENDING_ASSIGNMENT",
  "ACCEPTED",
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
  "POD_PENDING",
  "ARRIVED",
  "DELAYED",
  "EXCEPTION",
  "COMPLETED",
  "INVOICED",
  "PAID",
  "DISPUTED",
  "CANCELLED",
];
