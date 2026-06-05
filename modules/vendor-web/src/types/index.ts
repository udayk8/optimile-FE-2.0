// ==================== COMMON TYPES ====================
export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface Location {
  name: string
  city: string
  state: string
  pincode?: string
}

export interface LaneDetails {
  origin: Location
  destination: Location
  routeSummary?: string
  distanceKm?: number
}

export interface VolumeRequirement {
  estimatedVolume: number
  unit: string
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
}

// ==================== AUTH TYPES ====================
export interface Vendor {
  id: string
  tradingName: string
  legalName: string
  gstin: string
  pan: string
  status: VendorStatus
  onboardingStep?: VendorOnboardingStep
  kycStatus?: VendorKycStatus
  profileCompletion?: number
  rejectionReason?: string
  bankStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED'
  serviceRegions?: string[]
  supportedVehicleTypes?: string[]
  documents?: VendorDocument[]
  primaryContact: {
    name: string
    phone: string
    email: string
  }
  profileImageUrl?: string
}

export type VendorStatus =
  | 'ONBOARDING_INCOMPLETE'
  | 'PENDING_VERIFICATION'
  | 'UNDER_REVIEW'
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'BLACKLISTED'

export type VendorOnboardingStep = 'REGISTER' | 'OTP' | 'SETUP' | 'DOCUMENTS' | 'REVIEW' | 'COMPLETE'
export type VendorKycStatus = 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REJECTED' | 'APPROVED'

export interface VendorDocument {
  id: string
  type: 'GST' | 'PAN' | 'BANK' | 'COMPANY' | 'AADHAAR_FRONT' | 'AADHAAR_BACK'
  fileName: string
  fileUrl?: string
  uploadedAt: string
  status: 'PENDING' | 'VERIFIED' | 'REJECTED'
}

export interface AuthState {
  vendor: Vendor | null
  token: string | null
  isAuthenticated: boolean
}

// ==================== NOTIFICATION TYPES ====================
export type NotificationCategory = 'ONBOARDING' | 'SOURCING' | 'CONTRACTS' | 'TRIPS' | 'INVOICES'

export interface Notification {
  id: string
  type: NotificationCategory
  title: string
  message: string
  deepLink: string
  isRead: boolean
  createdAt: string
}

export interface VendorSetupDraft {
  companyName: string
  legalName: string
  gstin: string
  pan: string
  registeredAddress: { street: string; city: string; state: string; pincode: string }
  primaryContact: { name: string; phone: string; email: string }
  serviceRegions: string[]
  supportedVehicleTypes: string[]
  bankName: string
  branch: string
  accountNumber: string
  ifscCode: string
  accountType: 'SAVINGS' | 'CURRENT'
  rejectionReason?: string
}

// ==================== DASHBOARD TYPES ====================
export interface DashboardData {
  pendingIndents: { count: number; items: IndentSummary[] }
  uninvoicedBookings: { count: number; totalBillableAmount: number }
  invoicePaymentStatus: {
    submitted: number
    approved: number
    rejected: number
    paid: number
  }
}

// ==================== SOURCING TYPES ====================


export type AuctionType = 'SPOT' | 'LOT' | 'BULK'
export type AuctionState = 'UPCOMING' | 'LIVE' | 'PENDING_AWARD' | 'AWARDED' | 'NOT_AWARDED' | 'NOT_PARTICIPATED' | 'CANCELLED'

export interface AuctionLane {
  id: string
  laneDetails: LaneDetails
  volumeRequirement?: VolumeRequirement
  basePrice?: number
  currentBestBid?: number
  minBidDecrement?: number
  /** Total bids currently ranked on this lane (live, from the shared store). */
  bidCount?: number
  /** This vendor's live rank on the lane (1 = L1/lowest); undefined if no bid. */
  myRank?: number
  /** Anonymized top bid amounts (L1, L2, L3) for the live leaderboard. */
  topBids?: number[]
}

export interface Auction {
  id: string
  type: AuctionType
  customerName: string
  vehicleTypeRequired: string
  startTime: string
  endTime: string
  state: AuctionState
  lanes: AuctionLane[]
  vendorBids: AuctionBid[]
  pricingUnit?: 'PER_TRIP' | 'PER_MT' | 'PER_KM'
  awardDate?: string
  contractReference?: string
  createdAt: string
}

export interface AuctionBid {
  id: string
  laneId: string
  amount: number
  placedAt: string
  status: 'ACTIVE' | 'REVISED' | 'SUPERSEDED'
}

