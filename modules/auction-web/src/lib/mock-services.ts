import type {
  Auction,
  BookingReference,
  Contract,
  RfiType,
  RfqType,
  RfqResponse,
  VendorOption,
} from '@auction/types'
import {
  MOCK_AUCTIONS,
  MOCK_BOOKINGS,
  MOCK_CONTRACTS,
  MOCK_DASHBOARD_RESPONSE,
  MOCK_RFIS,
  MOCK_RFQS,
  MOCK_RFQ_RESPONSES,
  MOCK_VENDORS,
} from '@auction/lib/mock-data'

// ── Shared types (re-exported for pages that imported them from services) ──
export interface KpiData {
  value: number
  insight: string
}
export interface PriorityAuction {
  id: string
  title: string
  type: string
  status: string
  updatedAt: string
  awardDeadline: string
}
export interface ExpiringContract {
  id: string
  vendorName: string
  lane: string
  endDate: string
  status: string
}
export interface DashboardResponse {
  liveAuctions: KpiData
  pendingAwards: KpiData
  expiringContracts: KpiData
  priorityAuctions: PriorityAuction[]
  expiringContractsList: ExpiringContract[]
}

export interface SearchResultItem {
  id: string
  title?: string
  vendorName?: string
  lane?: string
  type?: string
  status?: string
}
export interface SearchResponse {
  auctions: SearchResultItem[]
  contracts: SearchResultItem[]
}

// ── Dashboard ──
export async function fetchDashboard(): Promise<DashboardResponse> {
  return MOCK_DASHBOARD_RESPONSE
}

// ── Sourcing (RFI / RFQ) ──
function filterByParams<T extends { status?: string; title?: string }>(items: T[], params?: { status?: string; search?: string }): T[] {
  if (!params) return items
  let out = items
  if (params.status) out = out.filter((x) => x.status === params.status)
  if (params.search) {
    const q = params.search.toLowerCase()
    out = out.filter((x) => (x.title ?? '').toLowerCase().includes(q))
  }
  return out
}

export async function fetchRfis(params?: { status?: string; search?: string }): Promise<RfiType[]> {
  return filterByParams(MOCK_RFIS, params)
}
export async function fetchRfi(id: string): Promise<RfiType> {
  const item = MOCK_RFIS.find((r) => r.id === id)
  if (!item) throw new Error(`RFI ${id} not found`)
  return item
}
export async function createRfi(data: {
  title: string
  description: string
  deadline: string
  targetEmails: string[]
  messageToVendor?: string
  templateFileName?: string
}): Promise<RfiType> {
  const next: RfiType = {
    id: `RFI-LOCAL-${Date.now()}`,
    title: data.title,
    description: data.description,
    deadline: data.deadline,
    status: 'DRAFT',
    targetEmails: data.targetEmails,
    messageToVendor: data.messageToVendor,
    templateFileName: data.templateFileName,
    vendorTracking: [],
    createdAt: new Date().toISOString(),
    createdBy: 'u-proc-1',
  }
  MOCK_RFIS.unshift(next)
  return next
}
export async function patchRfiStatus(id: string, status: string): Promise<RfiType> {
  const item = MOCK_RFIS.find((r) => r.id === id)
  if (!item) throw new Error(`RFI ${id} not found`)
  item.status = status as RfiType['status']
  return item
}

export async function fetchRfqs(params?: { status?: string; search?: string }): Promise<RfqType[]> {
  return filterByParams(MOCK_RFQS, params)
}
export async function fetchRfq(id: string): Promise<RfqType> {
  const item = MOCK_RFQS.find((r) => r.id === id)
  if (!item) throw new Error(`RFQ ${id} not found`)
  return item
}
export async function createRfq(data: {
  title: string
  deadline: string
  targetEmails: string[]
  messageToVendor?: string
  templateFileName?: string
}): Promise<RfqType> {
  const next: RfqType = {
    id: `RFQ-LOCAL-${Date.now()}`,
    title: data.title,
    deadline: data.deadline,
    status: 'DRAFT',
    targetEmails: data.targetEmails,
    messageToVendor: data.messageToVendor,
    templateFileName: data.templateFileName,
    vendorTracking: [],
    createdAt: new Date().toISOString(),
    createdBy: 'u-proc-1',
  }
  MOCK_RFQS.unshift(next)
  return next
}
export async function patchRfqStatus(id: string, status: string): Promise<RfqType> {
  const item = MOCK_RFQS.find((r) => r.id === id)
  if (!item) throw new Error(`RFQ ${id} not found`)
  item.status = status as RfqType['status']
  return item
}

