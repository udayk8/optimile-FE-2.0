import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  Auction,
  AuctionBid,
  AuctionLane,
  AuctionState,
  Contract,
  ContractStatus,
  Location,
} from '@vendor/types'

/**
 * Cross-module integration with auction-web.
 *
 * auction-web (the ops/procurement app) authors auctions and contracts into a
 * shared localStorage key. Both apps run inside the one shell (same origin), so
 * the Vendor Portal reads that SAME key to:
 *   - surface live auctions to the logged-in vendor,
 *   - place bids back into each lane's ranking (auction-web reads them on its
 *     ranking/award screens),
 *   - read the contract records produced once an auction is awarded.
 *
 * Mirrors the finance↔vendor bridge (`vendorInvoiceFlow`). This file translates
 * the auction-web data shapes into the Vendor Portal's own `Auction`/`Contract`
 * types so existing pages render unchanged. When the key is absent (standalone
 * vendor build, or auction-web never opened), the hooks return empty and pages
 * fall back to their local demo store.
 */
const AUCTION_STORE_KEY = 'optimile.auction-store'
const SESSION_CONTEXT_KEY = 'optimile.session.context'

// ── auction-web data shapes (read-only mirror; kept local to preserve the
// one-way module boundary — vendor-web never imports from @auction/*). ──
interface SourceLaneBid {
  rank: number
  vendorId: string
  vendorName: string
  amount: number
  timestamp: string
  tenantId?: string
}
interface SourceLane {
  id: string
  lane: string
  region?: string
  vehicleType: string
  capacityMt: number
  rateUnit: 'PER_TRIP' | 'PER_MT' | 'PER_KM'
  ceilingRate: number
  estimatedTrips?: number
  eligibleVendorIds: string[]
  timerEndsAt: string
  bidCount: number
  ranking: SourceLaneBid[]
  awardDecision?: { vendorId: string; vendorName: string; allocationRank: string; awardedAmount: number }[]
  rejectionReason?: string
}
interface SourceAuction {
  id: string
  title: string
  type: 'SPOT' | 'BULK' | 'LOT'
  status: 'DRAFT' | 'LIVE' | 'COMPLETED' | 'AWARDED' | 'NO_BIDS' | 'CANCELLED'
  tenantId?: string
  createdAt: string
  startAt?: string
  completedAt?: string
  minBidDecrement: number
  biddingWindowMinutes: number
  region?: string
  invitedVendorIds: string[]
  awardDeadline: string
  lanes: SourceLane[]
}
interface SourceContract {
  id: string
  sourceAuctionId: string
  vendorId: string
  vendorName: string
  lane: string
  region?: string
  vehicleType: string
  contractedRate: number
  rateUnit: 'PER_TRIP' | 'PER_MT' | 'PER_KM'
  volumeAllocationPercent: number
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'TERMINATED'
}
interface SourceStore {
  auctions: SourceAuction[]
  contracts: SourceContract[]
}

interface VendorIdentity {
  vendorId: string
  vendorName: string
  tenantId?: string
}

function readIdentity(): VendorIdentity {
  const fallback: VendorIdentity = { vendorId: 'v-001', vendorName: 'My Transport Co' }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(SESSION_CONTEXT_KEY)
    if (!raw) return fallback
    const session = JSON.parse(raw) as {
      loginType?: string
      vendorId?: string
      vendorName?: string
      tenantId?: string
    }
    if (session?.loginType !== 'VENDOR') return fallback
    return {
      vendorId: session.vendorId ?? fallback.vendorId,
      vendorName: session.vendorName ?? fallback.vendorName,
      tenantId: session.tenantId,
    }
  } catch {
    return fallback
  }
}

function readStore(): SourceStore {
  if (typeof window === 'undefined') return { auctions: [], contracts: [] }
  const raw = window.localStorage.getItem(AUCTION_STORE_KEY)
  if (!raw) return { auctions: [], contracts: [] }
  try {
    const parsed = JSON.parse(raw) as Partial<SourceStore>
    return { auctions: parsed.auctions ?? [], contracts: parsed.contracts ?? [] }
  } catch {
    return { auctions: [], contracts: [] }
  }
}