// ==================== CONTRACT TYPES ====================
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'USED'

/** MANUAL_UPLOAD = uploaded by tenant admin; AUCTION_WIN = produced by an auction award. */
export type ContractSource = 'MANUAL_UPLOAD' | 'AUCTION_WIN'

export interface Contract {
  id: string
  /** AAA-BBB lane code (e.g. MUM-BLR); laneDetails carries the display fallback. */
  laneCode?: string
  laneDetails: LaneDetails
  rateCard: RateCardEntry[]
  source: ContractSource
  volumeAllocation: { volume: number; unit: string; frequency: string }
  paymentTerms: { creditPeriodDays: number; billingCycle: string }
  slaClauses: { name: string; valueHours: number; description: string }[]
  penaltyClauses: { breachType: string; penaltyType: 'FIXED' | 'PERCENTAGE'; penaltyValue: number; description: string }[]
  validityFrom: string
  validityTo: string
  renewalTerms: string
  status: ContractStatus
  amendments: Amendment[]
  signedAt?: string
  /** When the auction award that produced this contract was won (AUCTION_WIN only). */
  awardedOn?: string
  /** Auction contract flavour; SPOT means a one-time spot-lane contract. */
  contractKind?: 'BULK' | 'LOT' | 'SPOT'
  /** One-time contract consumed by a single spot booking. */
  oneTime?: boolean
  consumedByBookingId?: string
  pdfUrl: string
  createdAt: string
}

export interface RateCardEntry {
  vehicleType: string
  rateType: 'PER_TRIP' | 'PER_MT' | 'PER_KM'
  rate: number
  surcharges: { name: string; amount: number }[]
}

export interface Amendment {
  id: string
  description: string
  changedFields: { field: string; oldValue: string; newValue: string }[]
  amendedAt: string
}

// ==================== TRIP TYPES ====================
export type IndentStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'

export interface IndentSummary {
  id: string
  contractId: string
  lane: string
  vehicleType: string
  reportingDate: string
  slaDeadline: string
  status: IndentStatus
}

export interface Indent {
  id: string
  contractId: string
  contractReference: string
  laneDetails: LaneDetails
  loadDetails: { commodity: string; weightKg: number; volumeCbm: number }
  vehicleTypeRequired: string
  reportingDateTime: string
  slaDeadline: string
  status: IndentStatus
  assignedVehicleId?: string
  assignedDriverId?: string
  rejectionReason?: string
  createdAt: string
}

export type BookingState =
  | 'ACCEPTED'
  | 'ASSIGNED'
  | 'OUT_FOR_PICKUP'
  | 'PICKUP_REACHED'
  | 'LOADING_STARTED'
  | 'LOADING_COMPLETED'
  | 'IN_TRANSIT'
  | 'DESTINATION_REACHED'
  | 'POD_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'

export type TripStatus = BookingState

export type BookingSlaFlag = 'ON_TIME' | 'DELAYED'

export type DisruptionReason = 'VEHICLE_BREAKDOWN' | 'DRIVER_BREAKDOWN' | 'VEHICLE_OR_DRIVER_BREAKDOWN'

export interface TripDisruption {
  reason: DisruptionReason
  reportedAt: string
  notes?: string
  resolvedAt?: string
}

export interface Trip {
  id: string
  contractId: string
  indentId: string
  laneDetails: LaneDetails
  assignedVehicle: { id: string; registrationNumber: string; type: string }
  assignedDriver: { id: string; name: string; mobile: string }
  status: BookingState
  slaFlag?: BookingSlaFlag
  exceptionFlag?: boolean
  disruption?: TripDisruption
  deliveredDate?: string
  podStatus?: 'PENDING' | 'CONFIRMED'
  podReference?: string
  documents?: TripDocument[]
  timeline?: TripTimelineEvent[]
  freightRate: number
  isInvoiced: boolean
  createdAt: string
}

export type TripDocumentType = 'INVOICE_COPY' | 'POD_COPY' | 'EWAY_BILL' | 'LR_COPY' | 'REMARKS' | 'SUB_DELIVERY' | 'OTHER'

export interface TripDocument {
  id: string
  type: TripDocumentType
  title: string
  fileName: string
  fileUrl?: string
  fileBase64?: string
  createdAt: string
  note?: string
}

export interface TripTimelineEvent {
  id: string
  title: string
  description: string
  timestamp: string
  status?: string
}

// ==================== FLEET TYPES ====================
export type ComplianceStatus = 'COMPLIANT' | 'EXPIRING_SOON' | 'EXPIRED' | 'PENDING_DOCS'
export type OperationalStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_MAINTENANCE'
export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