// ── Auctions ──
export async function fetchAuctions(params?: { status?: string; type?: string; search?: string }): Promise<Auction[]> {
  let out = MOCK_AUCTIONS
  if (params?.status) out = out.filter((a) => a.status === params.status)
  if (params?.type) out = out.filter((a) => a.type === params.type)
  if (params?.search) {
    const q = params.search.toLowerCase()
    out = out.filter((a) => a.title.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
  }
  return out
}
export async function fetchAuction(id: string): Promise<Auction> {
  const item = MOCK_AUCTIONS.find((a) => a.id === id)
  if (!item) throw new Error(`Auction ${id} not found`)
  return item
}
export async function createAuction(data: any): Promise<Auction> {
  const next: Auction = {
    id: `AUC-LOCAL-${Date.now()}`,
    title: data.title ?? 'New auction',
    type: data.type ?? 'SPOT',
    status: 'DRAFT',
    createdBy: 'u-ops-1',
    createdByRole: 'OPS',
    createdAt: new Date().toISOString(),
    startAt: data.startAt ?? new Date().toISOString(),
    minBidDecrement: data.minBidDecrement ?? 500,
    extensionTriggerMinutes: data.extensionTriggerMinutes ?? 5,
    extensionDurationMinutes: data.extensionDurationMinutes ?? 10,
    maxExtensions: data.maxExtensions ?? 3,
    biddingWindowMinutes: data.biddingWindowMinutes ?? 60,
    bookingId: data.bookingId,
    region: data.region,
    invitedVendorIds: data.invitedVendorIds ?? [],
    awardDeadline: data.awardDeadline ?? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    lanes: data.lanes ?? [],
    auditTrail: [
      { id: `e-${Date.now()}`, type: 'CREATED', message: 'Auction draft created.', actor: 'u-ops-1', timestamp: new Date().toISOString() },
    ],
  }
  MOCK_AUCTIONS.unshift(next)
  return next
}
export async function launchAuction(id: string): Promise<Auction> {
  const item = MOCK_AUCTIONS.find((a) => a.id === id)
  if (!item) throw new Error(`Auction ${id} not found`)
  item.status = 'LIVE'
  return item
}
export async function cancelAuction(id: string, _reason?: string): Promise<Auction> {
  const item = MOCK_AUCTIONS.find((a) => a.id === id)
  if (!item) throw new Error(`Auction ${id} not found`)
  item.status = 'CANCELLED'
  return item
}
export async function completeAuction(id: string): Promise<Auction> {
  const item = MOCK_AUCTIONS.find((a) => a.id === id)
  if (!item) throw new Error(`Auction ${id} not found`)
  item.status = 'COMPLETED'
  return item
}
export async function fetchBids(auctionId: string, laneId: string) {
  const auction = MOCK_AUCTIONS.find((a) => a.id === auctionId)
  const lane = auction?.lanes.find((l) => l.id === laneId)
  return lane?.ranking ?? []
}
export async function placeBid(_auctionId: string, _laneId: string, _data: { vendorId: string; vendorName: string; amount: number }) {
  return { ok: true }
}
export async function awardAuction(auctionId: string, _decisions: any[]) {
  const item = MOCK_AUCTIONS.find((a) => a.id === auctionId)
  if (!item) throw new Error(`Auction ${auctionId} not found`)
  item.status = 'AWARDED'
  return item
}
export async function finalizeAuction(auctionId: string) {
  const item = MOCK_AUCTIONS.find((a) => a.id === auctionId)
  if (!item) throw new Error(`Auction ${auctionId} not found`)
  item.status = 'AWARDED'
  return item
}
export async function rejectAuction(auctionId: string, reason?: string): Promise<Auction> {
  const item = MOCK_AUCTIONS.find((a) => a.id === auctionId)
  if (!item) throw new Error(`Auction ${auctionId} not found`)
  item.status = 'NO_BIDS'
  if (reason) {
    item.lanes = item.lanes.map((l) => ({ ...l, rejectionReason: reason }))
  }
  return item
}
export async function fetchVendors(search?: string): Promise<VendorOption[]> {
  if (!search) return MOCK_VENDORS
  const q = search.toLowerCase()
  return MOCK_VENDORS.filter((v) => v.name.toLowerCase().includes(q))
}
export async function fetchBookings(): Promise<BookingReference[]> {
  return MOCK_BOOKINGS.filter((b) => b.status === 'PENDING_AUCTION')
}
export async function fetchBooking(id: string): Promise<BookingReference> {
  const item = MOCK_BOOKINGS.find((b) => b.id === id)
  if (!item) throw new Error(`Booking ${id} not found`)
  return item
}

// ── Contracts ──
export async function fetchContracts(params?: { status?: string; search?: string; vendorId?: string }): Promise<Contract[]> {
  let out = MOCK_CONTRACTS
  if (params?.status) out = out.filter((c) => c.status === params.status)
  if (params?.vendorId) out = out.filter((c) => c.vendorId === params.vendorId)
  if (params?.search) {
    const q = params.search.toLowerCase()
    out = out.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.vendorName.toLowerCase().includes(q) ||
        c.lane.toLowerCase().includes(q)
    )
  }
  return out
}
export async function fetchContract(id: string): Promise<Contract> {
  const item = MOCK_CONTRACTS.find((c) => c.id === id)
  if (!item) throw new Error(`Contract ${id} not found`)
  return item
}
export async function terminateContract(id: string): Promise<Contract> {
  const item = MOCK_CONTRACTS.find((c) => c.id === id)
  if (!item) throw new Error(`Contract ${id} not found`)
  item.status = 'TERMINATED'
  return item
}