function writeStore(store: SourceStore) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUCTION_STORE_KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent('optimile-auction-store'))
}

// "Mumbai → Delhi" / "Mumbai -> Delhi" → ["Mumbai", "Delhi"]
function splitLane(lane: string): [string, string] {
  const parts = lane.split(/→|->/).map((p) => p.trim())
  return [parts[0] ?? lane, parts[1] ?? '']
}

function toLocation(city: string): Location {
  return { name: city, city, state: '' }
}

function mapState(source: SourceAuction, won: boolean): AuctionState {
  switch (source.status) {
    case 'LIVE':
      return source.startAt && new Date(source.startAt).getTime() > Date.now() ? 'UPCOMING' : 'LIVE'
    case 'COMPLETED':
      return 'PENDING_AWARD'
    case 'AWARDED':
      return won ? 'AWARDED' : 'NOT_AWARDED'
    case 'NO_BIDS':
      return 'NOT_AWARDED'
    case 'CANCELLED':
      return 'CANCELLED'
    default:
      return 'UPCOMING'
  }
}

function mapLane(lane: SourceLane, identity: VendorIdentity): AuctionLane {
  const [origin, destination] = splitLane(lane.lane)
  const best = lane.ranking.length
    ? Math.min(...lane.ranking.map((b) => b.amount))
    : undefined
  const myName = identity.vendorName.toLowerCase()
  const myBid = lane.ranking.find(
    (b) => b.vendorId === identity.vendorId || b.vendorName.toLowerCase() === myName,
  )
  return {
    id: lane.id,
    laneDetails: { origin: toLocation(origin), destination: toLocation(destination) },
    volumeRequirement: lane.capacityMt
      ? { estimatedVolume: lane.capacityMt, unit: 'MT', frequency: 'MONTHLY' }
      : undefined,
    basePrice: lane.ceilingRate || undefined,
    currentBestBid: best,
    bidCount: lane.ranking.length,
    myRank: myBid?.rank,
  }
}

function mapAuction(source: SourceAuction, identity: VendorIdentity): Auction {
  const myId = identity.vendorId
  const myName = identity.vendorName.toLowerCase()
  const won = source.lanes.some((l) =>
    (l.awardDecision ?? []).some((d) => d.vendorId === myId || d.vendorName.toLowerCase() === myName),
  )
  const vendorBids: AuctionBid[] = source.lanes.flatMap((lane) =>
    lane.ranking
      .filter((b) => b.vendorId === myId || b.vendorName.toLowerCase() === myName)
      .map((b) => ({
        id: `${lane.id}-${b.vendorId}`,
        laneId: lane.id,
        amount: b.amount,
        placedAt: b.timestamp,
        status: 'ACTIVE' as const,
      })),
  )
  const firstLane = source.lanes[0]
  return {
    id: source.id,
    type: source.type,
    customerName: source.title,
    vehicleTypeRequired: firstLane?.vehicleType ?? '—',
    startTime: source.startAt ?? source.createdAt,
    endTime: firstLane?.timerEndsAt ?? source.awardDeadline,
    state: mapState(source, won),
    lanes: source.lanes.map((lane) => ({
      ...mapLane(lane, identity),
      minBidDecrement: source.minBidDecrement,
    })),
    vendorBids,
    pricingUnit: firstLane?.rateUnit,
    awardDate: source.completedAt,
    createdAt: source.createdAt,
  }
}

// Visibility is tenant-scoped, NOT invite-scoped: once an auction is created it
// is visible to every vendor onboarded under the same tenant. Drafts are hidden.
// Auctions with no tenant stamp (legacy/seed data) stay visible to all so the
// demo dataset still shows up.
function isVisibleToVendor(source: SourceAuction, identity: VendorIdentity): boolean {
  if (source.status === 'DRAFT') return false
  if (!source.tenantId || !identity.tenantId) return true
  return source.tenantId === identity.tenantId
}

