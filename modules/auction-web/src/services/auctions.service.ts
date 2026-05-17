import apiClient from '@auction/lib/api-client'
import type { Auction, AuctionLane, VendorOption, BookingReference } from '@auction/types'

// List
export async function fetchAuctions(params?: { status?: string; type?: string; search?: string }): Promise<Auction[]> {
  const res = await apiClient.get('/auctions', { params })
  return res.data.map(mapAuction)
}

// Detail
export async function fetchAuction(id: string): Promise<Auction> {
  const res = await apiClient.get(`/auctions/${id}`)
  return mapAuction(res.data)
}

// Create
export async function createAuction(data: any): Promise<Auction> {
  const res = await apiClient.post('/auctions', data)
  return mapAuction(res.data)
}

// Lifecycle
export async function launchAuction(id: string): Promise<Auction> {
  const res = await apiClient.post(`/auctions/${id}/launch`)
  return mapAuction(res.data)
}

export async function cancelAuction(id: string, reason?: string): Promise<Auction> {
  const res = await apiClient.post(`/auctions/${id}/cancel`, { reason })
  return mapAuction(res.data)
}

export async function completeAuction(id: string): Promise<Auction> {
  const res = await apiClient.post(`/auctions/${id}/complete`)
  return mapAuction(res.data)
}

// Bids
export async function fetchBids(auctionId: string, laneId: string) {
  const res = await apiClient.get(`/auctions/${auctionId}/lanes/${laneId}/bids`)
  return res.data
}

export async function placeBid(auctionId: string, laneId: string, data: { vendorId: string; vendorName: string; amount: number }) {
  const res = await apiClient.post(`/auctions/${auctionId}/lanes/${laneId}/bids`, data)
  return res.data
}

// Award
export async function awardAuction(auctionId: string, decisions: any[]) {
  const res = await apiClient.post(`/auctions/${auctionId}/award`, decisions)
  return res.data
}

export async function finalizeAuction(auctionId: string) {
  const res = await apiClient.post(`/auctions/${auctionId}/finalize`)
  return res.data
}

export async function rejectAuction(auctionId: string, reason?: string) {
  const res = await apiClient.post(`/auctions/${auctionId}/reject`, { reason })
  return res.data
}

// Lookups
export async function fetchVendors(search?: string): Promise<VendorOption[]> {
  const res = search
    ? await apiClient.get('/vendors/lookup', { params: { search } })
    : await apiClient.get('/vendors')
  return res.data
}

export async function fetchBookings(): Promise<BookingReference[]> {
  const res = await apiClient.get('/bookings', { params: { status: 'PENDING_AUCTION' } })
  return res.data.map((b: any) => ({
    id: b.id,
    lane: b.lane,
    vehicleType: b.vehicleType,
    commodity: b.commodity,
    quantity: b.quantity,
    uom: b.uom,
    loadingDate: b.loadingDate,
    status: b.status,
  }))
}

export async function fetchBooking(id: string): Promise<BookingReference> {
  const res = await apiClient.get(`/bookings/${id}`)
  const b = res.data
  return {
    id: b.id,
    lane: b.lane,
    vehicleType: b.vehicleType,
    commodity: b.commodity,
    quantity: b.quantity,
    uom: b.uom,
    loadingDate: b.loadingDate,
    status: b.status,
  }
}

// Mapper — backend field names → frontend type names
function mapAuction(d: any): Auction {
  return {
    id: d.id,
    title: d.title,
    type: d.type,
    status: d.status,
    createdBy: d.createdById ?? d.createdBy ?? '',
    createdByRole: d.createdByRole ?? 'OPS',
    createdAt: d.createdAt,
    startAt: d.startAt,
    completedAt: d.completedAt,
    contractStartDate: d.contractStartDate,
    contractEndDate: d.contractEndDate,
    minBidDecrement: d.minBidDecrement ?? 0,
    extensionTriggerMinutes: d.extensionTriggerMinutes ?? 5,
    extensionDurationMinutes: d.extensionDurationMinutes ?? 10,
    maxExtensions: d.maxExtensions ?? 3,
    biddingWindowMinutes: d.biddingWindowMinutes ?? 60,
    bookingId: d.bookingId,
    region: d.region,
    invitedVendorIds: d.invitedVendorIds ?? [],
    awardDeadline: d.awardDeadline ?? '',
    lanes: (d.lanes ?? []).map(mapLane),
    auditTrail: (d.auditTrail ?? []).map((e: any) => ({
      id: e.id,
      type: e.eventType ?? e.type,
      message: e.message,
      actor: e.actor,
      timestamp: e.eventTimestamp ?? e.timestamp,
    })),
  }
}

function mapLane(d: any): AuctionLane {
  return {
    id: d.id,
    lane: d.lane,
    region: d.region,
    vehicleType: d.vehicleType,
    capacityMt: d.capacityMt ?? 0,
    rateUnit: d.rateUnit ?? 'PER_TRIP',
    ceilingRate: d.ceilingRate ?? 0,
    estimatedTrips: d.estimatedTrips,
    basePriceSource: d.basePriceSource ?? 'MANUAL',
    allocationMode: d.allocationMode ?? 'SINGLE',
    allocation: {
      l1: d.l1AllocationPct ?? 100,
      l2: d.l2AllocationPct ?? 0,
      l3: d.l3AllocationPct ?? 0,
    },
    eligibleVendorIds: d.eligibleVendorIds ?? [],
    timerEndsAt: d.timerEndsAt ?? '',
    extensionCount: d.extensionCount ?? 0,
    bidCount: d.bidCount ?? 0,
    ranking: (d.ranking ?? []).map((b: any) => ({
      rank: b.bidRank ?? b.rank,
      vendorId: b.vendorId,
      vendorName: b.vendorName,
      amount: b.amount,
      timestamp: b.placedAt ?? b.timestamp,
    })),
    awardDecision: d.awardDecision?.length ? d.awardDecision.map((a: any) => ({
      vendorId: a.vendorId,
      vendorName: a.vendorName,
      allocationRank: a.allocationRank,
      awardedBidRank: a.awardedBidRank,
      awardedAmount: a.awardedAmount,
      overrideReason: a.overrideReason,
      allocationPercent: a.allocationPercent,
    })) : undefined,
    rejectionReason: d.rejectionReason,
  }
}