export interface Vehicle {
  id: string
  registrationNumber: string
  vehicleType: string
  manufacturer?: string
  model?: string
  year?: string
  fuelType?: string
  engineNumber?: string
  chassisNumber?: string
  capacityKg?: string
  baseLocation: string
  operationalStatus: OperationalStatus
  complianceStatus: ComplianceStatus
  complianceDocuments: ComplianceDocument[]
  blackoutDates: { from: string; to: string }[]
  // legacy fields kept for existing mock data
  odometerReading?: string
  manufactureDate?: string
  registrationDate?: string
  permitType?: string
  capacityCubicMeter?: string
  capacityLiters?: string
  length?: string
  width?: string
  height?: string
  rcStartDate?: string
  rcEndDate?: string
  rcFileName?: string
  trackingSelections?: VehicleTrackingSelection[]
  additionalDocuments?: VehicleAdditionalDocument[]
  gpsDeviceId?: string
}

export interface Driver {
  id: string
  name: string
  mobile: string
  licenseNumber: string
  licenseExpiry: string
  licenseClass: string[]
  complianceStatus: ComplianceStatus
  currentStatus: DriverStatus
  complianceDocuments: ComplianceDocument[]
  dateOfBirth?: string
  gender?: 'Male' | 'Female' | 'Other'
  email?: string
  baseLocation?: string
  aadhaarMasked?: string
  // legacy fields
  dlName?: string
  dlVerified?: boolean
  dlValidTillDate?: string
  dlCopyFileName?: string
  trackingSelections?: DriverTrackingSelection[]
}

export interface VehicleTrackingSelection {
  type: string
  checked: boolean
  primarySet: boolean
  gpsOption?: string
  gpsDeviceID?: string
}

export interface VehicleAdditionalDocument {
  id: string
  type: string
  fileName: string
  startDate?: string
  endDate?: string
}

export interface DriverTrackingSelection {
  type: string
  checked: boolean
  primarySet: boolean
}

export interface ComplianceDocument {
  id: string
  type: string
  referenceNo?: string
  fileName: string
  fileUrl: string
  expiryDate: string
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED'
  uploadedAt: string
}

export interface CapacityDeclaration {
  id: string
  vehicleType: string
  availableQuantity: number
  baseOperatingHubs: string[]
  blackoutDates: { from: string; to: string }[]
}

// ==================== INVOICE TYPES ====================
// Lifecycle: PENDING → APPROVED | DISPUTED. DISPUTED → APPROVED | RESUBMISSION_REQUIRED | CLOSED.
// A CLOSED invoice always carries a closeReason (REJECTED = finance rejected, SUPERSEDED = replaced by a new invoice).
export type InvoiceStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DISPUTED'
  | 'RESUBMISSION_REQUIRED'
  | 'CLOSED'

export type InvoiceCloseReason = 'SUPERSEDED' | 'REJECTED'

export interface Invoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  vendorGstin: string
  customerGstin: string
  billingPeriod: { from: string; to: string }
  paymentDueDate: string
  lineItems: InvoiceLineItem[]
  subtotal: number
  gstAmount: number
  grandTotal: number
  status: InvoiceStatus
  closeReason?: InvoiceCloseReason
  supersedesInvoiceId?: string // set on the NEW invoice — the old invoice it replaces
  supersededByInvoiceId?: string // set on the OLD invoice — the new invoice that replaced it
  paymentDate?: string
  notes?: string
  pdfUrl: string
  tripReferences?: string[]
  createdAt: string
  nbfcDiscountingStatus?: 'NOT_SUBMITTED' | 'SUBMITTED' | 'APPROVED' | 'DISBURSED' | 'REJECTED'
}

export interface InvoiceLineItem {
  tripId: string
  tripReference: string
  freightCharge: number
  lineTotal: number
}

// A dispute thread is OPEN while finance is reviewing (invoice = DISPUTED) and CLOSED
// once finance takes a final decision. The vendor can only post messages while OPEN.
export type DisputeStatus = 'OPEN' | 'CLOSED'

export interface DisputeAttachment {
  id: string
  fileName: string
}

export interface DisputeMessage {
  id: string
  sender: 'FINANCE' | 'VENDOR'
  message: string
  createdAt: string
  attachments?: DisputeAttachment[]
}

