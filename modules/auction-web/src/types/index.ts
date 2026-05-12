export type InternalRole = 'ADMIN' | 'OPS' | 'PROCUREMENT' | 'FINANCE' | 'EXECUTIVE'

export type UserStatus = 'ACTIVE' | 'SUSPENDED'

export interface UserProfile {
  id: string
  name: string
  email: string
  mobile: string
  tenantName: string
  role: InternalRole
  status: UserStatus
}

export interface BookingReference {
  id: string
  lane: string
  vehicleType: string
  commodity: string
  quantity: number
  uom: string
  loadingDate: string
  status: 'PENDING_AUCTION' | 'READY_FOR_DISPATCH'
}

export interface AuctionLaneBid {
  rank: 1 | 2 | 3
  vendorId: string
  vendorName: string
  amount: number
  timestamp: string
}

export interface AuctionEvent {
  id: string
  type:
    | 'CREATED'
    | 'LAUNCHED'
    | 'EXTENDED'
    | 'COMPLETED'
    | 'AWARDED'
    | 'CANCELLED'
    | 'PLACEMENT_FAILURE'
    | 'OVERRIDE'
    | 'CONTRACT_CREATED'
  message: string
  actor: string
  timestamp: string
}

export interface AuctionLane {
  id: string
  lane: string
  region?: string
  vehicleType: string
  capacityMt: number
  rateUnit: 'PER_TRIP' | 'PER_MT' | 'PER_KM'
  ceilingRate: number
  estimatedTrips?: number
  basePriceSource: 'MANUAL'
  allocationMode: 'SINGLE' | 'SPLIT'
  allocation: {
    l1: number
    l2: number
    l3: number
  }
  eligibleVendorIds: string[]
  timerEndsAt: string
  extensionCount: number
  bidCount: number
  ranking: AuctionLaneBid[]
  awardDecision?: {
    vendorId: string
    vendorName: string
    allocationRank: 'L1' | 'L2' | 'L3'
    awardedBidRank: 'L1' | 'L2' | 'L3'
    awardedAmount: number
    overrideReason?: string
    allocationPercent: number
  }[]
  rejectionReason?: string
}

export type AuctionType = 'SPOT' | 'BULK' | 'LOT'
export type AuctionStatus = 'DRAFT' | 'LIVE' | 'COMPLETED' | 'AWARDED' | 'NO_BIDS' | 'CANCELLED'

export interface Auction {
  id: string
  title: string
  type: AuctionType
  status: AuctionStatus
  createdBy: string
  createdByRole: InternalRole
  createdAt: string
  startAt?: string
  completedAt?: string
  contractStartDate?: string
  contractEndDate?: string
  minBidDecrement: number
  extensionTriggerMinutes: number
  extensionDurationMinutes: number
  maxExtensions: number
  biddingWindowMinutes: number
  bookingId?: string
  region?: string
  lanes: AuctionLane[]
  invitedVendorIds: string[]
  awardDeadline: string
  auditTrail: AuctionEvent[]
}

export type ContractStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'TERMINATED'

export interface PlacementFailure {
  failedVendor: string
  replacementVendor: string
  originalRate: number
  replacementRate: number
  differential: number
  debitNoteTriggered: boolean
}

export interface Contract {
  id: string
  sourceAuctionId: string
  contractType: 'BULK' | 'LOT'
  vendorId: string
  vendorName: string
  lane: string
  region?: string
  vehicleType: string
  contractedRate: number
  rateUnit: 'PER_TRIP' | 'PER_MT' | 'PER_KM'
  volumeAllocationPercent: number
  allocationRank: 'L1' | 'L2' | 'L3'
  startDate: string
  endDate: string
  estimatedTrips: number
  status: ContractStatus
  l1OverrideReason?: string
  rateSyncedToTms: boolean
  placementFailures: PlacementFailure[]
  rateDeviationOpen: boolean
}

export interface VendorOption {
  id: string
  name: string
  score: number
}

export interface DashboardMetric {
  label: string
  value: number
  insight: string
}

export interface DashboardData {
  liveAuctions: DashboardMetric
  pendingAwards: DashboardMetric
  expiringContracts: DashboardMetric
}

export type RfiStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type VendorResponseStatus = 'PENDING' | 'RESPONDED' | 'DECLINED'

export interface SourcingVendorTracking {
  vendorIdOrEmail: string
  name?: string
  status: VendorResponseStatus
}

export interface RfiType {
  id: string
  title: string
  description: string
  deadline: string
  status: RfiStatus
  targetEmails: string[]
  messageToVendor?: string
  templateFileName?: string
  vendorTracking: SourcingVendorTracking[]
  createdAt: string
  createdBy: string
}

export type RfqStatus = 'DRAFT' | 'PUBLISHED' | 'EVALUATING' | 'AWARDED' | 'CANCELLED'

export interface RfqType {
  id: string
  title: string
  deadline: string
  status: RfqStatus
  targetEmails: string[]
  messageToVendor?: string
  templateFileName?: string
  vendorTracking: SourcingVendorTracking[]
  createdAt: string
  createdBy: string
}

export interface RfqResponseRow {
  lane: string
  vehicleType: string
  price: number
}

export interface RfqResponse {
  id: string
  fileName: string
  vendorName?: string
  rfqId?: string
  uploadedAt: string
  uploadedBy: string
  rows: RfqResponseRow[]
}
