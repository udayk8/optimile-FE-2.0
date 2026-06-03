# Auction-Web Module — Complete Deep Code Review
**Module:** `/modules/auction-web/`
**Scan Date:** 2026-06-03
**Stack:** React + TypeScript + Vite | Zustand + React Query + Axios | ExcelJS | Sonner toasts
**Purpose:** Procurement control tower — freight auction creation/management, vendor sourcing (RFI/RFQ), contract lifecycle, award decisions, and RFQ response aggregation

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Route Hierarchy](#2-route-hierarchy)
3. [Navigation & Sidebar Structure](#3-navigation--sidebar-structure)
4. [Screen Inventory](#4-screen-inventory)
5. [Feature Inventory](#5-feature-inventory)
6. [Auction Lifecycle](#6-auction-lifecycle)
7. [Award Decision Workflow](#7-award-decision-workflow)
8. [Contract Lifecycle](#8-contract-lifecycle)
9. [Sourcing Workflow (RFI / RFQ)](#9-sourcing-workflow-rfi--rfq)
10. [Form Analysis](#10-form-analysis)
11. [API Catalog](#11-api-catalog)
12. [State Management](#12-state-management)
13. [RBAC & Permissions](#13-rbac--permissions)
14. [Business Rules Catalog](#14-business-rules-catalog)
15. [Dependency Matrix](#15-dependency-matrix)
16. [Edge Cases](#16-edge-cases)
17. [Hidden Features & Technical Debt](#17-hidden-features--technical-debt)
18. [Missing Features Report](#18-missing-features-report)
19. [Complete Type & Enum Reference](#19-complete-type--enum-reference)

---

## 1. Architecture Overview

### Problem Domain
A procurement-focused control tower for logistics freight auctions. Enables internal ops/procurement teams to create SPOT, BULK, and LOT freight auctions, invite vendors to bid, execute time-bound reverse auctions, make award decisions (with L1/L2/L3 allocation), generate contracts, manage the contract lifecycle, conduct RFI/RFQ campaigns for vendor sourcing, and aggregate vendor quote responses.

### Key Characteristics
- **Internal-only portal** — no vendor-facing auction bidding UI (vendors bid via vendor-web)
- **Real HTTP services wired** — Axios client with Bearer token + 401 handler
- **Zustand app store** — mock data as fallback; real API behind env vars
- **Excel import/export** — lane import via ExcelJS, RFQ responses via CSV parsing
- **Cross-module bridge** — shared `localStorage["optimile.auction-store"]` syncs with vendor-web

### User Roles

| Internal Role | Maps From |
|---|---|
| `ADMIN` | "Administration" |
| `OPS` | "Auction Head" (default) |
| `PROCUREMENT` | "Procurement Head" |
| `FINANCE` | "Finance Manager" |
| `EXECUTIVE` | — |

### Path Aliases
```
@auction → ./src
@shared-auth → ../../packages/shared-auth/src
@shared-ui  → ../../packages/shared-ui/src
@shared-utils → ../../packages/shared-utils/src
```

### API Base URL
```
VITE_API_BASE_URL || '/api/v1'
Timeout: 30,000ms
```

### Query Client Config
```typescript
staleTime: 30_000
retry: 1
refetchOnWindowFocus: false
```

### Toast Provider
Sonner — position: `top-right`, `richColors`, `closeButton`

---

## 2. Route Hierarchy

```
/auction (base)
│
├── /                    → Redirect → /auction/dashboard
├── /dashboard           → DashboardPage
│
├── AUCTIONS
├── /auctions            → AuctionsPage
├── /auctions/new        → AuctionCreatePage (type selector)
├── /auctions/new/:type  → AuctionCreatePage (SPOT | BULK | LOT)
├── /auctions/:id        → AuctionDetailPage
│
├── CONTRACTS
├── /contracts           → ContractsPage
├── /contracts/:id       → ContractsPage (detail view embedded)
│
├── SOURCING
├── /sourcing            → SourcingPage (RFI | RFQ tabs)
├── /sourcing/rfi/new    → RfiCreatePage
├── /sourcing/rfi/:id    → RfiDetailPage
├── /sourcing/rfq/new    → RfqCreatePage
├── /sourcing/rfq/:id    → RfqDetailPage
│
├── /rfq-responses       → RfqResponsesPage
│
└── * → Redirect → /auction/dashboard

Route Wrapper: AuctionRouteWrapper
  - Shows suspension warning banner if auctionUser?.status === 'SUSPENDED'
Auth: All routes wrapped with ProtectedRoute (from @shared-auth)
```

---

## 3. Navigation & Sidebar Structure

```
SIDEBAR NAVIGATION:

Dashboard       (LayoutDashboard)  → /auction/dashboard
Client Hub      (FileText)         → /auction/sourcing
RFQ Responses   (FileSpreadsheet)  → /auction/rfq-responses
Auctions        (Gavel)            → /auction/auctions
Contracts       (FileText)         → /auction/contracts
```

### UI Store Controls
```typescript
sidebarCollapsed: boolean  // toggleSidebar(), setSidebarCollapsed()
mobileNavOpen: boolean     // setMobileNavOpen()
```

---

## 4. Screen Inventory

### Screen 1: DashboardPage — `/auction/dashboard`

**Purpose:** Procurement control center KPIs.

#### KPI Cards (3)

| Card | Metric | Click Navigation |
|---|---|---|
| Live Auctions | `auctions.filter(status==='LIVE').length` | → `/auction/auctions?tab=LIVE` |
| Pending Awards | `auctions.filter(status==='COMPLETED').length` | → `/auction/auctions?tab=COMPLETED` |
| Expiring Contracts | `contracts.filter(status==='EXPIRING_SOON').length` | → `/auction/contracts?tab=expiring_soon` |

#### Loading/Error
- Loading: `LoadingSkeleton` (2 lines hero + 3 cards)
- Error: `ErrorState` with retry callback

---

### Screen 2: AuctionsPage — `/auction/auctions`

**Purpose:** Full auction registry with tab filtering and search.

#### Tabs
`ALL` | `DRAFT` | `UPCOMING` | `LIVE` | `COMPLETED` | `AWARDED` | `NO_BIDS` | `CANCELLED`

**Tab → Status Mapping:**
- UPCOMING maps to DRAFT status (upcoming = drafted but not yet live)
- All others map 1:1 to AuctionStatus

#### Filters
- Search: `auction.id`, `title`, `type`, `createdBy` (case-insensitive)
- Tab filter (URL param `?tab=`)

#### Table Columns
| Column | Data |
|---|---|
| Auction Name | `auction.title` (font-medium) |
| Type | `auction.type` |
| Status | `StatusBadge` |
| Created By | `auction.createdBy` |
| Created At | `formatDateTime(createdAt)` |
| Auction Start Time | `formatDateTime(startAt)` or `'-'` |
| Lanes | `auction.lanes.length` (right-aligned) |
| Action | "Enter" (LIVE) or "View" → `/auction/auctions/:id` |

#### Permission Gate
`canCreateAuction` → "New Auction" button enabled/disabled

#### Pagination
PAGE_SIZE = 6

---

### Screen 3: AuctionDetailPage — `/auction/auctions/:id`

**Purpose:** Full auction management — launch, complete, award, cancel.

#### Tabs (4)
| Tab | Content |
|---|---|
| `overview` | Hero card, status + actions, booking info, contract output |
| `lanes` | Per-lane: vehicle type, ceiling rate, rate unit, estimated trips, lane timer |
| `ranking` | Per-lane bid leaderboard (L1/L2/L3) with amounts |
| `award` | Award decision UI (SPOT vs BULK/LOT logic) |

#### Status-Based Action Buttons

| Auction Status | Available Buttons |
|---|---|
| DRAFT | "Launch" → `handleLaunch()` |
| LIVE | "Complete" → `handleComplete()`, "Cancel" |
| LIVE + no bids | "Complete", "No Bids" → reject dialog, "Cancel" |
| COMPLETED | Award UI active, "Cancel" |
| AWARDED | View contracts only |
| CANCELLED | Read-only |

#### Cancel Dialog
- Reason input (pre-filled default)
- "Back" / "Confirm Cancel" → `handleCancel(reason)`

#### Reject (No Bids) Dialog
- Reason input
- "Back" / "Confirm No Bids" → `handleReject(reason)`

#### Award Modal
**SPOT auctions:**
- Select winning rank dropdown (L1/L2/L3)
- If not L1: reason input required (override)
- Calls: `awardAuction()` → `finalizeLaneAward()` → refresh

**BULK/LOT auctions (per lane):**
- Allocation rank dropdowns (L1/L2/L3 based on non-zero allocation %)
- Each dropdown: available bids `L# - vendorName`
- If any selection ≠ rank bid: override reason required
- Calls: `awardAuction()` → `finalizeLaneAward()` → refresh

#### Awarded Lane Display (post-award)
Green success box per lane showing:
- `L# · vendorName · from L# · allocation%`
- `CurrencyDisplay(awardedAmount)`

#### Linked Contracts
- Displayed in overview tab after award
- Each links to `/auction/contracts/:contractId`

---

### Screen 4: AuctionCreatePage — `/auction/auctions/new/:type`

**Purpose:** Create SPOT, BULK, or LOT auction with lanes, settings, vendor selection.

#### Auction Type Selector (if no `:type` param)
3 cards: SPOT | BULK | LOT — click navigates to `/auction/auctions/new/:type`

#### Form Layout
2-column: Left (form fields) | Right (review summary + create buttons)

#### Core Form Fields
| Field | Type | Applies To |
|---|---|---|
| Title | text input | All |
| Region | dropdown | LOT only |
| Booking | dropdown (PENDING_AUCTION bookings) | SPOT only |
| Min Bid Decrement | number | All |
| Extension Trigger (min) | number | All |
| Extension Duration (min) | number | All |
| Max Extensions | number | All |
| Bidding Window (min) | number | All |
| Contract Start Date | date | BULK/LOT |
| Contract End Date | date | BULK/LOT |
| Vendor Selection | multi-select | All |

#### Lane Management
**Manual Mode (default):**
- Each lane card: lane dropdown, vehicle type dropdown, capacity (auto-fill by vehicle type), commodity, rate unit, ceiling rate, estimated trips, allocation mode
- SPLIT mode adds: L1%, L2%, L3% inputs
- LOT: "Add Lane" button (multiple lanes)
- SPOT: Single lane only

**Excel Import Mode:**
- File upload dropzone
- Headers: `lane, vehicleType, capacityMt, rateUnit, ceilingRate, estimatedTrips, allocationMode, l1, l2, l3`
- Parsed via ExcelJS, rows start at index 1 (skip header)
- Error thrown on invalid format

#### Default Settings by Type

| Setting | SPOT | BULK | LOT |
|---|---|---|---|
| Bidding Window | 20 min | 24h (1440 min) | 24h |
| Default Ceiling Rate | 52,000 | 10,000 | 10,000 |
| Estimated Trips | 1 | 300 | 300 |
| Allocation Mode | SINGLE | SINGLE | SPLIT |
| L1 % | 100 | 100 | 60 |
| L2 % | 0 | 0 | 30 |
| L3 % | 0 | 0 | 10 |
| Contract Dates | None | +14 to +190 days | +14 to +190 days |

#### Vehicle Type → Capacity Mapping
| Type | Capacity (MT) |
|---|---|
| 20 MT Open Body | 20 |
| 32 FT Closed Body | 32 |
| 32 FT Open Body | 32 |
| 20 FT Container | 20 |
| LCV | 8 |

#### Lane Filtering by Region
| Region | Available Lanes |
|---|---|
| North India | Mumbai → Delhi, Delhi → Lucknow |
| South India | Mumbai → Bangalore, Bangalore → Chennai, Chennai → Mumbai |
| West India | Pune → Jaipur, Ahmedabad → Surat |
| Others | All 7 lanes |

#### Action Buttons (right sidebar)
- **"Create & Save as Draft"** → `handleCreate(launchNow=false)` → navigates to `/auction/auctions/:id`
- **"Create & Launch Now"** → `handleCreate(launchNow=true)` → navigates to `/auction/auctions/:id`

---

### Screen 5: ContractsPage — `/auction/contracts`

**Purpose:** Contract registry with lifecycle management and detail view.

#### Tabs
`ALL` | `ACTIVE` | `EXPIRING_SOON` | `EXPIRED`

#### Filters
- Search: `contract.id`, `vendorName`, `lane`, `vehicleType`
- Tab filter (URL param `?tab=`)

#### Table Columns
Contract ID | Vendor | Lane | Vehicle Type | Status Badge | Start Date | End Date | Rate (₹ + unit) | Allocation (rank - %)

#### Detail View (if `?id=` param)
2-column grid:
- Contract ID, Vendor, Lane + Vehicle Type, Rate + Unit, Validity (start–end), Allocation (rank - %), Trips, Placement Failures count

**Action Buttons:**
- Status badge display
- "Terminate" (if status ≠ TERMINATED) → `handleTerminate()` → `toast.success`
- "Back to List" → clears selected contract

#### Pagination
PAGE_SIZE = 6

---

### Screen 6: SourcingPage — `/auction/sourcing`

**Purpose:** RFI/RFQ campaign management hub.

#### Tabs
`RFI` | `RFQ` (default: RFI)

#### RFI Table Columns
ID | Campaign Title | Status | Created By | Created At | Deadline | Recipients count | Action (View Details → `/auction/sourcing/rfi/:id`)

#### RFQ Table Columns
ID | RFQ Title | Status | Created By | Created At | Deadline | Recipients count | Action (View Details → `/auction/sourcing/rfq/:id`)

**Filter:** Only PUBLISHED status shown

**Permission Gates:**
- `canCreateRfi` → "New RFI" button
- `canCreateRfq` → "New RFQ" button

#### Pagination
PAGE_SIZE = 10

---

### Screen 7: RfiCreatePage — `/auction/sourcing/rfi/new`

**Purpose:** Create a new RFI (Request for Information) campaign.

**Permission Gate:** If `!canCreateRfi` → shows access denied card with "Ask Tenant Admin" message.

**See [Section 10 Form Analysis](#10-form-analysis) for full field list.**

---

### Screen 8: RfiDetailPage — `/auction/sourcing/rfi/:id`

**Purpose:** View RFI details, vendor tracking, and resend emails.

#### Action Buttons
| Condition | Button |
|---|---|
| status = DRAFT | "Publish" → `patchRfiStatus(id, 'PUBLISHED')` |
| Always | "Resend Email" (disabled 3s after click) |

#### Vendor Tracking List
- Each recipient email with status badge:
  - `RESPONDED` → success (green)
  - `DECLINED` → destructive (red)
  - `PENDING` → secondary (gray)

#### Message Preview
- Shows `messageToVendor` in `pre-wrap` whitespace formatting

---

### Screen 9: RfqCreatePage — `/auction/sourcing/rfq/new`

**Purpose:** Create a new RFQ (Request for Quotation) campaign.

**Permission Gate:** If `!canCreateRfq` → access denied card.

---

### Screen 10: RfqDetailPage — `/auction/sourcing/rfq/:id`

**Purpose:** View RFQ details and vendor response tracking.

---

### Screen 11: RfqResponsesPage — `/auction/rfq-responses`

**Purpose:** Aggregate and compare vendor RFQ responses.

#### Filters
- Date range: fromDate / toDate (toDate includes 23:59:59)
- Search: `lane` or `vendorName` (case-insensitive)

#### Upload Section
- RFQ selector dropdown (from available RFQs)
- Vendor name input
- File upload (CSV format)
- Upload button → `handleUpload()`

#### CSV Format
```
lane, vehicleType, price
(one row per lane/vehicle combination)
```

#### Flattened Table Columns
| Column | Data |
|---|---|
| Lane | `lane` (font-medium) |
| Vehicle Type | `vehicleType` |
| Quoted Price | `formatCurrency(price)` (right-aligned, bold) |
| Lane Avg | `formatCurrency(avgPrice)` computed per lane+vehicleType |
| Vendor | `vendorName` |
| Uploaded | `formatDate(uploadedAt)` |

**avgPrice Computation:**
Group all rows by `lane + vehicleType`, compute average price across all vendor submissions.

#### Pagination
PAGE_SIZE = 15

---

## 5. Feature Inventory

| # | Feature | Status | Screen |
|---|---|---|---|
| F-01 | Procurement dashboard KPIs (3) | Live (mock + API) | Dashboard |
| F-02 | Auction list with 8-tab filter | Live | AuctionsPage |
| F-03 | Auction search | Live | AuctionsPage |
| F-04 | Create SPOT auction | Live | AuctionCreatePage |
| F-05 | Create BULK auction | Live | AuctionCreatePage |
| F-06 | Create LOT auction (multi-lane) | Live | AuctionCreatePage |
| F-07 | Excel lane import (ExcelJS) | Live | AuctionCreatePage |
| F-08 | Create & Save as Draft | Live | AuctionCreatePage |
| F-09 | Create & Launch Now | Live | AuctionCreatePage |
| F-10 | Launch auction (DRAFT → LIVE) | Live | AuctionDetailPage |
| F-11 | Complete auction (LIVE → COMPLETED) | Live | AuctionDetailPage |
| F-12 | Cancel auction (any → CANCELLED) | Live | AuctionDetailPage |
| F-13 | Reject auction (No Bids) | Live | AuctionDetailPage |
| F-14 | Award SPOT auction (L1/L2/L3) | Live | AuctionDetailPage |
| F-15 | Award BULK/LOT lanes (per-lane) | Live | AuctionDetailPage |
| F-16 | Override award (L2/L3 with reason) | Live | AuctionDetailPage |
| F-17 | Contract auto-generation on award | Live | AuctionDetailPage |
| F-18 | Lane bid leaderboard (L1/L2/L3) | Live | AuctionDetailPage (ranking tab) |
| F-19 | Lane timer countdown | Live | AuctionDetailPage (lanes tab) |
| F-20 | Contract list with status tabs | Live | ContractsPage |
| F-21 | Contract detail view | Live | ContractsPage |
| F-22 | Contract termination | Live | ContractsPage |
| F-23 | Placement failure tracking | Live (model) | ContractsPage |
| F-24 | RFI campaign creation | Live | RfiCreatePage |
| F-25 | RFI detail + vendor tracking | Live | RfiDetailPage |
| F-26 | RFI publish action | Live | RfiDetailPage |
| F-27 | RFI email resend (3s cooldown) | Live | RfiDetailPage |
| F-28 | RFQ campaign creation | Live | RfqCreatePage |
| F-29 | RFQ detail + vendor tracking | Live | RfqDetailPage |
| F-30 | RFQ response upload (CSV) | Live | RfqResponsesPage |
| F-31 | RFQ response lane avg price | Live | RfqResponsesPage |
| F-32 | RFQ date range filter | Live | RfqResponsesPage |
| F-33 | Vendor search + selection | Live | AuctionCreatePage |
| F-34 | Booking linkage (SPOT) | Live | AuctionCreatePage |
| F-35 | Region-based lane filtering | Live | AuctionCreatePage |
| F-36 | Suspension warning banner | Live | AuctionRouteWrapper |
| F-37 | Cross-module auction bridge | Live | localStorage sync with vendor-web |
| F-38 | RBAC permission gates (3 features) | Live (always-true stub) | All create pages |
| F-39 | Auction event audit trail | Live (model) | AuctionDetailPage |
| F-40 | Debit note on placement failure | **Model only** | Contract model |
| F-41 | Rate sync to TMS | **Model only** | `rateSyncedToTms` field |
| F-42 | NBFC / finance integration | **MISSING** | Not found |
| F-43 | Export auctions/contracts | **MISSING** | Not found |
| F-44 | Notification system | **MISSING** | No notifications page in routes |

---

## 6. Auction Lifecycle

```
[Create]
  ├──► DRAFT (Save as Draft)
  │       └──► [Launch] → LIVE
  └──► LIVE  (Create & Launch Now)
              │
              ├──► [Has bids] → [Complete] → COMPLETED
              │                                    └──► [Award] → AWARDED
              │                                                      └──► Contracts generated
              ├──► [No bids] → [No Bids action] → NO_BIDS (rejected)
              └──► [Cancel] → CANCELLED (from DRAFT or LIVE)
```

### Auction Status Values
`DRAFT` | `LIVE` | `COMPLETED` | `AWARDED` | `NO_BIDS` | `CANCELLED`

### Auction Event Audit Trail
Every state change appended to `auction.auditTrail[]`:

| Event Type | Trigger |
|---|---|
| `CREATED` | On create |
| `LAUNCHED` | On launch |
| `EXTENDED` | Timer extension triggered |
| `COMPLETED` | On complete |
| `AWARDED` | On award finalization |
| `CANCELLED` | On cancel |
| `PLACEMENT_FAILURE` | Vendor fails to fulfill |
| `OVERRIDE` | L2/L3 award override |
| `CONTRACT_CREATED` | Contract generated |

**Event ID Pattern:** `{auctionId}-evt-{type}-{count}`

### Auction Types & Differences

| Attribute | SPOT | BULK | LOT |
|---|---|---|---|
| Lanes | 1 (auto) | 1+ | 1+ (regional grouping) |
| Bidding Window | 20 min | Configurable | Configurable |
| Allocation | SINGLE (L1=100%) | SINGLE | SPLIT (L1/L2/L3) |
| Contract Dates | None | Required | Required |
| Booking Link | Yes (PENDING_AUCTION) | No | No |
| Region | No | No | Yes |
| Award UI | Single winner | Per-lane | Per-lane with L1/L2/L3 |

### Auction Settings Fields

| Field | Default (SPOT) | Default (BULK/LOT) |
|---|---|---|
| `minBidDecrement` | Configurable | Configurable |
| `extensionTriggerMinutes` | Configurable | Configurable |
| `extensionDurationMinutes` | Configurable | Configurable |
| `maxExtensions` | Configurable | Configurable |
| `biddingWindowMinutes` | 20 | 1440 (24h) |
| `contractStartDate` | None | now + 14 days |
| `contractEndDate` | None | now + 190 days |

### Timer Extension Logic
- When a bid is placed within `extensionTriggerMinutes` of deadline → auto-extends by `extensionDurationMinutes`
- Max extensions: `maxExtensions`
- `extensionCount` tracked per lane

---

## 7. Award Decision Workflow

### SPOT Auction Award
```
COMPLETED (1 lane, SINGLE allocation)
  └──► Select winning rank (L1 default, L2/L3 with override reason)
          └──► awardAuction() + finalizeLaneAward()
                    └──► AWARDED + Contract created
```

### BULK / LOT Auction Award (per lane)
```
COMPLETED (1+ lanes)
  └──► Per lane: assign bid rank to each allocation rank
          ├──► allocationMode=SINGLE: only L1 matters (100%)
          └──► allocationMode=SPLIT: L1 + L2 + L3 dropdown per allocation %
  └──► If any selection ≠ natural rank: override reason required
  └──► finalizeLaneAward(auctionId, laneId, selections[], actor, reason)
          └──► AWARDED per lane + Contracts created per vendor/allocation
```

### Lane Award Decision Model
```typescript
awardDecision[]: {
  vendorId: string
  vendorName: string
  allocationRank: 'L1' | 'L2' | 'L3'   // which slot this vendor fills
  awardedBidRank: 'L1' | 'L2' | 'L3'   // which bid they won from
  awardedAmount: number
  overrideReason?: string               // required if awardedBidRank ≠ allocationRank
  allocationPercent: number             // % of volume
}
```

### Lane Reject (No Bids)
```
rejectLane(auctionId, laneId, actor, reason)
  └──► lane.rejectionReason = reason
```

---

## 8. Contract Lifecycle

```
[Auction Awarded]
  └──► Contract AUTO-GENERATED per vendor/allocation rank
            ├──► ACTIVE
            │       └──► [Approaching end date] → EXPIRING_SOON
            │                                          └──► EXPIRED (post end date)
            └──► TERMINATED (manual action)
```

### Contract Status Values
`ACTIVE` | `EXPIRING_SOON` | `EXPIRED` | `TERMINATED`

### Contract Fields (Complete)
```typescript
{
  id: string
  sourceAuctionId: string
  tenantId?: string
  awardedByUserId?: string
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
  l1OverrideReason?: string            // if awarded to non-L1 vendor
  rateSyncedToTms: boolean             // rate pushed to TMS (not yet wired)
  placementFailures: PlacementFailure[]
  rateDeviationOpen: boolean
}
```

### Placement Failure Model
```typescript
{
  failedVendor: string
  replacementVendor: string
  originalRate: number
  replacementRate: number
  differential: number
  debitNoteTriggered: boolean    // debit note model — not wired to UI
}
```

---

## 9. Sourcing Workflow (RFI / RFQ)

### RFI Lifecycle
```
CREATE → PUBLISHED → CLOSED
(DRAFT → PUBLISHED via "Publish" button on detail page)
```

### RFQ Lifecycle
```
DRAFT → PUBLISHED → EVALUATING → AWARDED | CANCELLED
```

### Vendor Response Status
`PENDING` | `RESPONDED` | `DECLINED`

### RFI Tracking
- Each recipient email tracked in `vendorTracking[]`
- Status updated via `updateSourcingVendorStatus()`
- Detail page shows status badge per recipient

### RFQ Response Upload
1. Select RFQ from dropdown
2. Enter vendor name
3. Upload CSV file
4. Parse CSV → `RfqResponseRow[]` (lane, vehicleType, price)
5. Submit → `uploadRfqResponse()` → prepended to response list

### Lane Average Price Computation
Group all `RfqResponse.rows` by `lane + vehicleType` → compute mean price → displayed as `Lane Avg` column

---

## 10. Form Analysis

### Form 1: Create Auction

| Field | Type | Required | Applies To | Notes |
|---|---|---|---|---|
| `title` | text | Yes | All | Auction title |
| `region` | dropdown | Yes | LOT only | Filters available lanes |
| `bookingId` | dropdown | No | SPOT only | PENDING_AUCTION bookings |
| `minBidDecrement` | number | Yes | All | Minimum bid step |
| `extensionTriggerMinutes` | number | Yes | All | Minutes before end that triggers extension |
| `extensionDurationMinutes` | number | Yes | All | Duration of each extension |
| `maxExtensions` | number | Yes | All | Cap on extensions |
| `biddingWindowMinutes` | number | Yes | All | Total bidding duration |
| `contractStartDate` | date | Yes | BULK/LOT | Auto: now+14 days |
| `contractEndDate` | date | Yes | BULK/LOT | Auto: now+190 days |
| `invitedVendorIds[]` | multi-select | Yes | All | From VendorOption list |
| `launchNow` | boolean | Auto | All | From button clicked |

**Per Lane (manual mode):**
| Field | Type | Required |
|---|---|---|
| `lane` | dropdown | Yes |
| `vehicleType` | dropdown | Yes |
| `capacityMt` | number | Auto-fill by vehicleType |
| `commodity` | dropdown | Yes |
| `rateUnit` | dropdown | Yes |
| `ceilingRate` | number | Yes |
| `estimatedTrips` | number | Conditional |
| `allocationMode` | dropdown | Yes |
| `l1` / `l2` / `l3` | number % | Conditional (SPLIT mode) |

### Form 2: Create RFI

| Field | Type | Required | Validation |
|---|---|---|---|
| `title` | text | Yes | Non-empty |
| `description` | textarea (rows=3) | Yes | Non-empty |
| `messageToVendor` | textarea (rows=4) | No | — |
| `deadline` | date | Yes | Default: now+7 days |
| `emailsRaw` | textarea (rows=3) | Yes | Comma-separated, at least 1 valid email |
| `templateFileName` | file | No | Excel template upload |

**Email parsing:** `split(',').map(trim).filter(non-empty)`

### Form 3: Create RFQ

| Field | Type | Required | Validation |
|---|---|---|---|
| `title` | text | Yes | Non-empty |
| `messageToVendor` | textarea (rows=4) | No | — |
| `deadline` | date | Yes | Default: now+7 days |
| `emailsRaw` | textarea (rows=3) | Yes | At least 1 valid email |
| `templateFileName` | file | No | Excel template upload |

### Form 4: RFQ Response Upload

| Field | Type | Required |
|---|---|---|
| `selectedRfqId` | dropdown | Yes |
| `vendorName` | text | Yes |
| `selectedFile` | file (CSV) | Yes |

**CSV Format:** `lane, vehicleType, price` (one row per entry)

### Form 5: Award SPOT Modal

| Field | Type | Required |
|---|---|---|
| Winning rank | dropdown (L1/L2/L3) | Yes |
| Override reason | text | Yes (if not L1) |

### Form 6: Award BULK/LOT Lane Modal

| Field | Type | Required |
|---|---|---|
| L1 assignment | dropdown | Yes (if L1 allocation > 0%) |
| L2 assignment | dropdown | Yes (if L2 allocation > 0%) |
| L3 assignment | dropdown | Yes (if L3 allocation > 0%) |
| Override reason | text | Yes (if any selection ≠ natural rank) |

### Form 7: Cancel Auction Dialog

| Field | Type | Required |
|---|---|---|
| Cancel reason | text input | Yes (pre-filled default) |

### Form 8: Reject (No Bids) Dialog

| Field | Type | Required |
|---|---|---|
| Rejection reason | text input | Yes (pre-filled default) |

---

## 11. API Catalog

### Auctions Service (`vendorClient → /api/v1`)

| Endpoint | Method | Payload | Purpose |
|---|---|---|---|
| `/auctions` | GET | `status?, type?, search?` | List auctions |
| `/auctions/:id` | GET | — | Single auction |
| `/auctions` | POST | CreateAuctionInput | Create auction |
| `/auctions/:id/launch` | POST | — | Launch auction |
| `/auctions/:id/cancel` | POST | `{ reason }` | Cancel auction |
| `/auctions/:id/complete` | POST | — | Complete auction |
| `/auctions/:id/lanes/:laneId/bids` | GET | — | Get lane bids |
| `/auctions/:id/lanes/:laneId/bids` | POST | `{ vendorId, vendorName, amount }` | Place bid |
| `/auctions/:id/award` | POST | decisions[] | Award lanes |
| `/auctions/:id/finalize` | POST | — | Finalize award |
| `/auctions/:id/reject` | POST | `{ reason }` | Reject (no bids) |
| `/vendors` | GET | `search?` | Vendor search |
| `/bookings` | GET | `{ status: 'PENDING_AUCTION' }` | Available bookings |
| `/bookings/:id` | GET | — | Single booking |

**Field Mappers:** `mapAuction()`, `mapLane()` — converts backend snake_case to frontend camelCase

### Contracts Service

| Endpoint | Method | Payload | Purpose |
|---|---|---|---|
| `/contracts` | GET | `status?, search?, vendorId?` | List contracts |
| `/contracts/:id` | GET | — | Single contract |
| `/contracts/:id/terminate` | POST | — | Terminate contract |

### Dashboard Service

| Endpoint | Method | Purpose |
|---|---|---|
| `/dashboard` | GET | KPI metrics + priority lists |

**Response Shape:**
```typescript
{
  liveAuctions: { label, value, insight }
  pendingAwards: { label, value, insight }
  expiringContracts: { label, value, insight }
  priorityAuctions: PriorityAuction[]
  expiringContractsList: ExpiringContract[]
}
```

### Sourcing Service

| Endpoint | Method | Payload | Purpose |
|---|---|---|---|
| `/rfis` | GET | `status?, search?` | List RFIs |
| `/rfis/:id` | GET | — | Single RFI |
| `/rfis` | POST | `{ title, description, deadline, targetEmails, messageToVendor, templateFileName }` | Create RFI |
| `/rfis/:id/status` | PATCH | `{ status }` | Update RFI status |
| `/rfqs` | GET | `status?, search?` | List RFQs |
| `/rfqs/:id` | GET | — | Single RFQ |
| `/rfqs` | POST | `{ title, deadline, targetEmails, messageToVendor, templateFileName }` | Create RFQ |
| `/rfqs/:id/status` | PATCH | `{ status }` | Update RFQ status |

### RFQ Responses Service

| Endpoint | Method | Payload | Purpose |
|---|---|---|---|
| `/rfq-responses` | GET | `search?, from?, to?` | List all responses |
| `/rfqs/:rfqId/responses` | POST | `{ fileName, vendorName, rows[] }` | Upload response |
| `/rfqs/:rfqId/responses` | GET | — | Get responses for RFQ |

### Search Service

| Endpoint | Method | Payload | Purpose |
|---|---|---|---|
| `/search` | GET | `{ q }` | Global search across auctions + contracts |

**Response:**
```typescript
{
  auctions: SearchResultItem[]
  contracts: SearchResultItem[]
}
```

### API Client Auth
```
Request headers:
  Authorization: Bearer {token}  (from stored session or auth store)
```

### 401 Handling
`useAuthStore.getState().logout()` → clear stored session → redirect to `/login`

---

## 12. State Management

### Zustand Stores (3)

#### Auth Store (`auth.store.ts`) — persisted
```typescript
{
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  setAuth(user, token): void
  logout(): void
}
// Persistence key: 'auction-web-auth'
```

#### UI Store (`ui.store.ts`)
```typescript
{
  sidebarCollapsed: boolean   // toggleSidebar(), setSidebarCollapsed()
  mobileNavOpen: boolean      // setMobileNavOpen()
}
```

#### App Store (`app.store.ts`)

**State:**
```typescript
{
  auctions: Auction[]
  contracts: Contract[]
  bookings: BookingReference[]
  vendors: VendorOption[]
  rfis: RfiType[]
  rfqs: RfqType[]
  rfqResponses: RfqResponse[]
}
```

**Key Actions:**

| Action | Effect |
|---|---|
| `createAuction(input)` | Creates DRAFT or LIVE (if launchNow), returns auctionId |
| `launchAuction(auctionId, actor)` | DRAFT → LIVE, appends LAUNCHED event |
| `cancelAuction(auctionId, actor, reason)` | → CANCELLED, appends CANCELLED event |
| `awardSpotAuction(auctionId, actor, bidRank)` | SPOT: awards to rank, creates contracts |
| `awardLaneToAllocationRank(auctionId, laneId, allocRank, bidRank, actor, reason)` | Multi-lane award with optional override |
| `finalizeLaneAward(auctionId, laneId, selections[], actor, reason)` | Finalizes selections, creates contracts |
| `rejectLane(auctionId, laneId, actor, reason)` | Sets `lane.rejectionReason` |
| `createRfi(input)` | Generates RFI-xxxx id, status PUBLISHED, all vendors PENDING |
| `createRfq(input)` | Generates RFQ-xxxx id, status PUBLISHED |
| `updateSourcingVendorStatus(type, id, vendorIdOrEmail, status)` | Updates vendor tracking status |
| `addRfqResponse(input)` | Adds with RFQR-xxxx id, prepends to list |
| `resetStore()` | Resets to initial MOCK data |

**ID Generation Patterns:**
- Auction: `AUC-{YYYYMMDD}-{seq}`
- RFI: `RFI-{xxxx}` (random-ish)
- RFQ: `RFQ-{xxxx}`
- RFQ Response: `RFQR-{xxxx}`
- Event: `{auctionId}-evt-{type}-{count}`

---

## 13. RBAC & Permissions

### Permission Context (`permission-context.tsx`)

```typescript
interface AuctionPermissions {
  canCreateAuction: boolean
  canCreateRfi: boolean
  canCreateRfq: boolean
}

// Default (fully permissive):
const DEFAULT_PERMISSIONS = {
  canCreateAuction: true,
  canCreateRfi: true,
  canCreateRfq: true
}
```

**Hook:** `useAuctionPermissions()` — returns permissions context

### Role-Based Pages (Implied)

| Role | Create Auction | Create RFI | Create RFQ | View All |
|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| OPS | ✅ | ✅ | ✅ | ✅ |
| PROCUREMENT | ✅ | ✅ | ✅ | ✅ |
| FINANCE | — | — | — | ✅ |
| EXECUTIVE | — | — | — | ✅ |

> **NOTE:** Currently all permissions default to `true`. Role-based gating is a stub.

### Suspension Warning
If `auctionUser?.status === 'SUSPENDED'` → banner shown in `AuctionRouteWrapper`. No functional lockout.

### RBAC Utility (`rbac.ts`)
All functions return `true` — **placeholder only:**
```typescript
canView(module): boolean     → true
canCreate(module, feature?)  → true
canEdit(module, feature?)    → true
canDelete(module, feature?)  → true
canApprove(module, feature?) → true
```

---

## 14. Business Rules Catalog

| # | Rule | Implementation |
|---|---|---|
| BR-01 | SPOT auction: single lane, single vendor (L1=100%) | Default settings + SINGLE allocationMode |
| BR-02 | LOT auction: SPLIT allocation (L1=60%, L2=30%, L3=10%) | Default settings |
| BR-03 | BULK auction: single allocation (L1=100%) | Default settings |
| BR-04 | LOT requires region selection | Region field shown only for LOT |
| BR-05 | SPOT requires booking link (optional) | Booking dropdown shown only for SPOT |
| BR-06 | Contract dates required for BULK/LOT | Not shown for SPOT |
| BR-07 | Contract start: +14 days from now | Auto-computed default |
| BR-08 | Contract end: +190 days from now | Auto-computed default |
| BR-09 | Override requires reason | If awarded bid rank ≠ allocation rank, reason required |
| BR-10 | Cancel allowed from DRAFT or LIVE | Not from COMPLETED/AWARDED/CANCELLED |
| BR-11 | Suspension warning on all pages | `status === 'SUSPENDED'` → banner |
| BR-12 | RFI email resend cooldown: 3 seconds | `setTimeout` resets `resent` flag |
| BR-13 | RFQ response CSV format enforced | lane, vehicleType, price per row |
| BR-14 | Lane avg computed per lane+vehicleType combo | All vendor submissions grouped |
| BR-15 | Timer extension: bid within trigger window | Extends by extensionDurationMinutes |
| BR-16 | Max extensions capped | `extensionCount < maxExtensions` |
| BR-17 | File upload max: 5MB | `FILE_UPLOAD_MAX_SIZE = 5 * 1024 * 1024` |
| BR-18 | Accepted file types | `.png, .jpg, .jpeg, .webp, .pdf` |
| BR-19 | Excel import: row index 1 (skip header) | ExcelJS row start at index 1 |
| BR-20 | Vehicle capacity auto-fill | Type change → `capacityMt` auto-set |
| BR-21 | Region filters available lanes | North/South/West → subset of lanes |
| BR-22 | RFI deadline default: +7 days | `new Date() + 7 days` |
| BR-23 | 401 → logout + redirect /login | API response interceptor |
| BR-24 | Auction polling: 3s (LIVE auctions) | `POLLING_INTERVALS.AUCTION_LIVE` |
| BR-25 | `rateSyncedToTms` field on contract | Flag for TMS integration — not yet wired |

---

## 15. Dependency Matrix

| Feature | Component | Store/Hook | API Service | Upstream | Downstream |
|---|---|---|---|---|---|
| Dashboard KPIs | DashboardPage | app.store | DashboardService | auctions, contracts | — |
| Auction list | AuctionsPage | app.store | AuctionsService | — | Detail page |
| Create auction | AuctionCreatePage | app.store | AuctionsService, VendorSearch | Bookings (SPOT), Vendor master | Contract |
| Launch/Complete/Cancel | AuctionDetailPage | app.store | AuctionsService | Auction status | Award flow |
| Award decision | AuctionDetailPage | app.store | AuctionsService | Auction bids, vendor ranking | Contract creation |
| Contract generation | (auto on award) | app.store | ContractsService | Auction award | TMS rate sync |
| Contract termination | ContractsPage | app.store | ContractsService | Active contracts | — |
| RFI creation | RfiCreatePage | app.store | SourcingService | Vendor emails | Vendor tracking |
| RFQ creation | RfqCreatePage | app.store | SourcingService | Vendor emails | Response collection |
| RFQ response upload | RfqResponsesPage | app.store | RfqResponsesService | RFQ list | Lane avg price |
| Vendor search | AuctionCreatePage | app.store | AuctionsService `/vendors` | Vendor master | Invited list |
| Booking linkage | AuctionCreatePage | app.store | AuctionsService `/bookings` | TMS bookings | Spot auction |
| Cross-module bridge | (localStorage) | auction-store key | — | vendor-web bids | Vendor portal |

---

## 16. Edge Cases

| Scenario | Handling |
|---|---|
| Auction has no bids | "No Bids" button shown; triggers `rejectAuction()` with reason |
| Override award (L2/L3) | Reason input required; validation blocks without it |
| All lanes rejected | Auction status can still be COMPLETED with all lanes rejected |
| SPOT with no booking | `bookingId` is optional for SPOT |
| Excel import invalid format | Error thrown; lanes not updated |
| CSV row with non-numeric price | `parseRows()` throws; upload blocked |
| RFQ uploaded to wrong RFQ ID | No cross-check — linked by `selectedRfqId` |
| Vendor suspended | Warning banner shown; no feature lockout |
| 401 API response | Auth store logout + redirect to `/login` |
| Contract already TERMINATED | "Terminate" button hidden |
| RFI already PUBLISHED | "Publish" button hidden |
| Resend email clicked | Disabled for 3s (no actual email sending found) |
| Region selected (LOT) with no matching lanes | Empty lane dropdown |
| Lane timer expired | `SLACountdown` shows "EXPIRED" in red |
| Lane timer < 30 min | `SLACountdown` shows MM:SS in red (urgent) |
| No vendor IDs selected | `invitedVendorIds = []` — auction created but no vendors invited |
| `auctionUser` null | Auth hook returns null; suspension check skipped |

---

## 17. Hidden Features & Technical Debt

### Disabled / Stub Features

| Feature | Location | Status |
|---|---|---|
| RBAC enforcement | `rbac.ts`, `permission-context.tsx` | **All return `true`** — no real gating |
| Suspension functional lockout | `AuctionRouteWrapper` | Banner shown but no page blocking |
| Rate sync to TMS | `rateSyncedToTms` on Contract | **Field only** — no sync logic wired |
| Debit note on placement failure | `PlacementFailure.debitNoteTriggered` | **Field only** — no UI or workflow |
| RFI/RFQ email resend | `handleResend()` | **3s cooldown only** — no actual email call |
| Global search | `SearchService` defined | No search UI found in routes |
| Notifications | `POLLING_INTERVALS.NOTIFICATIONS` defined | No notifications page in route manifest |
| `rateDeviationOpen` on Contract | Contract model | **Field only** — no UI |
| `l1OverrideReason` on Contract | Contract model | **Field only** — no separate UI |

### Technical Debt

| Item | Severity | Detail |
|---|---|---|
| **RBAC returns `true` for all** | High | No real permission enforcement |
| **Suspension is banner-only** | High | SUSPENDED users can still use all features |
| **`rateSyncedToTms` not wired** | High | Contract rates not pushed to TMS |
| **Debit note not implemented** | Medium | `debitNoteTriggered` flag with no workflow |
| **RFI resend no real API call** | Medium | `handleResend` only sets timer — no HTTP |
| **Search service unused** | Medium | `SearchService` defined but no UI entry point |
| **ROUTES constant outdated** | Low | `src/lib/constants.ts` has legacy routes (trips, expenses, fleet) not in manifest |
| **Hardcoded lane options** | Low | 7 lanes hardcoded in AuctionCreatePage |
| **Hardcoded commodity list** | Low | 8 commodities hardcoded |
| **No pagination persistence** | Low | `page` state resets on tab change |
| **Placement failure UI absent** | Low | Model exists; no PlacementFailures list in Contract detail |

---

## 18. Missing Features Report

| # | Feature | Priority | Detail |
|---|---|---|---|
| MF-01 | Real RBAC enforcement | Critical | All permissions return `true` |
| MF-02 | Rate sync to TMS on award | High | `rateSyncedToTms` flag exists; no sync logic |
| MF-03 | Debit note workflow | High | `debitNoteTriggered` flag; no generation flow |
| MF-04 | Global search UI | High | `SearchService` wired; no search bar in layout |
| MF-05 | Notifications system | High | Polling constant defined; no notifications page |
| MF-06 | Placement failure list in contract | Medium | Model exists; not rendered in Contract detail |
| MF-07 | Suspension functional lockout | Medium | Banner only — SUSPENDED users not blocked |
| MF-08 | RFI email resend (real HTTP) | Medium | UI cooldown only; no API call |
| MF-09 | RFQ evaluation workflow | Medium | EVALUATING status defined; no screen |
| MF-10 | RFQ awarded status UI | Medium | AWARDED status defined; no award screen for RFQ |
| MF-11 | Export (auctions/contracts/responses) | Medium | No CSV/PDF export anywhere |
| MF-12 | Auction analytics / reporting | Medium | No analytics screen |
| MF-13 | Dynamic lane master | Low | Lanes hardcoded in create form |
| MF-14 | Dynamic commodity master | Low | Commodities hardcoded |
| MF-15 | Bid history per vendor | Low | Only L1/L2/L3 ranking shown; no full bid history |
| MF-16 | Contract renewal workflow | Low | `renewalTerms` not in Contract model |
| MF-17 | Multi-tenant auction isolation | Low | `tenantId` field exists; no tenant scoping UI |
| MF-18 | RFI/RFQ template download | Low | `templateFileName` stored; no download button |
| MF-19 | SLA dashboard | Low | `awardDeadline` on Auction; no SLA monitoring view |
| MF-20 | Vendor performance scoring | Low | VendorOption has `score` field; not displayed |

---

## 19. Complete Type & Enum Reference

### Auction Enums

| Enum | Values |
|---|---|
| `AuctionType` | SPOT, BULK, LOT |
| `AuctionStatus` | DRAFT, LIVE, COMPLETED, AWARDED, NO_BIDS, CANCELLED |
| `AuctionEventType` | CREATED, LAUNCHED, EXTENDED, COMPLETED, AWARDED, CANCELLED, PLACEMENT_FAILURE, OVERRIDE, CONTRACT_CREATED |
| `AllocationMode` | SINGLE, SPLIT |
| `RateUnit` | PER_TRIP, PER_MT, PER_KM |
| `AllocationRank` | L1, L2, L3 |
| `BasePriceSource` | MANUAL |

### Contract Enums

| Enum | Values |
|---|---|
| `ContractStatus` | ACTIVE, EXPIRING_SOON, EXPIRED, TERMINATED |
| `ContractType` | BULK, LOT |

### Sourcing Enums

| Enum | Values |
|---|---|
| `RfiStatus` | DRAFT, PUBLISHED, CLOSED |
| `RfqStatus` | DRAFT, PUBLISHED, EVALUATING, AWARDED, CANCELLED |
| `VendorResponseStatus` | PENDING, RESPONDED, DECLINED |

### User Enums

| Enum | Values |
|---|---|
| `InternalRole` | ADMIN, OPS, PROCUREMENT, FINANCE, EXECUTIVE |
| `UserStatus` | ACTIVE, SUSPENDED |

### Booking Enums

| Enum | Values |
|---|---|
| `BookingReferenceStatus` | PENDING_AUCTION, READY_FOR_DISPATCH |

### StatusBadge Color Map

| Status | Color |
|---|---|
| ACTIVE, AWARDED | success (green) |
| LIVE | info (blue) + pulsing dot |
| COMPLETED | info — label: "Pending Award" |
| NO_BIDS, EXPIRING_SOON | warning (amber) |
| DRAFT | muted (gray) |
| CANCELLED, TERMINATED, EXPIRED | destructive (red) |

### Polling Intervals
| Key | ms |
|---|---|
| `DASHBOARD` | 30,000 |
| `NOTIFICATIONS` | 15,000 |
| `AUCTION_LIVE` | 3,000 |
| `SLA_SYNC` | 60,000 |

### SLA Countdown Thresholds
- Urgent: < 30 minutes remaining → RED
- Normal: ≥ 30 minutes → ORANGE
- Expired: past deadline → RED "EXPIRED"

### Currency Display
- Format: `₹X,XX,XXX` (en-IN, INR, no decimals by default)
- Compact: `₹X.XCr` (≥10M), `₹X.XL` (≥100K), `₹X.XK` (≥1K)

### File Upload Config
```typescript
FILE_UPLOAD_MAX_SIZE = 5 * 1024 * 1024  // 5MB
ACCEPTED_FILE_TYPES = '.png, .jpg, .jpeg, .webp, .pdf'
```

### Vehicle Types (Hardcoded)
`20 MT Open Body` | `32 FT Closed Body` | `32 FT Open Body` | `20 FT Container` | `LCV`

### Commodities (Hardcoded)
`FMCG` | `Electronics` | `Automotive` | `Textiles` | `Chemicals` | `Industrial` | `Pharma` | `Agriculture`

### Lane Options (Hardcoded — 7)
`Mumbai → Delhi` | `Mumbai → Bangalore` | `Bangalore → Chennai` | `Chennai → Mumbai` | `Delhi → Lucknow` | `Pune → Jaipur` | `Ahmedabad → Surat`

### Regions (Hardcoded)
`North India` | `South India` | `West India` | `East India` | `Central India`

---

*End of Auction-Web Module Deep Code Review — Reverse-engineered from full source scan of `/modules/auction-web/`*