export interface Dispute {
  id: string
  invoiceId: string
  invoiceNumber: string
  invoiceAmount: number
  reason: string
  status: DisputeStatus
  raisedAt: string
  updatedAt: string
  notes?: string
  responseDueAt?: string
  messages?: DisputeMessage[]
}

export type LedgerType = 'CUSTOMER' | 'NBFC'

export type CustomerLedgerEntryType =
  | 'INVOICE_APPROVED'
  | 'CUSTOMER_PAYMENT'
  | 'TDS_DEDUCTION'
  | 'CUSTOMER_ADJUSTMENT'

export type NbfcLedgerEntryType =
  | 'NBFC_FINANCING_APPROVED'
  | 'NBFC_DISBURSEMENT'
  | 'NBFC_CHARGE'
  | 'NBFC_REPAYMENT'
  | 'NBFC_ADJUSTMENT'

export type LedgerEntryType = CustomerLedgerEntryType | NbfcLedgerEntryType

export interface LedgerEntry {
  id: string
  invoiceId: string
  ledgerType: LedgerType
  date: string
  entryType: LedgerEntryType
  description: string
  credit: number
  debit: number
  runningBalance: number
  counterparty?: string
  mode?: 'BANK' | 'CASH' | 'ESCROW' | 'ADJUSTMENT'
  referenceNumber?: string
  notes?: string
  documentUrl?: string
}

export type PaymentKind =
  | 'CUSTOMER_PAYMENT'
  | 'TDS_DEDUCTION'
  | 'NBFC_DISBURSEMENT'
  | 'NBFC_REPAYMENT'
  | 'NBFC_CHARGE'
export type PaymentState = 'POSTED' | 'PENDING'

export interface PaymentRecord {
  id: string
  invoiceId: string
  invoiceNumber: string
  customerName: string
  paymentKind: PaymentKind
  paymentDate: string
  cashAmount: number
  tdsAmount: number
  referenceNumber?: string
  note?: string
  recordedBy?: string
  recordedAt?: string
  status: PaymentState
  createdAt: string
  ledgerEntryIds: string[]
}

export interface CustomerLedgerPostPayload {
  invoiceId: string
  entryType: CustomerLedgerEntryType
  amount: number
  date: string
  description: string
  referenceNumber?: string
  mode?: 'BANK' | 'CASH' | 'ESCROW' | 'ADJUSTMENT'
  notes?: string
}

export interface NbfcLedgerPostPayload {
  invoiceId: string
  entryType: NbfcLedgerEntryType
  amount: number
  date: string
  description: string
  referenceNumber?: string
  mode?: 'BANK' | 'CASH' | 'ADJUSTMENT'
  notes?: string
}

export type NBFCDiscountingStatus = 'ELIGIBLE' | 'SUBMITTED' | 'APPROVED' | 'DISBURSED' | 'REJECTED'

export interface NBFCApplication {
  id: string
  invoiceId: string
  invoiceNumber: string
  customerName: string
  partnerId?: string
  partnerName?: string
  status: NBFCDiscountingStatus
  appliedAt?: string
  approvedAt?: string
  referenceNumber?: string
  requestedAmount: number
  approvedAmount?: number
  charges: number
  approvedCharges?: number
  netAmount: number
  remarks?: string
  emailTitle?: string
  recipientEmail?: string
  emailDescription?: string
  invoiceFileName?: string
}

export type ExceptionSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type ExceptionStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type ExceptionIssueType = 'Breakdown' | 'Delay' | 'Accident' | 'Route deviation' | 'Cargo issue'

export interface ExceptionTimelineEntry {
  id: string
  action: string
  notes: string
  timestamp: string
  by: string
}

export interface ExceptionRecord {
  id: string
  bookingId: string
  route: string
  vehicle: string
  driver: string
  issueType: ExceptionIssueType
  severity: ExceptionSeverity
  status: ExceptionStatus
  slaDueAt: string
  createdAt: string
  updatedAt: string
  description: string
  evidence: string[]
  timeline: ExceptionTimelineEntry[]
}

export interface AppNotification extends Notification {
  severity?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
}

// ==================== PROFILE TYPES ====================
export interface CompanyInfo {
  tradingName: string
  legalName: string
  registeredAddress: { street: string; city: string; state: string; pincode: string }
  gstin: string
  pan: string
  primaryContact: { name: string; phone: string; email: string }
  serviceRegions: string[]
  supportedVehicleTypes: string[]
}

export interface BankDetails {
  bankName: string
  branch: string
  accountNumber: string
  ifscCode: string
  accountType: 'SAVINGS' | 'CURRENT'
  supportingDocumentUrl?: string
}
