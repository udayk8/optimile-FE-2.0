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
  MOCK_BOOKINGS,
  MOCK_DASHBOARD_RESPONSE,
  MOCK_RFIS,
  MOCK_RFQS,
  MOCK_RFQ_RESPONSES,
  MOCK_VENDORS,
} from '@auction/lib/mock-data'
import {
  addAuction,
  getAuction,
  getAuctions,
  getContracts,
  loadStore,
  readSessionPrincipal,
  replaceLaneContracts,
  saveStore,
  updateAuction,
} from '@auction/lib/auction-store'

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
// Backed by the cross-module localStorage store so the Vendor Portal sees the
// same auctions, bids flow back, and award produces shared contract records.
export async function fetchAuctions(params?: { status?: string; type?: string; search?: string }): Promise<Auction[]> {
  let out = getAuctions()
  if (params?.status) out = out.filter((a) => a.status === params.status)
  if (params?.type) out = out.filter((a) => a.type === params.type)
  if (params?.search) {
    const q = params.search.toLowerCase()
    out = out.filter((a) => a.title.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
  }
  return out
}
export async function fetchAuction(id: string): Promise<Auction> {
  const item = getAuction(id)
  if (!item) throw new Error(`Auction ${id} not found`)
  return item
}
export async function createAuction(data: any): Promise<Auction> {
  const now = new Date()
  const principal = readSessionPrincipal()
  const launchNow = data.launchNow ?? data.status === 'LIVE'
  // A future startAt creates a scheduled auction: stored LIVE so it goes live
  // by itself at the start time, displayed as Upcoming until then.
  const scheduledStart =
    !launchNow && data.startAt && new Date(data.startAt).getTime() > now.getTime()
      ? new Date(data.startAt).toISOString()
      : undefined
  const windowMinutes = data.biddingWindowMinutes ?? 60
  const windowAnchor = scheduledStart ? new Date(scheduledStart).getTime() : now.getTime()
  const timerEndsAt = new Date(windowAnchor + windowMinutes * 60 * 1000).toISOString()
  const id = `AUC-${data.type ?? 'SPOT'}-${Date.now().toString().slice(-6)}`
  const next: Auction = {
    id,
    title: data.title ?? 'New auction',
    type: data.type ?? 'SPOT',
    status: launchNow || scheduledStart ? 'LIVE' : 'DRAFT',
    tenantId: data.tenantId ?? principal.tenantId,
    createdBy: data.createdBy ?? 'u-ops-1',
    createdByUserId: data.createdByUserId ?? principal.userId,
    createdByRole: data.createdByRole ?? 'OPS',
    createdAt: now.toISOString(),
    startAt: launchNow ? now.toISOString() : scheduledStart ?? data.startAt,
    contractStartDate: data.contractStartDate,
    contractEndDate: data.contractEndDate,
    minBidDecrement: data.minBidDecrement ?? 500,
    extensionTriggerMinutes: data.extensionTriggerMinutes ?? 5,
    extensionDurationMinutes: data.extensionDurationMinutes ?? 10,
    maxExtensions: data.maxExtensions ?? 3,
    biddingWindowMinutes: windowMinutes,
    bookingId: data.bookingId,
    region: data.region,
    invitedVendorIds: data.invitedVendorIds ?? [],
    awardDeadline: data.awardDeadline ?? new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    lanes: (data.lanes ?? []).map((lane: any, index: number) => ({
      timerEndsAt,
      extensionCount: 0,
      bidCount: 0,
      ranking: [],
      ...lane,
      id: lane.id ?? `${id}-L${index + 1}`,
      // Normalize the create-form's flat allocation percents into the nested
      // shape the award flow and contract generation expect.
      allocation: lane.allocation ?? {
        l1: lane.l1AllocationPct ?? 100,
        l2: lane.l2AllocationPct ?? 0,
        l3: lane.l3AllocationPct ?? 0,
      },
    })),
    auditTrail: [
      { id: `e-${Date.now()}`, type: 'CREATED', message: 'Auction draft created.', actor: data.createdBy ?? 'u-ops-1', timestamp: now.toISOString() },
      ...(launchNow ? [{ id: `e-${Date.now()}-l`, type: 'LAUNCHED' as const, message: 'Auction launched on creation.', actor: data.createdBy ?? 'u-ops-1', timestamp: now.toISOString() }] : []),
    ],
  }
  addAuction(next)
  return next
}
export async function launchAuction(id: string): Promise<Auction> {
  updateAuction(id, (a) => ({
    ...a,
    status: 'LIVE',
    startAt: a.startAt ?? new Date().toISOString(),
    auditTrail: [...a.auditTrail, { id: `e-${Date.now()}`, type: 'LAUNCHED', message: 'Auction launched and configuration locked.', actor: a.createdBy, timestamp: new Date().toISOString() }],
  }))
  return fetchAuction(id)
}
export async function cancelAuction(id: string, reason?: string): Promise<Auction> {
  updateAuction(id, (a) => ({
    ...a,
    status: 'CANCELLED',
    auditTrail: [...a.auditTrail, { id: `e-${Date.now()}`, type: 'CANCELLED', message: `Auction cancelled. Reason: ${reason ?? 'n/a'}`, actor: a.createdBy, timestamp: new Date().toISOString() }],
  }))
  return fetchAuction(id)
}
export async function completeAuction(id: string): Promise<Auction> {
  updateAuction(id, (a) => ({
    ...a,
    status: 'COMPLETED',
    completedAt: a.completedAt ?? new Date().toISOString(),
    auditTrail: [...a.auditTrail, { id: `e-${Date.now()}`, type: 'COMPLETED', message: 'Bidding window closed.', actor: a.createdBy, timestamp: new Date().toISOString() }],
  }))
  return fetchAuction(id)
}
export async function fetchBids(auctionId: string, laneId: string) {
  const auction = getAuction(auctionId)
  const lane = auction?.lanes.find((l) => l.id === laneId)
  return lane?.ranking ?? []
}
export async function placeBid(_auctionId: string, _laneId: string, _data: { vendorId: string; vendorName: string; amount: number }) {
  return { ok: true }
}

interface AwardDecisionInput {
  laneId: string
  vendorId: string
  vendorName: string
  allocationRank: 'L1' | 'L2' | 'L3'
  awardedBidRank: 'L1' | 'L2' | 'L3'
  awardedAmount: number
  allocationPercent: number
  overrideReason?: string
}

// Award writes the lane award decisions AND generates the linked contract
// records (for BULK/LOT) into the shared store, so both the auction Contract
// Output panel and the Vendor Portal Contracts page see them.
export async function awardAuction(auctionId: string, decisions: any[]) {
  const auction = getAuction(auctionId)
  if (!auction) throw new Error(`Auction ${auctionId} not found`)
  const principal = readSessionPrincipal()

  const byLane = new Map<string, AwardDecisionInput[]>()
  ;(decisions as AwardDecisionInput[]).forEach((d) => {
    byLane.set(d.laneId, [...(byLane.get(d.laneId) ?? []), d])
  })

  byLane.forEach((laneDecisions, laneId) => {
    const lane = auction.lanes.find((l) => l.id === laneId)
    if (!lane) return
    // SPOT awards produce a ONE-TIME lane contract: short validity, single
    // trip, consumed by exactly one spot booking on the lane.
    const isSpot = auction.type === 'SPOT'
    const contracts: Contract[] = laneDecisions.map((d) => ({
      id: `CNT-${Math.floor(1000 + Math.random() * 9000)}`,
      sourceAuctionId: auction.id,
      tenantId: auction.tenantId,
      awardedByUserId: principal.userId,
      contractType: auction.type as 'BULK' | 'LOT' | 'SPOT',
      vendorId: d.vendorId,
      vendorName: d.vendorName,
      lane: lane.lane,
      originCity: lane.originCity,
      destinationCity: lane.destinationCity,
      region: lane.region,
      vehicleType: lane.vehicleType,
      contractedRate: d.awardedAmount,
      rateUnit: lane.rateUnit,
      volumeAllocationPercent: d.allocationPercent,
      allocationRank: d.allocationRank,
      awardedAt: new Date().toISOString(),
      startDate: isSpot
        ? new Date().toISOString().slice(0, 10)
        : auction.contractStartDate ?? new Date().toISOString().slice(0, 10),
      endDate: isSpot
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : auction.contractEndDate ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      estimatedTrips: isSpot ? 1 : lane.estimatedTrips ?? 0,
      createdFrom: 'AUCTION_WIN' as const,
      oneTime: isSpot || undefined,
      status: 'ACTIVE' as const,
      l1OverrideReason: d.overrideReason,
      rateSyncedToTms: true,
      placementFailures: [],
      rateDeviationOpen: false,
    }))
    if (contracts.length > 0) replaceLaneContracts(auction.id, lane.lane, contracts)
  })

  updateAuction(auctionId, (a) => {
    const lanes = a.lanes.map((lane) => {
      const laneDecisions = byLane.get(lane.id)
      if (!laneDecisions) return lane
      return {
        ...lane,
        awardDecision: laneDecisions.map((d) => ({
          vendorId: d.vendorId,
          vendorName: d.vendorName,
          allocationRank: d.allocationRank,
          awardedBidRank: d.awardedBidRank,
          awardedAmount: d.awardedAmount,
          overrideReason: d.overrideReason,
          allocationPercent: d.allocationPercent,
        })),
      }
    })
    return {
      ...a,
      lanes,
      auditTrail: [...a.auditTrail, { id: `e-${Date.now()}`, type: 'AWARDED', message: 'Award decision saved and contract output prepared.', actor: a.createdBy, timestamp: new Date().toISOString() }],
    }
  })

  return fetchAuction(auctionId)
}

// Marks the auction AWARDED once every lane is either awarded or rejected.
export async function finalizeAuction(auctionId: string) {
  updateAuction(auctionId, (a) => {
    const allResolved = a.lanes.every((l) => l.awardDecision || l.rejectionReason)
    return allResolved
      ? { ...a, status: 'AWARDED', completedAt: a.completedAt ?? new Date().toISOString() }
      : a
  })
  return fetchAuction(auctionId)
}
export async function rejectAuction(auctionId: string, reason?: string): Promise<Auction> {
  updateAuction(auctionId, (a) => ({
    ...a,
    status: 'NO_BIDS',
    lanes: reason ? a.lanes.map((l) => ({ ...l, rejectionReason: reason })) : a.lanes,
    auditTrail: [...a.auditTrail, { id: `e-${Date.now()}`, type: 'CANCELLED', message: `Marked no bids. Reason: ${reason ?? 'n/a'}`, actor: a.createdBy, timestamp: new Date().toISOString() }],
  }))
  return fetchAuction(auctionId)
}
// Cross-module: vendors onboarded in tenant-admin live under this shared key.
// Surfacing them here means auctions can be awarded to those vendors, and the
// resulting contracts (stamped with the tenant vendor id/name) flow back under
// the same vendor in Tenant Admin → Vendor Detail → Contracts.
const TENANT_VENDORS_KEY = 'optimile.tenant.vendors'

function readTenantVendorOptions(): VendorOption[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(TENANT_VENDORS_KEY)
    if (!raw) return []
    const vendors = JSON.parse(raw) as { id: string; name: string; status?: string; tenantId?: string }[]
    const { tenantId } = readSessionPrincipal()
    return vendors
      .filter((v) => v.status !== 'inactive')
      .filter((v) => !tenantId || !v.tenantId || v.tenantId === tenantId)
      .map((v) => ({ id: v.id, name: v.name, score: 80 }))
  } catch {
    return []
  }
}

