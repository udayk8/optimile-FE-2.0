# Auction Web App — Frontend Implementation Plan

> **Stack**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Shadcn/ui + React Router 7 + TanStack Query + Zustand  
> **Target**: Responsive customer-side auction operations portal  
> **Scope**: Spot, Bulk, and Lot auctions plus resulting contracts. Excludes RFI and RFQ.

---

## 1. Final Portal Scope

This app is intentionally narrow and operational. It covers:

- Auction creation
- Draft review and launch
- Live auction monitoring
- Completed auction review
- Procurement winner selection and override reason capture
- Contract viewing after award
- Dashboard visibility for action queues and SLA risk

It does **not** include:

- RFI
- RFQ
- Admin master management for lanes or vehicle types
- Dedicated notification center

Lane and vehicle type masters are assumed to exist in Admin. Base price is entered during auction configuration.

---

## 2. Final Top-Level Navigation

The portal has exactly **3 tabs**:

1. `Dashboard`
2. `Auctions`
3. `Contracts`

There is no separate `Masters`, `Exceptions`, or `Notifications` tab.

---

## 3. What Lives in Each Tab

## 3.1 Dashboard

Purpose: landing page for Ops and Procurement.

Widgets:

- Live auctions
- Pending awards
- Expiring contracts
- Contract status distribution
- Recent high-priority auctions

Actions:

- Jump to live auctions
- Jump to completed auctions awaiting award
- Jump to expiring or flagged contracts

## 3.2 Auctions

Purpose: the primary operational module.

Contains:

- Auction list
- Single `New Auction` entry with type selection inside the flow
- Draft auction review
- Live monitor
- Completed ranking review
- Award flow
- `L1 / L2 / L3` allocation assignment with reason when a non-top ranked bidder is awarded
- Cancel flow

Status handling inside this tab:

- Draft
- Live
- Completed
- Awarded
- No Bids
- Cancelled

Procurement awards contracts from the **Auction detail screen**, not from Contracts.

## 3.3 Contracts

Purpose: read and review outputs of auction awards.

Contains:

- Contract list
- Contract detail
- Allocation split visibility
- Allocation rank visibility (`L1 / L2 / L3`)
- Expiry status and warnings

This is the output layer, not the decision layer.

---

## 4. Awarding Logic in the UI

### Spot

- Ops opens a completed Spot auction
- Reviews ranked bids
- Confirms the top-ranked bidder for Spot
- Result is pushed back to booking
- No contract created

### Bulk / Lot

- Procurement opens a completed auction
- Uses the `Award` section in auction detail
- Reviews lane-by-lane leaderboard
- Assigns `L1 / L2 / L3` against ranked bidders
- Reason required when an allocation rank is assigned to a different bid rank
- Contracts are generated from the final lane decisions

So the separation is:

- `Auctions` = create, monitor, rank, award
- `Contracts` = view created contracts afterward

---

## 5. Route Map

| Route | Purpose |
|---|---|
| `/login` | Demo login |
| `/dashboard` | KPI and action summary |
| `/auctions` | Auction list and filters |
| `/auctions/new` | Single auction create entry |
| `/auctions/new/spot` | Spot auction create |
| `/auctions/new/bulk` | Bulk auction create |
| `/auctions/new/lot` | Lot auction create |
| `/auctions/:id` | Auction detail with overview, lanes, ranking, and award |
| `/contracts` | Contract list |
| `/contracts/:id` | Contract detail |

---

## 6. Auction Module Design

## 6.1 List View

Tabs / filters:

- All
- Draft
- Live
- Completed
- Awarded
- No Bids
- Cancelled

Columns:

- Auction ID
- Type
- Title / booking or region context
- Lane count
- Status
- Award deadline
- Created by

Primary action:

- New Auction

## 6.2 Create Flows

### Spot create

- Booking context
- Ceiling rate
- Bidding window
- Min bid decrement
- Extension settings
- Transparency mode
- Invited vendor list

### Bulk create

- Multi-lane builder
- Per-lane vehicle type
- Per-lane ceiling
- Estimated trips
- Single or split allocation
- Contract period
- Auction settings
- Invited vendor union

### Lot create

Same as Bulk, plus:

- Region selection

## 6.3 Detail View

Sections:

- Overview
- Lanes
- Ranking
- Award

The award section is the key destination for Procurement.

---

## 7. Contract Module Design

Contract list should support:

- Search
- Status filters
- Allocation rank visibility
- Expiry status visibility

Contract detail should show:

- Vendor
- Source auction
- Lane
- Vehicle type
- Rate
- Allocation percentage
- Rank
- Override reason, if any
- Placement failure records
- Rate deviation flag

---

## 8. Missing Items from Earlier Draft Removed Intentionally

These were removed because they do not fit your final scope:

- `Masters` tab
- `Notifications` tab
- Separate `Exceptions` tab

The operational exceptions are absorbed into:

- `Auctions` for `No Bids`, `Completed`, `Cancelled`, and award-pending cases
- `Contracts` for placement failures and rate deviation visibility

---

## 9. Implementation Phases

### Phase 1

- App shell
- Login/logout
- Dashboard
- Auctions list
- Contracts list

### Phase 2

- Spot/Bulk/Lot create flows
- Auction detail
- Live and completed views

### Phase 3

- Award workflow
- Override modal with reason
- Contract generation from awards

### Phase 4

- Mock interactions everywhere
- Empty/error/flag states
- Responsive polish

---

## 10. Acceptance Criteria

- User can log in and log out with demo users
- User can open Dashboard, Auctions, and Contracts
- User can create Spot, Bulk, and Lot auctions
- Draft auctions can be launched
- Completed Bulk/Lot auctions can be awarded from Auction detail
- Procurement can override to L2/L3 with mandatory reason
- Awarded lanes generate contracts
- Contracts link back to source auctions
- Mock data is present everywhere so buttons and flows are testable
