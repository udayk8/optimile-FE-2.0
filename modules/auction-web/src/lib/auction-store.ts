import type { Auction, Contract } from '@auction/types'
import { MOCK_AUCTIONS, MOCK_CONTRACTS } from '@auction/lib/mock-data'

/**
 * Cross-module source of truth for auctions + contracts.
 *
 * auction-web authors auctions here; the Vendor Portal (vendor-web) reads the
 * SAME localStorage key to surface live auctions to invited vendors, places
 * bids back into each lane's ranking, and reads the contracts produced once an
 * auction is awarded. Both apps run inside the one shell (same origin) so they
 * share localStorage. Mirrors the finance↔vendor bridge pattern.
 *
 * The key is seeded from the auction-web mocks on first load. vendor-web never
 * seeds — it only reads/writes an existing store and falls back to its own demo
 * data when the key is absent (standalone vendor build).
 */
export const AUCTION_STORE_KEY = 'optimile.auction-store'

export interface AuctionStoreSnapshot {
  auctions: Auction[]
  contracts: Contract[]
}

function notify() {
  if (typeof window === 'undefined') return
  // Same-tab writes don't fire the native `storage` event; emit a custom one so
  // listeners in the current document (and the cross-module bridge) can refresh.
  window.dispatchEvent(new CustomEvent('optimile-auction-store'))
}

export function loadStore(): AuctionStoreSnapshot {
  if (typeof window === 'undefined') {
    return { auctions: [...MOCK_AUCTIONS], contracts: [...MOCK_CONTRACTS] }
  }
  const raw = window.localStorage.getItem(AUCTION_STORE_KEY)
  if (!raw) {
    const seeded: AuctionStoreSnapshot = {
      auctions: [...MOCK_AUCTIONS],
      contracts: [...MOCK_CONTRACTS],
    }
    window.localStorage.setItem(AUCTION_STORE_KEY, JSON.stringify(seeded))
    return seeded
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AuctionStoreSnapshot>
    return {
      auctions: parsed.auctions ?? [],
      contracts: parsed.contracts ?? [],
    }
  } catch {
    return { auctions: [], contracts: [] }
  }
}

export function saveStore(snapshot: AuctionStoreSnapshot) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUCTION_STORE_KEY, JSON.stringify(snapshot))
  notify()
}

export function getAuctions(): Auction[] {
  return loadStore().auctions
}

export function getAuction(id: string): Auction | undefined {
  return loadStore().auctions.find((a) => a.id === id)
}

export function getContracts(): Contract[] {
  return loadStore().contracts
}

/** Insert a new auction at the head of the list. */
export function addAuction(auction: Auction) {
  const store = loadStore()
  saveStore({ ...store, auctions: [auction, ...store.auctions] })
}

/** Replace one auction in place (matched by id). */
export function updateAuction(id: string, updater: (auction: Auction) => Auction) {
  const store = loadStore()
  saveStore({
    ...store,
    auctions: store.auctions.map((a) => (a.id === id ? updater(a) : a)),
  })
}

/**
 * Replace the contracts produced by one auction lane (removing any prior ones
 * for that lane) and append the freshly awarded set. Keeps award idempotent.
 */
export function replaceLaneContracts(auctionId: string, lane: string, contracts: Contract[]) {
  const store = loadStore()
  const kept = store.contracts.filter(
    (c) => !(c.sourceAuctionId === auctionId && c.lane === lane),
  )
  saveStore({ ...store, contracts: [...contracts, ...kept] })
}