// ── RFQ responses ──
export async function fetchAllRfqResponses(params?: { search?: string; from?: string; to?: string }): Promise<RfqResponse[]> {
  let out = MOCK_RFQ_RESPONSES
  if (params?.search) {
    const q = params.search.toLowerCase()
    out = out.filter(
      (r) =>
        (r.vendorName ?? '').toLowerCase().includes(q) ||
        r.fileName.toLowerCase().includes(q) ||
        (r.rfqId ?? '').toLowerCase().includes(q)
    )
  }
  if (params?.from) out = out.filter((r) => r.uploadedAt >= params.from!)
  if (params?.to) out = out.filter((r) => r.uploadedAt <= params.to!)
  return out
}
export async function fetchRfqResponses(rfqId: string): Promise<RfqResponse[]> {
  return MOCK_RFQ_RESPONSES.filter((r) => r.rfqId === rfqId)
}
export async function uploadRfqResponse(
  rfqId: string,
  data: { fileName: string; vendorName?: string; rows: { lane: string; vehicleType: string; price: number }[] }
): Promise<RfqResponse> {
  const next: RfqResponse = {
    id: `RFQR-LOCAL-${Date.now()}`,
    fileName: data.fileName,
    vendorName: data.vendorName,
    rfqId,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'u-proc-1',
    rows: data.rows,
  }
  MOCK_RFQ_RESPONSES.unshift(next)
  return next
}

// ── Search ──
export async function searchAuctionService(q: string): Promise<SearchResponse> {
  const lower = q.toLowerCase()
  return {
    auctions: MOCK_AUCTIONS.filter(
      (a) => a.title.toLowerCase().includes(lower) || a.id.toLowerCase().includes(lower)
    ).map((a) => ({ id: a.id, title: a.title, type: a.type, status: a.status })),
    contracts: MOCK_CONTRACTS.filter(
      (c) =>
        c.id.toLowerCase().includes(lower) ||
        c.vendorName.toLowerCase().includes(lower) ||
        c.lane.toLowerCase().includes(lower)
    ).map((c) => ({ id: c.id, vendorName: c.vendorName, lane: c.lane, status: c.status })),
  }
}