function mapContractStatus(status: SourceContract['status']): ContractStatus {
  if (status === 'TERMINATED') return 'TERMINATED'
  if (status === 'EXPIRED') return 'EXPIRED'
  return 'ACTIVE'
}

function mapContract(source: SourceContract): Contract {
  const [origin, destination] = splitLane(source.lane)
  return {
    id: source.id,
    customerName: source.region ?? 'Optimile Customer',
    customerGSTIN: '—',
    laneDetails: { origin: toLocation(origin), destination: toLocation(destination) },
    rateCard: [
      {
        vehicleType: source.vehicleType,
        rateType: source.rateUnit === 'PER_TRIP' ? 'PER_TRIP' : 'PER_KM',
        rate: source.contractedRate,
        surcharges: [],
      },
    ],
    volumeAllocation: { volume: source.volumeAllocationPercent, unit: '%', frequency: 'MONTHLY' },
    paymentTerms: { creditPeriodDays: 30, billingCycle: 'MONTHLY' },
    slaClauses: [],
    penaltyClauses: [],
    validityFrom: source.startDate,
    validityTo: source.endDate,
    renewalTerms: 'Auto-generated from auction award.',
    status: mapContractStatus(source.status),
    amendments: [],
    pdfUrl: `/contracts/${source.id}.pdf`,
    createdAt: source.startDate,
  }
}

/** Re-renders the caller whenever the shared auction store changes. */
function useStoreRevision(): number {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const bump = () => setRevision((v) => v + 1)
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUCTION_STORE_KEY) bump()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('optimile-auction-store', bump)
    window.addEventListener('focus', bump)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('optimile-auction-store', bump)
      window.removeEventListener('focus', bump)
    }
  }, [])
  return revision
}

export interface SourcingBridge {
  /** Auctions visible to the logged-in vendor, in the Portal's own shape. */
  auctions: Auction[]
  /** True when auction-web has populated the shared store. */
  hasShared: boolean
  /** Place (or revise) this vendor's bid on a lane; writes back to auction-web. */
  placeBid: (auctionId: string, laneId: string, amount: number) => void
}

export function useSourcingBridge(): SourcingBridge {
  const revision = useStoreRevision()
  const identity = useMemo(() => readIdentity(), [])

  const auctions = useMemo(() => {
    const store = readStore()
    return store.auctions
      .filter((a) => isVisibleToVendor(a, identity))
      .map((a) => mapAuction(a, identity))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, identity])

  const hasShared = useMemo(() => readStore().auctions.length > 0, [revision])

  const placeBid = useCallback(
    (auctionId: string, laneId: string, amount: number) => {
      const store = readStore()
      const timestamp = new Date().toISOString()
      const auctions = store.auctions.map((auction) => {
        if (auction.id !== auctionId) return auction
        return {
          ...auction,
          lanes: auction.lanes.map((lane) => {
            if (lane.id !== laneId) return lane
            const others = lane.ranking.filter((b) => b.vendorId !== identity.vendorId)
            const ranking = [
              ...others,
              {
                rank: 0,
                vendorId: identity.vendorId,
                vendorName: identity.vendorName,
                amount,
                timestamp,
                tenantId: identity.tenantId,
              },
            ]
              .sort((a, b) => a.amount - b.amount)
              .map((b, index) => ({ ...b, rank: index + 1 }))
            return { ...lane, ranking, bidCount: ranking.length }
          }),
        }
      })
      writeStore({ ...store, auctions })
    },
    [identity],
  )

  return { auctions, hasShared, placeBid }
}

/** Contracts awarded to the logged-in vendor via auction-web, Portal-shaped. */
export function useAuctionContractsBridge(): Contract[] {
  const revision = useStoreRevision()
  const identity = useMemo(() => readIdentity(), [])
  return useMemo(() => {
    const store = readStore()
    const myName = identity.vendorName.toLowerCase()
    return store.contracts
      .filter((c) => c.vendorId === identity.vendorId || c.vendorName.toLowerCase() === myName)
      .map(mapContract)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, identity])
}
