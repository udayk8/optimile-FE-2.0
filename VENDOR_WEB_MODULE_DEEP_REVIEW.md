# Vendor-Web Module — Complete Deep Code Review
**Module:** `/modules/vendor-web/`
**Scan Date:** 2026-06-03
**Package:** `@optimile/vendor-portal-web`
**Stack:** React 19 + TypeScript + Vite | Zustand 5 + React Query 5 + React Hook Form 7 + Axios
**Port:** 3001
**Purpose:** Vendor/carrier self-service portal — indent acceptance, fleet management, trip execution, invoicing, ledger, dispute management, NBFC discounting, exceptions, and auction participation

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Route Hierarchy](#2-route-hierarchy)
3. [Navigation & Sidebar Structure](#3-navigation--sidebar-structure)
4. [Screen Inventory](#4-screen-inventory)
5. [Feature Inventory](#5-feature-inventory)
6. [Indent & Trip Lifecycle](#6-indent--trip-lifecycle)
7. [Invoice Lifecycle](#7-invoice-lifecycle)
8. [Dispute Workflow](#8-dispute-workflow)
9. [NBFC Discounting Workflow](#9-nbfc-discounting-workflow)
10. [Exception Management Workflow](#10-exception-management-workflow)
11. [Auction / Sourcing Workflow](#11-auction--sourcing-workflow)
12. [Compliance Tracking Logic](#12-compliance-tracking-logic)
13. [Form Analysis](#13-form-analysis)
14. [API Catalog](#14-api-catalog)
15. [State Management](#15-state-management)
16. [Integration Bridges (Embedded Mode)](#16-integration-bridges-embedded-mode)
17. [RBAC & Authentication](#17-rbac--authentication)
18. [Business Rules Catalog](#18-business-rules-catalog)
19. [Dependency Matrix](#19-dependency-matrix)
20. [Edge Cases](#20-edge-cases)
21. [Hidden Features & Technical Debt](#21-hidden-features--technical-debt)
22. [Missing Features Report](#22-missing-features-report)
23. [Complete Type & Enum Reference](#23-complete-type--enum-reference)

---

## 1. Architecture Overview

### Problem Domain
A vendor/carrier-facing portal for logistics operations. Enables transport vendors to respond to booking indents, manage fleet (vehicles + drivers + compliance), track active trips, submit expenses, generate and manage invoices, participate in freight auctions, view the financial ledger, record payments, manage disputes, apply for NBFC invoice discounting, and report/track operational exceptions.

### Dual-Mode Operation

| Mode | Mount Path | Data Source |
|---|---|---|
| **Standalone** | `/vendor` | Zustand app.store (mock data) |
| **Embedded** | `/tenant/:id/vendor-portal` | TenantDataBridge (shared tenant data) |

### Technology Stack
- **State:** Zustand 5 (app + ui + auth stores, with localStorage persistence)
- **Server State:** TanStack React Query 5
- **Forms:** React Hook Form 7
- **HTTP:** Axios 1.7 (two clients: vendor + auction)
- **UI:** Radix UI primitives + Tailwind CSS
- **Icons:** Lucide React
- **Maps:** None (no map integration)

### Key Architectural Patterns
1. **Cross-Module Bridges** — `TenantDataBridge`, `SourcingBridge` for embedded mode
2. **Route Manifest** — Declarative routes + sidebar config from single manifest file
3. **Status-Driven UI** — Invoice/Trip/Exception status determines available actions
4. **Dual Ledger** — Customer (receivables) + NBFC ledger for multi-party accounting
5. **Demo Mode Vendor Scoping** — Blank vendors get empty datasets, others get full mock data

### Path Aliases
```
@vendor       → ./src
@shared-auth  → ../../packages/shared-auth/src
@shared-ui    → ../../packages/shared-ui/src
@shared-utils → ../../packages/shared-utils/src
@/vendor-onboarding → ../../packages/shared-admin-core/src/vendor-onboarding
@/shared      → ../../packages/shared-admin-core/src/shared
```

### API Base URLs (from env)
```
vendorClient:  VITE_VENDOR_API_URL || VITE_API_BASE_URL || 'http://localhost:8083/api/v1'
auctionClient: VITE_AUCTION_API_URL || 'http://localhost:8082/api/v1'
```

---

## 2. Route Hierarchy

```
/vendor (base)
│
├── /               → DashboardPage (index)
├── /onboarding     → OnboardingPage
│
├── SOURCING
├── /sourcing                    → SourcingPage
├── /sourcing/auctions/:id       → AuctionDetailPage
│
├── CONTRACTS
├── /contracts                   → ContractsPage
├── /contracts/:id               → ContractsPage
│
├── TRIPS / BOOKINGS (aliased)
├── /trips                       → TripsPage
├── /trips/new/:id               → TripDetailPage
├── /trips/accepted/:id          → TripDetailPage
├── /trips/indents/:id           → TripDetailPage
├── /trips/active/:id            → TripDetailPage
├── /trips/assignment/:id        → TripDetailPage
├── /trips/in-transit/:id        → TripDetailPage
├── /trips/pending-pod/:id       → TripDetailPage
├── /trips/completed/:id         → TripDetailPage
├── /trips/cancelled/:id         → TripDetailPage
├── /trips/rejected/:id          → TripDetailPage
├── /trips/exception/:id         → TripDetailPage
├── /bookings/*                  → Aliases for all /trips/* routes
│
├── FLEET
├── /fleet                       → FleetPage
├── /fleet/vehicles              → FleetPage (vehicles tab)
├── /fleet/vehicles/add          → FleetPage (add vehicle modal)
├── /fleet/vehicles/:id          → FleetPage (vehicle detail)
├── /fleet/drivers               → FleetPage (drivers tab)
├── /fleet/drivers/add           → FleetPage (add driver modal)
├── /fleet/drivers/:id           → FleetPage (driver detail)
├── /fleet/capacity              → FleetPage (capacity tab)
│
├── FINANCE
├── /invoices                    → InvoicesPage
├── /invoices/new                → CreateInvoicePage
├── /invoices/create             → CreateInvoicePage
├── /invoices/list               → InvoicesPage
├── /invoices/:id                → InvoiceDetailPage
├── /record-payments             → PaymentsPage
├── /ledger                      → LedgerPage
│
├── SUPPORT / EXCEPTIONS
├── /exceptions                  → SupportHubPage
├── /exceptions/:exceptionId     → ExceptionTimelinePage
├── /report-exception            → ReportExceptionPage
├── /support                     → SupportHubPage
├── /support/report              → ReportExceptionPage
├── /support/exception/:id       → ExceptionTimelinePage
├── /support/dispute/:id         → DisputeThreadPage
├── /disputes/:id                → DisputeThreadPage
│
├── PROFILE
├── /profile                     → ProfilePage
├── /profile/company             → ProfilePage (company tab)
├── /profile/bank                → ProfilePage (bank tab)
│
├── OTHER
├── /notifications               → NotificationsPage
│
└── REDIRECTS
    ├── /home                    → /vendor
    ├── /ledger/payments         → /vendor/record-payments
    ├── /payments                → /vendor/record-payments
    ├── /profile/verification    → /vendor/profile/company
    ├── /profile/notifications   → /vendor/profile
    └── *                        → /vendor
```

---

## 3. Navigation & Sidebar Structure

```
SIDEBAR NAVIGATION (from manifest.tsx):

Home            → /vendor
Sourcing        → /vendor/sourcing
Contracts       → /vendor/contracts
Bookings        → /vendor/bookings
Fleet           → /vendor/fleet
Invoices        → /vendor/invoices
Record Payments → /vendor/record-payments
Ledger          → /vendor/ledger
Exceptions      → /vendor/exceptions
Profile         → /vendor/profile
```

### UI Store Controls
```typescript
sidebarCollapsed: boolean  // toggleSidebar(), setSidebarCollapsed()
mobileNavOpen: boolean     // setMobileNavOpen()
```

### Breakpoints (useBreakpoint)
| Breakpoint | Width |
|---|---|
| mobile | < 768px |
| tablet | 768–1023px |
| desktop | ≥ 1024px |

---

## 4. Screen Inventory

### Screen 1: DashboardPage — `/vendor`

**Purpose:** Operational command center — pending actions, live alerts, fleet health.

#### KPI Cards (6)

| Card | Data | Navigation |
|---|---|---|
| Pending Indents | Count + top 2 items | → /vendor/bookings?tab=indents |
| Live Auctions | Count + top 2 | → /vendor/sourcing?tab=live |
| Upcoming Auctions | Count + top 2 | → /vendor/sourcing?tab=upcoming |
| Bookings to Invoice | Count + total billable amount | → /vendor/invoices/create |
| Active Bookings | Count + top 2 | → /vendor/bookings?tab=active |
| Compliance Alerts | Count (non-compliant vehicles + drivers) | — |

#### Data Sources
- `useVendorBookings()` — indents (PENDING), trips (active)
- `useAppStore()` — auctions (LIVE/UPCOMING), vehicles/drivers (compliance), completed uninvoiced trips

---

### Screen 2: SourcingPage — `/vendor/sourcing`

**Purpose:** Freight auction participation — bid on lanes.

#### Tabs
`ALL` | `UPCOMING` | `LIVE` | `ENDED` | `CANCELLED`

#### Auction Table Columns
Auction ID (mono) | Customer + Vehicle Type | Route | State Badge | Timing | Action (View Details)

#### Auction State Labels
| State | Label |
|---|---|
| UPCOMING | Scheduled |
| LIVE | In Progress |
| PENDING_AWARD | Pending Award |
| AWARDED | Awarded |
| NOT_AWARDED | Not Awarded |
| NOT_PARTICIPATED | Not Participated |
| CANCELLED | Cancelled |

#### Pagination
5 per page

#### Data Source
- `useSourcingBridge()` if embedded (shared auction store), else `app.store.auctions`

---

### Screen 3: AuctionDetailPage — `/vendor/sourcing/auctions/:id`

**Purpose:** View auction lanes and submit/revise bids.

#### Bid Submission
- Per-lane bid amount input
- Submit Bid → `submitBid(auctionId, laneId, amount)`
- Previous bids shown (ACTIVE | REVISED | SUPERSEDED)
- Revised bid supersedes previous → old marked SUPERSEDED
- `currentBestBid` updated on each bid

#### Polling
- LIVE auctions: `POLLING_INTERVALS.AUCTION_LIVE = 3000ms` (3s)

---

### Screen 4: ContractsPage — `/vendor/contracts`

**Purpose:** View active and historical contracts with lane/rate details.

#### Contract Fields
Customer Name | Customer GSTIN | Lane | Rate Card | Volume Allocation | Payment Terms | SLA Clauses | Penalty Clauses | Validity (From → To) | Renewal Terms | Status | Amendments

#### Contract Status
`DRAFT` | `ACTIVE` | `EXPIRED` | `TERMINATED`

---

### Screen 5: TripsPage — `/vendor/trips`

**Purpose:** Full booking/trip lifecycle management.

#### Tabs (8)
| Tab | Included Statuses |
|---|---|
| pending-allocation | PENDING indents |
| assignment | ACCEPTED, ASSIGNED, OUT_FOR_PICKUP, PICKUP_REACHED, LOADING_STARTED, LOADING_COMPLETED (no exceptions) |
| in-transit | IN_TRANSIT, DESTINATION_REACHED (no exceptions) |
| pending-pod | POD_PENDING |
| completed | COMPLETED |
| exception | trips with `exceptionFlag = true` |
| cancelled | CANCELLED |
| rejected | DECLINED indents |

#### Modals Accessible
- `AssignVehicleModal` — for ACCEPTED trips
- `ChangeAssignmentModal` — for trips with disruptions
- `ConfirmDialog` — decline/cancel operations

---

### Screen 6: TripDetailPage — `/vendor/trips/:status/:id`

**Purpose:** Full trip detail — freight, documents, expenses, actions.

#### Mode Detection
From URL segment: `new | accepted | active | pending-pod | completed | cancelled | rejected | exception`

#### Header Actions (context-specific)
| Mode | Available Actions |
|---|---|
| new / accepted (indent) | Accept, Decline |
| accepted (trip) | Assign Vehicle & Driver |
| in-transit | (view only) |
| completed | Add Expense |
| exception | View Exception Timeline |

#### Tabs (3)
| Tab | Content |
|---|---|
| freight | Lane, load details, vehicle type, reporting datetime, SLA deadline, assigned vehicle/driver |
| documents | Tabbed by type: LR_COPY, EWAY_BILL, INVOICE_COPY, POD_COPY, etc. |
| expenses | Only visible in COMPLETED mode — expense summary + add expense |

#### Embedded Mode Extras
`getBookingDetail()` provides:
- Consignor: name, address, contact, phone
- Consignee: name, address, contact, phone
- LR numbers
- Freight amount

---

### Screen 7: FleetPage — `/vendor/fleet`

**Purpose:** Vehicle, driver, and capacity management.

#### Tabs
`vehicles` | `drivers` | (capacity)

#### Vehicles Tab
| Column | Detail |
|---|---|
| Registration # | Monospace text |
| Type | Vehicle type label |
| Status | Toggle: ACTIVE ↔ INACTIVE |
| Compliance | Icon + status badge |
| Base Location | Text |
| Actions | Edit button |

#### Drivers Tab
| Column | Detail |
|---|---|
| Name | Full name |
| Mobile | Phone number |
| License # | DL number |
| Expiry | DL valid till |
| License Class | Badge list |
| Status | ACTIVE / INACTIVE / BLOCKED |
| Compliance | Icon + status badge |
| Base Location | Text |
| Actions | Edit button |

#### Data Source
`useFleetData()` — bridges to TenantDataBridge (embedded) or app.store (standalone)

---

### Screen 8: InvoicesPage — `/vendor/invoices`

**Purpose:** Invoice lifecycle management — view, dispute, resubmit.

#### Tabs
`all` | `pending` | `approved` | `disputed` | `resubmission` | `closed`

#### Summary Cards (3)
- Approved Invoices (count)
- Total Invoice Approved (sum grandTotal)
- Total GST Approved (sum gstAmount)

#### Filters
- Date range (fromDate / toDate)
- Status dropdown

#### Invoice List Columns
Invoice # | Date | Customer | Status Badge | Amount | Actions

#### Per-Status Actions
| Status | Actions |
|---|---|
| PENDING | View, Download PDF, Dispute |
| APPROVED | View, Download PDF |
| DISPUTED | View, Download PDF, View Dispute Thread |
| RESUBMISSION_REQUIRED | View, Download PDF, Edit & Resubmit |
| CLOSED | View, Download PDF + Close Reason badge |

#### Pagination
5 per page

---

### Screen 9: CreateInvoicePage — `/vendor/invoices/create`

**Purpose:** Generate invoice from completed uninvoiced trips.

#### Invoice Generation
```typescript
generateInvoice({
  tripIds: string[],
  invoiceDate?: string,
  dueDate?: string,
  gstRate?: number,
  invoiceNumber?: string
})
```
- Creates new PENDING invoice
- Marks trips as `isInvoiced = true`

---

### Screen 10: InvoiceDetailPage — `/vendor/invoices/:id`

**Purpose:** Full invoice detail with line items, dispute thread link, NBFC discounting.

#### Invoice Fields
Invoice Number | Invoice Date | Vendor GSTIN | Customer GSTIN | Billing Period | Payment Due Date | Line Items | Subtotal | GST Amount | Grand Total | Status | NBFC Discounting Status

#### Invoice Line Items
| Field | Detail |
|---|---|
| `tripId` | Reference trip |
| `tripReference` | Human-readable ref |
| `freightCharge` | Base freight |
| `expenses[]` | Additional expense items |
| `lineTotal` | Sum of freight + expenses |

---

### Screen 11: PaymentsPage — `/vendor/record-payments`

**Purpose:** Record incoming payments against approved invoices.

#### Record Payment Modal Fields
| Field | Type | Required | Validation |
|---|---|---|---|
| Invoice | Dropdown | Yes | Approved invoices only |
| Entry Type | Dropdown | Yes | CUSTOMER_PAYMENT, TDS_DEDUCTION |
| Amount | Number | Yes | > 0, ≤ pending balance |
| Payment Date | Date | Yes | Default: today |
| Description | Textarea | Yes | — |

#### Payment History Table (8 per page)
Payment ID | Invoice | Party | Date | Transaction Type | Amount

#### KIND_LABEL Mapping
`CUSTOMER_PAYMENT` → Customer Payment | `TDS_DEDUCTION` → TDS Deduction | `NBFC_DISBURSEMENT` → NBFC Disbursement | `NBFC_REPAYMENT` → NBFC Repayment | `NBFC_CHARGE` → NBFC Charge

---

### Screen 12: LedgerPage — `/vendor/ledger`

**Purpose:** Double-entry financial ledger — customer receivables.

#### Active Tab
Customer ledger (NBFC tab defined but hardcoded to Customer)

#### Filters
- Date range (default: Apr 1 – May 31, 2026)
- Invoice dropdown (filtered to date range)
- Search (invoiceId, referenceNumber, description, entryType label)

#### Summary Cards (4)
| Card | Calculation |
|---|---|
| Customer Pending | Sum of latest runningBalance per invoice where balance > 0 |
| Customer Settled Invoices | Count where runningBalance = 0 |
| Customer Collected | Sum of CUSTOMER_PAYMENT credits in date range |
| TDS Deducted | Sum of TDS_DEDUCTION credits in date range |

#### Ledger Table (10 per page)
Date | Invoice ID | Reference | Entry Type | Description | Debit | Credit | Balance

#### Balance Format
`"₹X Dr"` for customer (debit-side outstanding)

#### Export
CSV download with same columns

#### Sorting
By date ASC

---

### Screen 13: SupportHubPage — `/vendor/exceptions`

**Purpose:** Exception (support ticket) management hub.

#### Summary Cards (4)
| Card | Filter |
|---|---|
| Open | status = OPEN |
| Active | status = ACKNOWLEDGED \| IN_PROGRESS |
| Resolved | status = RESOLVED \| CLOSED |
| Critical | severity = CRITICAL AND status ≠ CLOSED |

#### Filters
- Search: id, bookingId, route, issueType, vehicle, driver
- Status: ALL | OPEN | ACKNOWLEDGED | IN_PROGRESS | RESOLVED | CLOSED

#### Exception Table (6 per page)
Exception ID | Booking ID | Route | Issue Type | Severity | Status | SLA Countdown | Created | Actions (View Timeline)

#### Sort Order
1. Severity ASC (CRITICAL first)
2. Status ASC (OPEN first)
3. CreatedAt DESC

#### Actions
- "Report Exception" → `/vendor/report-exception`
- Row click → `/vendor/exceptions/:id`

---

### Screen 14: ExceptionTimelinePage — `/vendor/exceptions/:id`

**Purpose:** Full exception detail with action timeline.

---

### Screen 15: DisputeThreadPage — `/vendor/disputes/:id`

**Purpose:** Dispute thread between vendor and finance team.

#### Header
Dispute ID | Invoice # | Raised date | Status badges (dispute + invoice)

#### Layout
2-column: Left (messages thread) | Right (details)

#### Message Thread
- Ordered chronologically
- Sender: VENDOR | FINANCE
- Vendor messages highlighted with `primary/5` bg
- Attachments shown with download links

#### Vendor Reply (if `canRespond = dispute.status === 'OPEN' && invoice.status === 'DISPUTED'`)
- Textarea for reply
- File upload (multiple)
- Attachment list with X to remove
- Send button

---

### Screen 16: ProfilePage — `/vendor/profile`

**Purpose:** Vendor company profile and bank details management.

#### Tabs
`company` | `bank`

#### Company Tab Fields
Trading Name | Legal Name | GSTIN (uppercase, mono) | PAN (uppercase, mono) | Registered Address (Street, City, State, Pincode) | Primary Contact (Name, Phone, Email) | Service Regions | Supported Vehicle Types

#### On Save
- `updateVendorProfile()` applied
- `profileCompletion = max(current, 60%)`
- Status → ACTIVE (if already active) else ONBOARDING_INCOMPLETE

---

### Screen 17: NotificationsPage — `/vendor/notifications`

**Purpose:** Full notification list with mark-as-read.

#### Notification Categories
`ONBOARDING` | `SOURCING` | `CONTRACTS` | `TRIPS` | `EXPENSES` | `INVOICES`

---

### Screen 18: ReportExceptionPage — `/vendor/report-exception`

**Purpose:** Report a new operational exception for a booking.

#### Exception Create Fields
bookingId | route | vehicle | driver | issueType | severity | description | evidence[]

---

---

## 5. Feature Inventory

| # | Feature | Status | Screen |
|---|---|---|---|
| F-01 | Dashboard KPI cards (6) | Live (mock) | Dashboard |
| F-02 | Auction participation (bid/revise) | Live (mock + bridge) | SourcingPage |
| F-03 | Live auction polling (3s) | Live | AuctionDetailPage |
| F-04 | Contract viewing | Live (mock) | ContractsPage |
| F-05 | Trip/indent list with 8-tab grouping | Live (mock) | TripsPage |
| F-06 | Indent accept / decline | Live (mock) | TripDetailPage |
| F-07 | Vehicle & driver assignment | Live (mock) | TripDetailPage |
| F-08 | Trip assignment change (disruption) | Live (mock) | TripDetailPage |
| F-09 | Expense submission per trip | Live (mock) | TripDetailPage |
| F-10 | Document management per trip | Live (mock) | TripDetailPage |
| F-11 | Vehicle management (CRUD + compliance) | Live (mock) | FleetPage |
| F-12 | Driver management (CRUD + compliance) | Live (mock) | FleetPage |
| F-13 | Capacity declaration | Live (mock) | FleetPage |
| F-14 | Compliance doc upload (5 vehicle types, 2 driver types) | Live (mock) | FleetPage |
| F-15 | Compliance status calculation (4 states) | Live | FleetPage |
| F-16 | Invoice generation from trips | Live (mock) | CreateInvoicePage |
| F-17 | Invoice list with status tabs | Live (mock) | InvoicesPage |
| F-18 | Invoice dispute | Live (mock) | InvoicesPage |
| F-19 | Invoice resubmission | Live (mock) | InvoicesPage |
| F-20 | Dispute thread (view + respond) | Live (mock) | DisputeThreadPage |
| F-21 | NBFC invoice discounting application | Live (mock) | InvoiceDetailPage |
| F-22 | Record payments (CUSTOMER + TDS) | Live (mock) | PaymentsPage |
| F-23 | Customer ledger view + CSV export | Live (mock) | LedgerPage |
| F-24 | Exception reporting | Live (mock) | ReportExceptionPage |
| F-25 | Exception management (status updates) | Live (mock) | SupportHubPage |
| F-26 | Exception timeline | Live (mock) | ExceptionTimelinePage |
| F-27 | Vendor profile management | Live (mock) | ProfilePage |
| F-28 | Bank details management | Live (mock) | ProfilePage |
| F-29 | Notifications with mark-as-read | Live (mock) | NotificationsPage |
| F-30 | SLA countdown per trip | Live (mock) | TripDetailPage |
| F-31 | Demo mode vendor scoping | Live | app.store |
| F-32 | Embedded mode (TenantDataBridge) | Live | Integration layer |
| F-33 | Sourcing bridge (shared auction store) | Live | auctionBridge.ts |
| F-34 | Onboarding wizard | Live (mock) | OnboardingPage |
| F-35 | Finance approve/dispute/reject (demo) | Live (finance actions in store) | (Finance module calls) |
| F-36 | Real HTTP API (all services) | **WIRED** (behind feature flag) | Services |
| F-37 | NBFC ledger tab | **STUB** | LedgerPage (hardcoded to Customer) |
| F-38 | Capacity availability declarations | **Partial** | FleetPage (capacity tab) |
| F-39 | POD upload flow | **Partial** | TripDetailPage |
| F-40 | Report downloads | **MISSING** | Not found |

---

## 6. Indent & Trip Lifecycle

### Indent Status Flow
```
PENDING → ACCEPTED → [creates Trip in ACCEPTED state]
        → DECLINED
        → EXPIRED (no action taken in time)
```

### Trip / Booking State Flow
```
ACCEPTED
  └──► [Assign Vehicle + Driver] → ASSIGNED
                                        └──► OUT_FOR_PICKUP
                                                └──► PICKUP_REACHED
                                                        └──► LOADING_STARTED
                                                                └──► LOADING_COMPLETED
                                                                        └──► IN_TRANSIT
                                                                                └──► DESTINATION_REACHED
                                                                                        └──► POD_PENDING
                                                                                                └──► COMPLETED

Exception paths (at any active stage):
  └──► exceptionFlag = true (exception raised)

Disruption paths:
  - VEHICLE_BREAKDOWN → changeTripAssignment()
  - DRIVER_BREAKDOWN  → changeTripAssignment()
  - VEHICLE_OR_DRIVER_BREAKDOWN → changeTripAssignment()

Cancellation:
  └──► CANCELLED (at any active stage)
```

### Tab Bucketing Logic

| Tab | Statuses | Exception Condition |
|---|---|---|
| pending-allocation | PENDING indents | — |
| assignment | ACCEPTED, ASSIGNED, OUT_FOR_PICKUP, PICKUP_REACHED, LOADING_STARTED, LOADING_COMPLETED | exceptionFlag = false |
| in-transit | IN_TRANSIT, DESTINATION_REACHED | exceptionFlag = false |
| pending-pod | POD_PENDING | — |
| completed | COMPLETED | — |
| exception | Any status | exceptionFlag = true |
| cancelled | CANCELLED | — |
| rejected | DECLINED indents | — |

### SLA Flag
`ON_TIME` | `DELAYED` — computed from `slaDeadline` vs current time

---

## 7. Invoice Lifecycle

```
[Generate Invoice from COMPLETED uninvoiced trips]
  └──► PENDING
          ├──► [Finance approves] → APPROVED
          │                              └──► [Payment recorded] → ledger entry created
          ├──► [Finance disputes] → DISPUTED
          │                              ├──► [Finance requests resubmit] → RESUBMISSION_REQUIRED
          │                              │                                        └──► [Vendor resubmits] → NEW PENDING invoice (old → CLOSED: SUPERSEDED)
          │                              └──► [Finance rejects] → CLOSED (REJECTED)
          └──► [Finance rejects directly] → CLOSED (REJECTED)
```

### Invoice Fields
`invoiceNumber` | `invoiceDate` | `vendorGstin` | `customerGstin` | `billingPeriod` | `paymentDueDate` | `lineItems[]` | `subtotal` | `gstAmount` | `grandTotal` | `status` | `closeReason?` | `supersedesInvoiceId?` | `supersededByInvoiceId?` | `paymentDate?` | `pdfUrl` | `tripReferences?` | `nbfcDiscountingStatus?`

### Resubmission Flow
```typescript
createResubmissionInvoice(oldInvoiceId, lineItems[]):
  1. Create NEW PENDING invoice
  2. Close old invoice as SUPERSEDED
  3. Old: closeReason = 'SUPERSEDED', supersededByInvoiceId = new invoice ID
  4. New: supersedesInvoiceId = old invoice ID
```

---

## 8. Dispute Workflow

```
Invoice PENDING → [Finance disputes] → Invoice DISPUTED + Dispute OPEN
                                              │
                                              ├──► [Vendor responds] → Dispute message added (VENDOR sender)
                                              ├──► [Finance responds] → Dispute message added (FINANCE sender)
                                              │
                                              ├──► [Finance requests resubmission] → Dispute CLOSED + Invoice RESUBMISSION_REQUIRED
                                              └──► [Finance rejects] → Dispute CLOSED + Invoice CLOSED (REJECTED)

canRespond = dispute.status === 'OPEN' && invoice.status === 'DISPUTED'
```

### Dispute Fields
`id` | `invoiceId` | `invoiceNumber` | `invoiceAmount` | `reason` | `status` | `raisedAt` | `updatedAt` | `notes?` | `responseDueAt?` | `messages[]`

### DisputeMessage Fields
`id` | `sender: 'FINANCE' | 'VENDOR'` | `message` | `createdAt` | `attachments[]`

---

## 9. NBFC Discounting Workflow

```
Invoice APPROVED → [Vendor applies] → Application SUBMITTED
                                            ├──► [NBFC approves] → APPROVED
                                            │                           └──► [NBFC disburses] → DISBURSED
                                            │                                                         └──► NBFC ledger entries posted
                                            └──► [NBFC rejects] → REJECTED
```

### NBFC Application Fields
```typescript
{
  invoiceId, invoiceNumber, customerName,
  partnerId?, partnerName?,
  status: NBFCDiscountingStatus,
  requestedAmount, approvedAmount?,
  charges, approvedCharges?,
  netAmount,
  referenceNumber?, remarks?,
  emailTitle?, recipientEmail?, emailDescription?,
  invoiceFileName?,
  appliedAt?, approvedAt?
}
```

### NBFC Ledger Entry Types
`NBFC_FINANCING_APPROVED` | `NBFC_DISBURSEMENT` | `NBFC_CHARGE` | `NBFC_REPAYMENT` | `NBFC_ADJUSTMENT`

---

## 10. Exception Management Workflow

```
Report Exception → OPEN
  └──► ACKNOWLEDGED
            └──► IN_PROGRESS
                      ├──► RESOLVED
                      └──► CLOSED
```

### Exception Fields
`id` | `bookingId` | `route` | `vehicle` | `driver` | `issueType` | `severity` | `status` | `slaDueAt` | `createdAt` | `updatedAt` | `description` | `evidence[]` | `timeline[]`

### Exception Issue Types
`Breakdown` | `Delay` | `Accident` | `Route deviation` | `Cargo issue`

### Exception Severity
`CRITICAL` | `HIGH` | `MEDIUM` | `LOW`

### Timeline Entry
`id` | `action` | `notes` | `timestamp` | `by`

---

## 11. Auction / Sourcing Workflow

```
Auction UPCOMING → LIVE → [Vendor bids]
                                └──► Bid ACTIVE (previous bid → SUPERSEDED)
                                └──► currentBestBid updated
                    └──► PENDING_AWARD
                                └──► AWARDED (contract created)
                                └──► NOT_AWARDED
```

### Auction Types
`SPOT` | `LOT` | `BULK`

### Bid Fields
`id` | `laneId` | `amount` | `placedAt` | `status: ACTIVE | REVISED | SUPERSEDED`

### Polling
Live auctions: **3 seconds** (`POLLING_INTERVALS.AUCTION_LIVE = 3000`)

### Sourcing Bridge
- Reads/writes shared `localStorage["optimile.auction-store"]`
- Syncs bids between vendor-web and auction-web
- `useSourcingBridge()` — returns `{ auctions[], hasShared, placeBid }`
- `useAuctionContractsBridge()` — returns awarded contracts

---

## 12. Compliance Tracking Logic

### Status Calculation Logic

```typescript
computeComplianceStatus(documents): ComplianceStatus {
  if (anyDocMissing) return 'PENDING_DOCS'

  const statuses = docs.map(doc => {
    const daysLeft = daysBetween(today, doc.expiryDate)
    if (daysLeft < 0)  return 'EXPIRED'
    if (daysLeft <= 30) return 'EXPIRING_SOON'
    return 'VALID'
  })

  if (statuses.includes('EXPIRED'))      return 'EXPIRED'
  if (statuses.includes('EXPIRING_SOON')) return 'EXPIRING_SOON'
  return 'COMPLIANT'
}
```

### Vehicle Compliance Document Types (5)
`RC` (RC Number) | `Insurance` (Policy Number) | `PUC` (PUC Number) | `FC` (FC Number) | `NationalPermit` (Permit Number)

Each requires: `fileName` + `referenceNo` + `expiryDate`

### Driver Compliance Document Types (2)
`DL` (DL Number) | `MedicalCertificate` (Certificate Number)

Each requires: `fileName` + `referenceNo` + `expiryDate`

### Compliance Status Colors
| Status | Color |
|---|---|
| COMPLIANT | Green — "All Documents Uploaded" |
| EXPIRING_SOON | Amber — "Documents Expiring Soon" |
| EXPIRED | Red — "Documents Expired" |
| PENDING_DOCS | Gray — "Documents Pending" |

---

## 13. Form Analysis

### Form 1: Add / Edit Vehicle

| Field | Type | Required | Notes |
|---|---|---|---|
| `registrationNumber` | text | Yes | Unique |
| `vehicleType` | dropdown | Yes | Tenant options (embedded) or VEHICLE_TYPES constant |
| `manufacturer` | text | No | — |
| `model` | text | No | — |
| `year` | number | No | — |
| `fuelType` | dropdown | No | Diesel \| Petrol \| CNG \| EV |
| `engineNumber` | text | No | — |
| `chassisNumber` | text | No | — |
| `capacityKg` | number | No | — |
| `baseLocation` | text | Yes | — |
| `operationalStatus` | dropdown | Yes | ACTIVE \| UNDER_MAINTENANCE \| INACTIVE |
| Compliance docs (5 types) | file + ref + expiry | Conditional | Per doc type |

### Form 2: Add / Edit Driver

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | text | Yes | — |
| `dateOfBirth` | date | No | — |
| `mobile` | text | Yes | Phone number |
| `email` | email | No | — |
| `gender` | dropdown | No | Male \| Female \| Other |
| `baseLocation` | text | No | — |
| `aadhaarMasked` | text | No | Masked Aadhaar |
| `dlNumber` | text | Yes | Driving License # |
| `licenseClasses` | multi-select | Yes | HMV, HMV Hazmat, LMV Transport, LMV, HCV, LCV |
| `dlValidTillDate` | date | Yes | DL expiry |
| Compliance docs (2 types) | file + ref + expiry | Conditional | DL + Medical |

### Form 3: Record Payment

| Field | Type | Required | Validation |
|---|---|---|---|
| Invoice | dropdown | Yes | Approved invoices only |
| Entry Type | dropdown | Yes | CUSTOMER_PAYMENT \| TDS_DEDUCTION |
| Amount | number | Yes | > 0, ≤ pending balance |
| Payment Date | date | Yes | Default: today |
| Description | textarea | Yes | — |

### Form 4: Add Expense

| Field | Type | Required | Notes |
|---|---|---|---|
| `expenseType` | dropdown | Yes | EXPENSE \| DETENTION \| LOADING_UNLOADING \| WEIGHBRIDGE \| OTHER |
| `amount` | number | Yes | > 0 |
| `description` | text | No | — |
| `supportingDocumentUrl` | file | No | — |

### Form 5: Dispute Vendor Response

| Field | Type | Required | Notes |
|---|---|---|---|
| Reply message | textarea | Yes | — |
| Attachments | file[] | No | Multiple files |

### Form 6: Report Exception

| Field | Type | Required |
|---|---|---|
| `bookingId` | text | Yes |
| `route` | text | Yes |
| `vehicle` | text | Yes |
| `driver` | text | Yes |
| `issueType` | dropdown | Yes |
| `severity` | dropdown | Yes |
| `description` | text | Yes |
| `evidence[]` | file[] | No |

### Form 7: Generate Invoice

| Field | Type | Required |
|---|---|---|
| `tripIds[]` | multi-select | Yes |
| `invoiceDate` | date | No |
| `dueDate` | date | No |
| `gstRate` | number | No |
| `invoiceNumber` | text | No |

### Form 8: Vendor Profile (Company Tab)

| Field | Type | Required |
|---|---|---|
| `tradingName` | text | Yes |
| `legalName` | text | Yes |
| `gstin` | text | Yes | 15-char uppercase |
| `pan` | text | Yes | 10-char uppercase |
| Address (Street, City, State, Pincode) | text | No | Read-only |
| Contact (Name, Phone, Email) | text | Yes | — |
| `serviceRegions` | text | No | Comma-separated |
| `supportedVehicleTypes` | text | No | Comma-separated |

---

## 14. API Catalog

> **Note:** Real HTTP services are wired but the module defaults to Zustand mock store. Switch `VITE_VENDOR_API_URL` and `VITE_AUCTION_API_URL` env vars to enable real API.

### Fleet Service (`vendorClient`)

| Function | Method | Endpoint | Payload |
|---|---|---|---|
| `VehicleService.list(params?)` | GET | `/fleet/vehicles` | query params |
| `VehicleService.get(id)` | GET | `/fleet/vehicles/{id}` | — |
| `VehicleService.create(data)` | POST | `/fleet/vehicles` | Vehicle data |
| `VehicleService.update(id, data)` | PUT | `/fleet/vehicles/{id}` | Vehicle data |
| `VehicleService.remove(id)` | DELETE | `/fleet/vehicles/{id}` | — |
| `VehicleService.patchStatus(id, status)` | PATCH | `/fleet/vehicles/{id}/status` | `{ status }` |
| `VehicleService.uploadCompliance(id, data)` | POST | `/fleet/vehicles/{id}/compliance-documents` | Compliance doc |
| `VehicleService.addBlackout(id, from, to)` | POST | `/fleet/vehicles/{id}/blackout` | `{ fromDate, toDate }` |
| `DriverService.list(params?)` | GET | `/fleet/drivers` | query params |
| `DriverService.get(id)` | GET | `/fleet/drivers/{id}` | — |
| `DriverService.create(data)` | POST | `/fleet/drivers` | Driver data |
| `DriverService.update(id, data)` | PUT | `/fleet/drivers/{id}` | Driver data |
| `DriverService.remove(id)` | DELETE | `/fleet/drivers/{id}` | — |
| `DriverService.patchStatus(id, status)` | PATCH | `/fleet/drivers/{id}/status` | `{ status }` |
| `DriverService.uploadCompliance(id, data)` | POST | `/fleet/drivers/{id}/compliance-documents` | Compliance doc |
| `CapacityService.list()` | GET | `/fleet/capacity` | — |
| `CapacityService.create(data)` | POST | `/fleet/capacity` | Capacity declaration |

### Finance Service (`vendorClient`)

| Function | Method | Endpoint | Payload |
|---|---|---|---|
| `InvoiceService.list(status?)` | GET | `/invoices` | `{ status }` |
| `InvoiceService.get(id)` | GET | `/invoices/{id}` | — |
| `InvoiceService.create(data)` | POST | `/invoices` | Invoice data |
| `InvoiceService.submit(id)` | POST | `/invoices/{id}/submit` | — |
| `InvoiceService.cancel(id)` | POST | `/invoices/{id}/cancel` | — |
| `InvoiceService.dispute(id, reason)` | POST | `/invoices/{id}/dispute` | `{ reason }` |
| `ExpenseService.list(params?)` | GET | `/expenses` | query params |
| `ExpenseService.get(id)` | GET | `/expenses/{id}` | — |
| `ExpenseService.create(data)` | POST | `/expenses` | Expense data |
| `ExpenseService.submit(id)` | POST | `/expenses/{id}/submit` | — |
| `ExpenseService.remove(id)` | DELETE | `/expenses/{id}` | — |
| `LedgerService.list(params?)` | GET | `/ledger` | query params |
| `LedgerService.payments(status?)` | GET | `/payments` | `{ status }` |
| `DisputeService.list(status?)` | GET | `/disputes` | `{ status }` |
| `DisputeService.get(id)` | GET | `/disputes/{id}` | — |
| `DisputeService.comment(id, note)` | POST | `/disputes/{id}/comment` | `{ note }` |
| `DisputeService.close(id)` | POST | `/disputes/{id}/close` | — |

### Sourcing Service (`auctionClient`)

| Function | Method | Endpoint | Payload |
|---|---|---|---|
| `listAuctions(vendorId)` | GET | `/auctions` | `{ invitedVendorId }` |
| `getAuction(id)` | GET | `/auctions/{id}` | — |
| `getBids(auctionId, laneId)` | GET | `/auctions/{auctionId}/lanes/{laneId}/bids` | — |
| `placeBid(auctionId, laneId, data)` | POST | `/auctions/{auctionId}/lanes/{laneId}/bids` | `{ vendorId, vendorName, amount }` |
| `listContracts(vendorId)` | GET | `/contracts` | `{ vendorId }` |

### Bookings Service (`vendorClient`)

| Function | Method | Endpoint | Payload |
|---|---|---|---|
| `fetchBookings(status?)` | GET | `/bookings` | `{ status }` |
| `fetchBooking(id)` | GET | `/bookings/{id}` | — |
| `acceptBooking(id, vehicleId, driverId)` | POST | `/bookings/{id}/accept` | `{ vehicleId, driverId }` |
| `declineBooking(id, reason?)` | POST | `/bookings/{id}/decline` | `{ reason }` |
| `dispatchBooking(id)` | POST | `/bookings/{id}/dispatch` | — |
| `deliverBooking(id)` | POST | `/bookings/{id}/deliver` | — |
| `uploadPod(id, podReference, fileUrl?)` | POST | `/bookings/{id}/pod` | `{ podReference, fileUrl }` |
| `assignBooking(id, vehicleId, driverId)` | POST | `/bookings/{id}/assign` | `{ vehicleId, driverId }` |

### Notifications Service (`vendorClient`)

| Function | Method | Endpoint |
|---|---|---|
| `list(params?)` | GET | `/notifications` |
| `markRead(id)` | PATCH | `/notifications/{id}/read` |
| `markAllRead()` | PATCH | `/notifications/read-all` |

### Profile Service (`vendorClient`)

| Function | Method | Endpoint | Payload |
|---|---|---|---|
| `get()` | GET | `/profile` | — |
| `updateCompany(data)` | PUT | `/profile/company` | Company data |
| `updateContact(data)` | PUT | `/profile/contact` | Contact data |
| `getBank()` | GET | `/profile/bank` | — |
| `updateBank(data)` | PUT | `/profile/bank` | Bank data |
| `listDocuments()` | GET | `/profile/documents` | — |
| `uploadDocument(data)` | POST | `/profile/documents` | Document data |
| `dashboard()` | GET | `/dashboard` | — |

### Exceptions Service (`vendorClient`)

| Function | Method | Endpoint | Payload |
|---|---|---|---|
| `list(params?)` | GET | `/exceptions` | query params |
| `get(id)` | GET | `/exceptions/{id}` | — |
| `create(data)` | POST | `/exceptions` | Exception data |
| `patchStatus(id, status, notes?)` | PATCH | `/exceptions/{id}/status` | `{ status, notes }` |
| `comment(id, note)` | POST | `/exceptions/{id}/comment` | `{ note }` |

### API Client Headers
```
Authorization: Bearer {token}
X-Vendor-Id: {vendorId} (or DEV_VENDOR_ID: 'a1000000-0000-0000-0000-000000000001')
```

### 401 Handling
`logout()` → clear session → redirect to `/login`

---

## 15. State Management

### Zustand Stores (3)

#### App Store (`app.store.ts`)

**State Collections:**
```typescript
indents: Indent[]
trips: Trip[]
auctions: Auction[]
vehicles: Vehicle[]
drivers: Driver[]
expenses: Expense[]
contracts: Contract[]
invoices: Invoice[]
ledger: LedgerEntry[]
payments: PaymentRecord[]
nbfcApplications: NBFCApplication[]
exceptions: ExceptionRecord[]
capacity: CapacityDeclaration[]
notifications: Notification[]
disputes: Dispute[]
appliedVendorKey: string  // demo mode vendor switching
```

**All Store Actions:** See [Section 15 detailed actions above]

#### UI Store (`ui.store.ts`)
```typescript
sidebarCollapsed: boolean   // toggleSidebar(), setSidebarCollapsed()
mobileNavOpen: boolean      // setMobileNavOpen()
```

#### Auth Store (`auth.store.ts`) — with localStorage persistence
```typescript
vendor: Vendor | null
token: string | null
isAuthenticated: boolean
onboardingDraft: VendorSetupDraft | null
```

**Auth Actions:**
- `hydrateVendor(vendor)` — init if not set
- `setAuth(vendor, token)` — sets auth, resets app store
- `setOnboardingDraft(draft)` / `updateOnboardingDraft(partial)`
- `completeOnboarding()` — status=ACTIVE, profileCompletion=100%, kycStatus=APPROVED, bankStatus=VERIFIED
- `updateVendorProfile(patch)` — partial update
- `updateVendorStatus(status)`
- `logout()` — clears auth + resets app store

### React Query Config
```typescript
staleTime: 30_000      // 30 seconds
retry: 1
refetchOnWindowFocus: false
```

### Polling Intervals
| Interval | ms | Use |
|---|---|---|
| `DASHBOARD` | 30,000 | Dashboard refresh |
| `NOTIFICATIONS` | 15,000 | Notification refresh |
| `AUCTION_LIVE` | 3,000 | Live auction bid updates |
| `SLA_SYNC` | 60,000 | SLA recalculation |

---

## 16. Integration Bridges (Embedded Mode)

### TenantDataBridge (`integration/tenant-data-bridge.tsx`)
Context-based dependency injection for embedded mode.

**Provides:**
```typescript
// Fleet
vehicles: Vehicle[]      // Vendor-scoped from tenant master
drivers: Driver[]        // Vendor-scoped from tenant master
addVehicle(), updateVehicle()
addDriver(), updateDriver()
vehicleTypeOptions: string[]   // Tenant vehicle type labels

// Bookings
bookingIndents: Indent[]       // PENDING indents assigned to vendor
bookingTrips: Trip[]           // Accepted + assigned trips
acceptBooking(bookingId)
declineBooking(bookingId)
assignVehicle(bookingId, vehicleId, driverId)
getBookingDetail(bookingRef): VendorBookingDetail  // Rich detail with consignor/consignee/docs/LR
```

### SourcingBridge (`integration/auctionBridge.ts`)
Syncs with auction-web via `localStorage["optimile.auction-store"]`.

**Provides:**
```typescript
useSourcingBridge(): { auctions[], hasShared, placeBid }
useAuctionContractsBridge(): awarded contracts
```

### useFleetData Hook (`integration/useFleetData.ts`)
```typescript
// Returns:
{
  vehicles[], drivers[],
  addVehicle, updateVehicle,
  addDriver, updateDriver,
  vehicleTypeOptions  // tenant labels (embedded) or null (standalone)
}
// Source: TenantDataBridge (embedded) OR app.store (standalone)
```

### useVendorBookings Hook (`integration/useVendorBookings.ts`)
```typescript
// Returns:
{
  indents[], trips[],
  acceptIndent, declineIndent,
  assignVehicle,
  getBookingDetail
}
// Source: TenantDataBridge (embedded, vendor-scoped) OR app.store (standalone)
```

---

## 17. RBAC & Authentication

### Session Context
```typescript
localStorage['optimile.session.context'] = {
  loginType: 'VENDOR',
  vendorId: string,
  vendorName: string
}
```

### Vendor Identity Resolution (`useVendorAuth`)
```
1. Read portalIdentity from localStorage
2. Resolve vendor: portalIdentity > persisted vendor > shared auth user
3. Update persisted vendor if identity changes
```

### HTTP Auth
```
Request headers:
  Authorization: Bearer {token}
  X-Vendor-Id: {vendorId} || DEV_VENDOR_ID
```

### RBAC (Placeholder — All Return True)
```typescript
// rbac.ts — ready for backend integration:
canView(module): boolean     → always true
canCreate(module, feature?)  → always true
canEdit(module, feature?)    → always true
canDelete(module, feature?)  → always true
canApprove(module, feature?) → always true
```

### Finance Demo Actions (Store-Level)
Called by Finance module (not vendor portal) to simulate approvals:
- `financeApproveInvoice(invoiceId)`
- `financeRaiseDispute(invoiceId, reason)`
- `financeRequestResubmission(invoiceId, message?)`
- `financeRejectInvoice(invoiceId, reason?)`

---

## 18. Business Rules Catalog

| # | Rule | Implementation |
|---|---|---|
| BR-01 | Indent accept → creates Trip in ACCEPTED state | `acceptIndent()` in app.store |
| BR-02 | Vehicle assign requires vehicleId + driverId | `assignVehicleToTrip()` validation |
| BR-03 | Bid revision supersedes previous bid | `submitBid()` marks old bid SUPERSEDED |
| BR-04 | Only OPEN + DISPUTED invoice allows vendor response | `canRespond` gate in DisputeThreadPage |
| BR-05 | Invoice resubmission closes old as SUPERSEDED | `createResubmissionInvoice()` |
| BR-06 | Expenses only visible on COMPLETED trips | `mode === 'completed'` gate |
| BR-07 | Payment amount ≤ pending balance | Validation in Record Payment modal |
| BR-08 | Compliance: any doc missing → PENDING_DOCS | `computeComplianceStatus()` |
| BR-09 | Compliance: expiry < 0 days → EXPIRED | `computeComplianceStatus()` |
| BR-10 | Compliance: expiry ≤ 30 days → EXPIRING_SOON | `computeComplianceStatus()` |
| BR-11 | Compliance priority: PENDING_DOCS > EXPIRED > EXPIRING_SOON > COMPLIANT | `computeComplianceStatus()` |
| BR-12 | Profile completion = max(current, 60%) on save | `updateVendorProfile()` |
| BR-13 | GSTIN/PAN stored uppercase | `toUpperCase()` on input |
| BR-14 | File upload max: 5MB | `FILE_UPLOAD_MAX_SIZE = 5 * 1024 * 1024` |
| BR-15 | Accepted file types | `.png, .jpg, .jpeg, .webp, .pdf` |
| BR-16 | Demo vendor scoping | Blank vendor names → empty datasets |
| BR-17 | Exception sort: CRITICAL first, OPEN first, newest last | Sort in SupportHubPage |
| BR-18 | Onboarding complete → status ACTIVE, profileCompletion 100% | `completeOnboarding()` |
| BR-19 | 401 response → logout + redirect /login | Response interceptor |
| BR-20 | Live auction polling every 3s | `POLLING_INTERVALS.AUCTION_LIVE` |
| BR-21 | Notifications poll every 15s | `POLLING_INTERVALS.NOTIFICATIONS` |
| BR-22 | isInvoiced = true after invoice generation | `generateInvoice()` marks trips |
| BR-23 | NBFC tab hardcoded to Customer | LedgerPage active tab hardcoded |
| BR-24 | SLA breach shown via `SLACountdown` | Countdown to `slaDueAt` or "SLA Breached" |
| BR-25 | Vehicle blackout dates prevent assignment | `blackoutDates[]` on Vehicle |

---

## 19. Dependency Matrix

| Feature | Component | Store / Hook | API Service | Upstream | Downstream |
|---|---|---|---|---|---|
| Dashboard KPIs | DashboardPage | useVendorBookings, useAppStore | — | indents, trips, auctions, fleet | — |
| Auction bidding | SourcingPage, AuctionDetailPage | useSourcingBridge, app.store | SourcingService (auctionClient) | auction-web (shared bridge) | Contracts |
| Contract view | ContractsPage | app.store | (none) | — | — |
| Indent accept/decline | TripDetailPage | useVendorBookings | BookingsService | Tenant indents (embedded) | Trip creation |
| Vehicle assignment | TripDetailPage | useFleetData, app.store | BookingsService | Fleet master | Trip status |
| Fleet CRUD | FleetPage | useFleetData | FleetService | Tenant fleet (embedded) | Bookings, Compliance |
| Compliance docs | AddVehicleModal, AddDriverModal | app.store | FleetService.uploadCompliance | — | Compliance status |
| Invoice generation | CreateInvoicePage | app.store.generateInvoice | InvoiceService | Completed trips | Finance ledger |
| Invoice dispute | InvoicesPage | app.store | DisputeService | Finance approval action | Dispute thread |
| Dispute response | DisputeThreadPage | app.store.respondToDispute | DisputeService | Dispute state | — |
| NBFC application | InvoiceDetailPage | app.store.submitNbfcApplication | — | Approved invoices | NBFC ledger |
| Record payment | PaymentsPage | app.store.recordInvoicePayment | LedgerService | Approved invoices | Ledger entries |
| Ledger view | LedgerPage | app.store | LedgerService | Payments, invoices | CSV export |
| Exception report | ReportExceptionPage | app.store.createException | ExceptionsService | Active trips | Exception timeline |
| Vendor profile | ProfilePage | auth.store.updateVendorProfile | ProfileService | — | Onboarding status |
| Notifications | NotificationsPage | app.store | NotificationsService | All modules | — |
| Embedded fleet | useFleetData | TenantDataBridge | — | Tenant admin fleet | Fleet page |
| Embedded bookings | useVendorBookings | TenantDataBridge | — | Tenant admin bookings | Trip pages |

---

## 20. Edge Cases

| Scenario | Handling |
|---|---|
| Blank/new vendor (demo mode) | `applyVendorDataset()` → empty datasets, no mock data flash |
| 401 API response | `handleResponseError` → logout + redirect /login |
| Dispute vendor response when not OPEN | `canRespond = false` → reply section hidden |
| Bid revision on same lane | Previous bid → SUPERSEDED, new bid → ACTIVE |
| Invoice resubmission | Old invoice → CLOSED (SUPERSEDED), new invoice → PENDING |
| All trip docs missing | Documents tab shows empty state per type |
| Compliance: no documents uploaded | Status = PENDING_DOCS |
| Compliance: multiple expired docs | Status = EXPIRED (worst wins) |
| Payment amount > pending balance | Validation blocks submission |
| Embedded mode: no TenantDataBridge | `useFleetData` / `useVendorBookings` fall back to app.store |
| Sourcing bridge: no shared auction store | `hasShared = false` → uses app.store auctions |
| Exception tab: trips with exceptionFlag | Separated from normal assignment/in-transit tabs |
| NBFC ledger tab | Always shows Customer ledger (hardcoded) |
| onboarding incomplete | Vendor status = ONBOARDING_INCOMPLETE → redirects to /onboarding |
| Disruption on active trip | `changeTripAssignment()` with reason + notes required |
| File > 5MB upload | `FILE_UPLOAD_MAX_SIZE` check (client-side only) |
| No auctions available | Dashboard shows 0, SourcingPage shows empty state |
| Suspended/Blacklisted vendor | Status shown in profile; no functional block found |

---

## 21. Hidden Features & Technical Debt

### Disabled / Stub Features

| Feature | Location | Status |
|---|---|---|
| NBFC Ledger tab | LedgerPage | **Hardcoded to Customer tab** — NBFC tab renders but doesn't activate |
| RBAC enforcement | `rbac.ts` | **All return `true`** — placeholder only |
| Real HTTP API | All services | Wired but **defaults to mock Zustand store** |
| POD upload flow | TripDetailPage | **Partial** — `uploadPod()` service exists; UI flow unclear |
| Vendor blackout dates | Vehicle model | **Defined but no UI** for blackout calendar management |
| Report downloads | Not found | **MISSING** — no export/download anywhere |
| Driver suspension flow | DriverStatus.BLOCKED | **Status defined** — no UI to block/unblock driver |
| Contract amendments | Amendment[] on Contract | **Data defined** — no UI for amendment history |

### Technical Debt

| Item | Severity | Detail |
|---|---|---|
| **RBAC returns `true` for everything** | High | No real permission enforcement — all actions allowed |
| **NBFC ledger tab hardcoded** | High | `activeTab` hardcoded to Customer in LedgerPage |
| **Demo vendor scoping in production code** | Medium | `applyVendorDataset()` is demo logic mixed into store |
| **No pagination on TripsPage tabs** | Medium | All trips rendered per tab — no page limit |
| **File size check client-side only** | Medium | 5MB limit enforced in UI but not server-validated |
| **DEV_VENDOR_ID fallback in prod client** | Medium | `'a1000000-0000-0000-0000-000000000001'` hardcoded as fallback |
| **No optimistic updates** | Low | All mutations wait for store update |
| **Auction polling on every 3s** | Low | Heavy if many concurrent live auctions |
| **Profile completion = max(current, 60%)** | Low | Hardcoded 60% threshold |
| **GSTIN/PAN not validated format** | Low | Only `toUpperCase()` applied — no pattern validation |

---

## 22. Missing Features Report

| # | Feature | Priority | Detail |
|---|---|---|---|
| MF-01 | Real RBAC enforcement | Critical | `rbac.ts` returns `true` for all — no actual access control |
| MF-02 | NBFC ledger tab activation | High | Tab exists but hardcoded to Customer |
| MF-03 | Vehicle blackout calendar UI | High | `blackoutDates[]` model defined; no UI management |
| MF-04 | Driver block/unblock flow | High | BLOCKED status defined; no UI action |
| MF-05 | Report / export downloads | High | No export anywhere in module |
| MF-06 | POD upload complete flow | High | Service defined; UI flow partial |
| MF-07 | Pagination on TripsPage tabs | Medium | All trips render without limit |
| MF-08 | Contract amendment history UI | Medium | Amendment[] defined; no rendering |
| MF-09 | GSTIN/PAN format validation | Medium | Only uppercasing — no pattern check |
| MF-10 | Server-side file size validation | Medium | Client-only 5MB check |
| MF-11 | Vendor suspension/blacklist flow | Medium | Status defined; no tenant admin → vendor action wired |
| MF-12 | Onboarding multi-step verification UI | Medium | OnboardingPage exists; KYC document verification flow depth unclear |
| MF-13 | Capacity declaration calendar | Low | `blackoutDates[]` in CapacityDeclaration — no calendar UI |
| MF-14 | Dispute close from vendor side | Low | `DisputeService.close()` exists; no vendor-triggered close UI |
| MF-15 | Multi-currency support | Low | All amounts in INR (₹) hardcoded |
| MF-16 | Invoice PDF generation | Low | `pdfUrl` field exists; generation not wired |
| MF-17 | Notification deep link navigation | Low | `deepLink` field in Notification; navigation not wired |
| MF-18 | SLA breach alerting | Low | SLACountdown shows "SLA Breached"; no push notification |
| MF-19 | Contract renewal workflow | Low | `renewalTerms` field exists; no UI |
| MF-20 | Real-time bid competition display | Low | Only own bids shown; no competitor bid visibility |

---

## 23. Complete Type & Enum Reference

### Vendor Enums

| Enum | Values |
|---|---|
| `VendorStatus` | ONBOARDING_INCOMPLETE, PENDING_VERIFICATION, UNDER_REVIEW, ACTIVE, REJECTED, SUSPENDED, BLACKLISTED |
| `VendorOnboardingStep` | REGISTER, OTP, SETUP, DOCUMENTS, REVIEW, COMPLETE |
| `VendorKycStatus` | NOT_STARTED, DRAFT, SUBMITTED, UNDER_REVIEW, REJECTED, APPROVED |
| `VendorDocumentType` | GST, PAN, BANK, COMPANY, AADHAAR_FRONT, AADHAAR_BACK |
| `VendorDocumentStatus` | PENDING, VERIFIED, REJECTED |

### Auction / Sourcing Enums

| Enum | Values |
|---|---|
| `AuctionType` | SPOT, LOT, BULK |
| `AuctionState` | UPCOMING, LIVE, PENDING_AWARD, AWARDED, NOT_AWARDED, NOT_PARTICIPATED, CANCELLED |
| `AuctionBidStatus` | ACTIVE, REVISED, SUPERSEDED |

### Contract Enums

| Enum | Values |
|---|---|
| `ContractStatus` | DRAFT, ACTIVE, EXPIRED, TERMINATED |
| `RateType` | PER_TRIP, PER_KM |

### Trip / Indent Enums

| Enum | Values |
|---|---|
| `IndentStatus` | PENDING, ACCEPTED, DECLINED, EXPIRED |
| `BookingState` (TripStatus) | ACCEPTED, ASSIGNED, OUT_FOR_PICKUP, PICKUP_REACHED, LOADING_STARTED, LOADING_COMPLETED, IN_TRANSIT, DESTINATION_REACHED, POD_PENDING, COMPLETED, CANCELLED |
| `BookingSlaFlag` | ON_TIME, DELAYED |
| `DisruptionReason` | VEHICLE_BREAKDOWN, DRIVER_BREAKDOWN, VEHICLE_OR_DRIVER_BREAKDOWN |
| `TripDocumentType` | INVOICE_COPY, POD_COPY, EWAY_BILL, LR_COPY, REMARKS, SUB_DELIVERY, OTHER |

### Invoice / Finance Enums

| Enum | Values |
|---|---|
| `InvoiceStatus` | PENDING, APPROVED, DISPUTED, RESUBMISSION_REQUIRED, CLOSED |
| `InvoiceCloseReason` | SUPERSEDED, REJECTED |
| `ExpenseType` | EXPENSE, DETENTION, LOADING_UNLOADING, WEIGHBRIDGE, OTHER |
| `DisputeStatus` | OPEN, CLOSED |
| `DisputeMessageSender` | FINANCE, VENDOR |
| `NBFCDiscountingStatus` | ELIGIBLE, SUBMITTED, APPROVED, DISBURSED, REJECTED |

### Ledger Enums

| Enum | Values |
|---|---|
| `LedgerType` | CUSTOMER, NBFC |
| `CustomerLedgerEntryType` | INVOICE_APPROVED, CUSTOMER_PAYMENT, TDS_DEDUCTION, CUSTOMER_ADJUSTMENT |
| `NbfcLedgerEntryType` | NBFC_FINANCING_APPROVED, NBFC_DISBURSEMENT, NBFC_CHARGE, NBFC_REPAYMENT, NBFC_ADJUSTMENT |
| `PaymentKind` | CUSTOMER_PAYMENT, TDS_DEDUCTION, NBFC_DISBURSEMENT, NBFC_REPAYMENT, NBFC_CHARGE |
| `PaymentState` | POSTED, PENDING |

### Fleet Enums

| Enum | Values |
|---|---|
| `ComplianceStatus` | COMPLIANT, EXPIRING_SOON, EXPIRED, PENDING_DOCS |
| `OperationalStatus` | ACTIVE, INACTIVE, UNDER_MAINTENANCE |
| `DriverStatus` | ACTIVE, INACTIVE, BLOCKED |
| `ComplianceDocumentStatus` | VALID, EXPIRING_SOON, EXPIRED |

### Exception Enums

| Enum | Values |
|---|---|
| `ExceptionSeverity` | CRITICAL, HIGH, MEDIUM, LOW |
| `ExceptionStatus` | OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED |
| `ExceptionIssueType` | Breakdown, Delay, Accident, Route deviation, Cargo issue |

### Notification Enums

| Enum | Values |
|---|---|
| `NotificationCategory` | ONBOARDING, SOURCING, CONTRACTS, TRIPS, EXPENSES, INVOICES |

### Vehicle Types (Constants)
`20FT_CONTAINER` | `32FT_CONTAINER` | `40FT_CONTAINER` | `FLATBED` | `TANKER` | `TRAILER` | `LCV` | `HCV`

### Polling Intervals
| Key | ms |
|---|---|
| `DASHBOARD` | 30,000 |
| `NOTIFICATIONS` | 15,000 |
| `AUCTION_LIVE` | 3,000 |
| `SLA_SYNC` | 60,000 |

### File Upload Config
```typescript
FILE_UPLOAD_MAX_SIZE = 5 * 1024 * 1024  // 5MB
ACCEPTED_FILE_TYPES = '.png, .jpg, .jpeg, .webp, .pdf'
```

### StatusBadge Color Mapping (100+ statuses)
| Color | Key Statuses |
|---|---|
| Green (success) | ACTIVE, APPROVED, DISBURSED, COMPLIANT, PAID, AWARDED, DELIVERED, ACCEPTED, VERIFIED, VALID, ON_TIME, LOADING_COMPLETED |
| Blue (info) | SUBMITTED, ASSIGNED, OUT_FOR_PICKUP, IN_TRANSIT, PENDING_AWARD, LIVE, UNDER_REVIEW |
| Amber (warning) | PENDING, UPCOMING, EXPIRING_SOON, UNDER_MAINTENANCE, RESUBMISSION_REQUIRED, LOADING_STARTED, POD_PENDING, DELAYED |
| Red (destructive) | REJECTED, EXPIRED, TERMINATED, BLOCKED, NOT_AWARDED, SUSPENDED, BLACKLISTED, DECLINED, EXCEPTION, CANCELLED |
| Gray (muted) | DRAFT, CLOSED, INACTIVE, INVOICED, SUPERSEDED, NOT_PARTICIPATED, PENDING_DOCS, DISPUTED |

**Special:** `LIVE` shows animated pulse dot before label

---

*End of Vendor-Web Module Deep Code Review — Reverse-engineered from full source scan of `/modules/vendor-web/`*