export async function fetchVendors(search?: string): Promise<VendorOption[]> {
  const seenNames = new Set<string>()
  const merged = [...readTenantVendorOptions(), ...MOCK_VENDORS].filter((v) => {
    const key = v.name.toLowerCase()
    if (seenNames.has(key)) return false
    seenNames.add(key)
    return true
  })
  if (!search) return merged
  const q = search.toLowerCase()
  return merged.filter((v) => v.name.toLowerCase().includes(q))
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
  let out = getContracts()
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
  const item = getContracts().find((c) => c.id === id)
  if (!item) throw new Error(`Contract ${id} not found`)
  return item
}
export async function terminateContract(id: string): Promise<Contract> {
  const store = loadStore()
  const item = store.contracts.find((c) => c.id === id)
  if (!item) throw new Error(`Contract ${id} not found`)
  saveStore({
    ...store,
    contracts: store.contracts.map((c) => (c.id === id ? { ...c, status: 'TERMINATED' } : c)),
  })
  return { ...item, status: 'TERMINATED' }
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
    auctions: getAuctions().filter(
      (a) => a.title.toLowerCase().includes(lower) || a.id.toLowerCase().includes(lower)
    ).map((a) => ({ id: a.id, title: a.title, type: a.type, status: a.status })),
    contracts: getContracts().filter(
      (c) =>
        c.id.toLowerCase().includes(lower) ||
        c.vendorName.toLowerCase().includes(lower) ||
        c.lane.toLowerCase().includes(lower)
    ).map((c) => ({ id: c.id, vendorName: c.vendorName, lane: c.lane, status: c.status })),
  }
}
