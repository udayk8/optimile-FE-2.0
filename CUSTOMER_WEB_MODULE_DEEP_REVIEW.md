# Customer-Web Module — Complete Deep Code Review
**Module:** `/modules/customer-web/`
**Scan Date:** 2026-06-03
**Stack:** React 19 + TypeScript 5.6 + Vite 6 + React Router 7.1 | Port 3003
**Purpose:** Customer-facing portal for booking creation, shipment tracking, ePOD visibility, finance AR, and analytics reporting

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Route Hierarchy](#2-route-hierarchy)
3. [Navigation & Layout Structure](#3-navigation--layout-structure)
4. [Screen Inventory](#4-screen-inventory)
5. [Feature Inventory](#5-feature-inventory)
6. [Booking Lifecycle (11 Statuses)](#6-booking-lifecycle-11-statuses)
7. [Booking Data Model](#7-booking-data-model)
8. [Form Analysis](#8-form-analysis)
9. [API Catalog](#9-api-catalog)
10. [State Management](#10-state-management)
11. [RBAC & Authentication](#11-rbac--authentication)
12. [Business Rules Catalog](#12-business-rules-catalog)
13. [Filtering & Search Logic](#13-filtering--search-logic)
14. [Finance & Reporting Reference](#14-finance--reporting-reference)
15. [Dependency Matrix](#15-dependency-matrix)
16. [Edge Cases](#16-edge-cases)
17. [Hidden Features & Technical Debt](#17-hidden-features--technical-debt)
18. [Missing Features Report](#18-missing-features-report)
19. [Complete Type & Constant Reference](#19-complete-type--constant-reference)

---

## 1. Architecture Overview

### Problem Domain
A customer-facing self-service portal for logistics customers. Enables customers to create booking requests, track active shipments in real-time, view ePOD status, manage consignee links, monitor AR invoices, and download operational reports — all within a branded portal experience.

### Key Characteristics
- **Protected via `PortectedRoute portal="customer"`** — customer-authenticated sessions only
- **No real API calls** — entire module driven by hardcoded mock `BOOKINGS` array
- **Single-page application** — section switching via `activeSection` state (no URL-based routing between sections)
- **Session identity** from `localStorage["optimile.session.context"]`
- **Two entry files**: `CustomerApp.tsx` (simple), `CustomerBrdDashboard.tsx` (full BRD dashboard)

### File Structure
```
customer-web/
├── src/
│   ├── main.tsx                   — App entry, BrowserRouter + CustomerApp
│   ├── index.ts                   — Empty export
│   ├── app/
│   │   ├── CustomerApp.tsx        — Simple portal (KPI overview only)
│   │   └── CustomerBrdDashboard.tsx — Full BRD dashboard (6 sections, primary file)
│   └── styles/
│       └── global.css             — CSS variables + Tailwind layers
├── package.json                   — Port 3003, React 19, shared packages
├── vite.config.ts                 — Path aliases
└── tsconfig.json                  — Path aliases, strict mode
```

### Session Identity Resolution
```typescript
SESSION_CONTEXT_KEY = 'optimile.session.context'

readPortalCustomerIdentity():
  1. Read localStorage[SESSION_CONTEXT_KEY]
  2. Parse JSON → { loginType?, customerId?, customerName?, phone? }
  3. Return null if loginType ≠ 'CUSTOMER' or on any error
  4. Return { customerId, customerName, phone } if valid

displayName = portalCustomer.customerName ?? user.name ?? 'Customer User'
displayRole = portalCustomer ? 'Customer' : user.role ?? 'CBD'
```

### Path Aliases
```
@customer/*  → ./src/*
@shared-auth → ../../packages/shared-auth/src
@shared-ui   → ../../packages/shared-ui/src
@shared-utils → ../../packages/shared-utils/src
```

---

## 2. Route Hierarchy

```
/ (BrowserRouter root)
└── CustomerApp (ProtectedRoute portal="customer")
      └── CustomerDashboardShell
            └── [Section-based navigation — no sub-routes]
                  ├── overview   (default)
                  ├── bookings
                  ├── create
                  ├── tracking
                  ├── finance
                  └── reports
```

> **Note:** No React Router `<Route>` definitions within the module. All navigation is via `activeSection` state switching. URL does not change between sections.

---

## 3. Navigation & Layout Structure

### Sidebar (hidden on mobile, `lg:flex`)

```
Logo section
  "O" icon + "Optimile Customer Dashboard"

User Profile Card
  UserCircle2 icon + displayName + displayRole

Workspace Menu (NAV_ITEMS):
  Overview        (LayoutDashboard)  — KPIs, alerts, live feed
  Bookings        (ClipboardList)    — Lifecycle tabs and list
  Create Booking  (Plus)             — Customer booking intake
  Track & ePOD    (Route)            — ETA, milestones, POD
  Finance         (CircleDollarSign) — Invoices and aging
  Reports         (BarChart3)        — Shipment analytics exports

Language Dropdown:
  <select> English | Hindi | Kannada
```

### Header (sticky, z-20)
```
Left:
  Eyebrow: "Optimile"
  Title: "Customer Booking Dashboard"
  Subtitle: context text

Right:
  Search input (with live dropdown results)
  Notifications bell (red dot indicator)
  Logout button (aria-label: "Log out")
```

### Search Dropdown (live)
- Appears when `searchFocused && filteredSearchItems.length > 0`
- Disappears after 120ms blur delay
- Items: `['Booking request BR-2041', 'Shipment SHP-8821', 'Contract CNT-CBD-19', 'Lane Mumbai → Bengaluru', 'Customer SLA exceptions']`
- Filtered by `query` (case-insensitive)

### Notifications Dropdown
| ID | Message | Channel | Priority | Time |
|---|---|---|---|---|
| n1 | Delay alert raised for BK-2401 | In-app + SMS | High | 8m ago |
| n2 | Vehicle assigned for BK-2404 is pending | In-app | Medium | 18m ago |
| n3 | Invoice generated for BK-2398 | Email | Medium | 1h ago |

---

## 4. Screen Inventory

### Section 1: Overview

**Purpose:** Executive KPI dashboard with live alerts, charts, and activity feed.

#### KPI Grid (7 cards)
| Label | Value | Detail | Icon | Tone |
|---|---|---|---|---|
| Total Trips | 6 | Date range: last 30 days | ClipboardList | text-primary |
| Active Trips | 4 | 1 delayed, 1 exception | Truck | text-success |
| Pending POD | 3 | Awaiting delivery proof | ClipboardCheck | text-warning |
| Completed | 1 | 1 on-time delivery | CheckCircle2 | text-success |
| Delayed | 1 | +1 vs yesterday | Clock3 | text-danger |
| Cancelled | 0 | 0.0% cancellation rate | AlertTriangle | text-danger |
| SLA Score | 88% | +4% vs prior period | ShieldCheck | text-primary |

#### Exception Alert (conditional)
- Shown when `activeExceptions.length > 0`
- Red border (`border-danger/20`) + red background (`danger/5`)
- Text: `"{count} active customer-visible exceptions"`
- Detail: `"{delayed} delayed shipment and {exception} operational exception require attention."`
- Button: "View Exceptions" (destructive) → sets `statusTab = 'exceptions'`, `activeSection = 'bookings'`

#### Trip Summary Chart (stacked bar)
| Segment | Value | Color |
|---|---|---|
| Completed | 18 | bg-success |
| Active | 42 | bg-primary |
| Pending POD | 11 | bg-warning |
| Unfulfilled | 7 | bg-secondary |
| Cancelled | 2 | bg-danger |

#### 7-Day Booking Trend (bar chart)
- Heights: `[38, 62, 45, 72, 52, 88, 66]` (D1–D7)
- Badge: `"+12% week over week"`

#### Notifications Feed
- Same 3 notifications as header bell dropdown

#### Active Exception Bookings Feed
- Lists `activeExceptions` (IN_TRANSIT_DELAYED + IN_TRANSIT_EXCEPTION)
- Per row: booking ID, sales order, route, status badge, action button

---

### Section 2: Bookings

**Purpose:** Full booking list with search, status tabs, and inline detail panel.

#### Status Filter Tabs
| Tab | Statuses Included |
|---|---|
| All | (no filter) |
| Active | DISPATCHED, IN_TRANSIT, IN_TRANSIT_DELAYED, IN_TRANSIT_EXCEPTION |
| Pending | DRAFT, PENDING_RATE_APPROVAL, PENDING_AUCTION, PENDING_ASSIGNMENT, READY_FOR_DISPATCH |
| Completed | DELIVERED |
| Exceptions | IN_TRANSIT_DELAYED, IN_TRANSIT_EXCEPTION |
| Cancelled | CANCELLED |

#### Search Field
- Matches: booking `id`, `salesOrder`, `consignee`, `vehicle`, `origin`, `destination`
- Case-insensitive contains matching

#### Booking List Columns
Booking ID | Sales Order | Status Badge | Route (Origin → Destination) | Consignee | ETA / Progress

#### Detail Panel (right side on click)
**4 tabs:**

| Tab | Content |
|---|---|
| `freight` | Sales Order, Created By, Booking Date, Material, Quantity, Weight, Driver Contact, Customer Action |
| `track` | GPS Map placeholder, ETA, Avg Speed, Total Distance, Consignee Link status, Trip Progress bar |
| `timeline` | Activity timeline with step states |
| `load` | Load stops table with destination, material, qty, weight, TAT, ePOD status |

#### Timeline Step State Colors
| State | Color |
|---|---|
| `done` | success (green) |
| `current` | warning (amber) |
| `issue` | danger (red) |
| `future` | muted (gray) |

---

### Section 3: Create Booking

**Purpose:** Customer booking intake form.

#### Form Fields
| Field | Source / Type | Notes |
|---|---|---|
| Customer | Pre-filled (displayName) | Read-only |
| Origin | Select | Location Master |
| Destination | Select | Location Master |
| Lane | Auto-derived | From origin + destination |
| Commodity Type | Select | Commodity Master |
| Vehicle Type | Select | Vehicle Type Master |
| Loading Date/Time | Date-time picker | Future dates only |
| Material Quantity & UOM | Number + UOM select | — |
| Goods Value | Number | E-way bill required above Rs 50,000 |
| Special Instructions | Multi-select | Hazmat, fragile, temperature-sensitive |

#### Buttons
- **Save Draft** → persists as DRAFT (mock)
- **Submit Booking** → transitions to PENDING_RATE_APPROVAL (mock)

> **NOTE:** No `onSubmit` handler wired — buttons render but do not call any function.

---

### Section 4: Track & ePOD

**Purpose:** Detailed shipment tracking with live GPS, milestones, and ePOD status.

#### Layout
- Left: Booking list (same filtered list as Bookings section)
- Right: Detail panel with 4 tabs (freight / track / timeline / load)

#### Track Tab Content
- **GPS Map:** Placeholder div — no actual map rendered
- **ETA:** from booking data
- **Average Speed:** `{booking.avgSpeed} km/h`
- **Total Distance:** `{booking.distanceKm} km`
- **Consignee Link Status:** Sent and viewed / Sent / Not sent
- **Trip Progress:** `{booking.progress}%` progress bar

#### ePOD Display
| Status | Method | Notes |
|---|---|---|
| Captured | Photo + OTP / OTP | Shows timestamp + feedback |
| Pending | Photo + OTP | Awaiting delivery |

---

### Section 5: Finance

**Purpose:** AR invoice visibility and aging analysis.

#### Finance Tiles (4)
| Tile | Value | Sub-label |
|---|---|---|
| Total Freight YTD | Rs 42.8L | Booked freight visible to customer |
| Pending Invoices | Rs 7.4L | 12 open invoices |
| Average Freight / Trip | Rs 48.2K | Across selected period |
| Overdue Amount | Rs 1.2L | 2 invoices past credit days |

#### Invoice Aging Table
| Bucket | Amount |
|---|---|
| 0–15 days | Rs 2.4L |
| 16–30 days | Rs 3.1L |
| 31–45 days | Rs 1.9L |
| 46–60 days | Rs 0.8L |
| 60+ days | Rs 0.4L |

---

### Section 6: Reports

**Purpose:** Analytics export center — 6 report types.

#### Report Cards (6)
| Report | Metrics | Exports |
|---|---|---|
| Shipment Summary | Total trips, on-time %, cancellation rate, avg TAT | PDF, Excel, CSV |
| Lane Performance | OTD by lane, avg freight, delay frequency | PDF, Excel, CSV |
| Consignee Report | Trips per consignee, OTD %, avg delivery time | PDF, Excel, CSV |
| Freight Spend | Total spend, avg rate per MT, lane variance | PDF, Excel, CSV |
| Exception Analysis | Exception count, resolution time, repeat lanes | PDF, Excel, CSV |
| Invoice Aging | Open invoices, aging buckets, overdue amount | PDF, Excel |

---

## 5. Feature Inventory

| # | Feature | Status | Section |
|---|---|---|---|
| F-01 | Customer portal authentication (ProtectedRoute) | Live | App entry |
| F-02 | Session identity from localStorage | Live | App entry |
| F-03 | Customer dashboard KPI grid (7 cards) | Live (mock) | Overview |
| F-04 | Exception alert banner | Live (mock) | Overview |
| F-05 | Trip summary stacked bar chart | Live (mock) | Overview |
| F-06 | 7-day booking trend chart | Live (mock) | Overview |
| F-07 | Notifications bell + dropdown | Live (mock) | Header |
| F-08 | Search with live dropdown | Live (mock) | Header |
| F-09 | Booking list with status tabs | Live (mock) | Bookings |
| F-10 | Booking search (6 fields) | Live (mock) | Bookings |
| F-11 | Booking detail panel (4 tabs) | Live (mock) | Bookings |
| F-12 | Freight details tab | Live (mock) | Bookings |
| F-13 | Tracking tab (GPS placeholder) | **PLACEHOLDER** | Bookings |
| F-14 | Activity timeline tab | Live (mock) | Bookings |
| F-15 | Load stops tab | Live (mock) | Bookings |
| F-16 | Status badge per booking (11 states) | Live (mock) | Bookings |
| F-17 | Booking creation form (UI only) | **NO SUBMIT** | Create |
| F-18 | E-way bill threshold notice (Rs 50K) | Live (UI) | Create |
| F-19 | Special instructions (Hazmat/Fragile/Temp) | Live (UI) | Create |
| F-20 | Track & ePOD section | Live (mock) | Tracking |
| F-21 | ePOD status display (Captured/Pending) | Live (mock) | Tracking |
| F-22 | Consignee link status | Live (mock) | Tracking |
| F-23 | Trip progress bar | Live (mock) | Tracking |
| F-24 | Finance tiles (4 metrics) | Live (mock) | Finance |
| F-25 | Invoice aging table | Live (mock) | Finance |
| F-26 | Reports catalog (6 reports) | Live (UI, no download) | Reports |
| F-27 | Export buttons (PDF/Excel/CSV) | **UI ONLY** | Reports |
| F-28 | Consignee analytics (OTD %) | Live (mock) | Overview |
| F-29 | Language switcher (EN/HI/KN) | **UI ONLY** | Sidebar |
| F-30 | Logout | Live | Header |
| F-31 | View Exceptions shortcut | Live (mock) | Overview |
| F-32 | Delay badge (delayed hours) | Live (mock) | Bookings |
| F-33 | Exception note display | Live (mock) | Bookings |
| F-34 | Driver contact masking (pre-assignment) | Live (mock) | Bookings |
| F-35 | ERP vs Customer vs Ops booking source | Live (mock) | Bookings |

---

## 6. Booking Lifecycle (11 Statuses)

```
DRAFT
  └──► [Submit] → PENDING_RATE_APPROVAL
                        └──► [Rate approved] → PENDING_AUCTION
                                                     └──► [Vendor selected] → PENDING_ASSIGNMENT
                                                                                    └──► [Vehicle assigned] → READY_FOR_DISPATCH
                                                                                                                    └──► [Dispatch] → DISPATCHED
                                                                                                                                          └──► [Loading complete] → IN_TRANSIT
                                                                                                                                                                         ├──► [Delay >2h] → IN_TRANSIT_DELAYED
                                                                                                                                                                         ├──► [Ops issue] → IN_TRANSIT_EXCEPTION
                                                                                                                                                                         └──► [Delivery] → DELIVERED (with ePOD)

At any stage:
  └──► CANCELLED
```

### Complete STATUS_META Reference

| Status | Label | Badge | Description | Customer Action |
|---|---|---|---|---|
| `DRAFT` | Draft | muted | Booking saved but not submitted | Edit, Submit |
| `PENDING_RATE_APPROVAL` | Processing | warning | Freight rate being reviewed internally | View only |
| `PENDING_AUCTION` | Vendor Selection | info | Transport vendor being sourced | View only |
| `PENDING_ASSIGNMENT` | Assigning Vehicle | warning | Vehicle and driver assignment in progress | View only |
| `READY_FOR_DISPATCH` | Ready for Dispatch | default | Vehicle and driver confirmed | View only |
| `DISPATCHED` | Dispatched | info | Vehicle heading to pickup location | Track |
| `IN_TRANSIT` | In Transit | default | Goods loaded and en route | Track, View ETA |
| `IN_TRANSIT_DELAYED` | Delayed | destructive | ETA slipped by more than 2 hours | Track, View revised ETA |
| `IN_TRANSIT_EXCEPTION` | Exception | destructive | Operational issue reported | View exception |
| `DELIVERED` | Delivered | success | Delivery confirmed with ePOD | View ePOD, Download LR |
| `CANCELLED` | Cancelled | outline | Booking cancelled with reason | View reason |

---

## 7. Booking Data Model

### Complete `Booking` Type

```typescript
type Booking = {
  id: string                    // e.g., "BK-2401"
  salesOrder: string            // e.g., "SO-77821"
  status: BookingStatus
  origin: string                // City, State
  destination: string           // City, State
  consignee: string             // Consignee name
  vehicle: string               // Registration or "-"
  driver: string                // Name or "Masked until assigned"
  driverPhone: string           // Masked or "-"
  weight: number                // in MTS
  material: string              // Material description
  quantity: string              // e.g., "980 bags"
  eta: string                   // "Today, 19:40" or "Awaiting assignment"
  bookingDate: string           // ISO-like datetime
  createdBy: 'ERP' | 'Customer' | 'Ops'
  freight: number               // INR value
  lrNumber: string              // e.g., "LR-BLR-0042" or "-"
  progress: number              // 0–100 percentage
  lastUpdate: string            // "8 min ago" or absolute
  avgSpeed: number              // km/h (0 if not moving)
  distanceKm: number            // total route distance
  delayedHours?: number         // hours of delay
  exceptionNote?: string        // exception description
  epod?: {
    status: 'Captured' | 'Pending'
    method: 'OTP' | 'Photo + OTP'
    timestamp?: string
    feedback?: string
  }
  consigneeLink: 'Sent and viewed' | 'Sent' | 'Not sent'
  loadStops: Array<{
    destination: string
    material: string
    quantity: string
    weight: number
    tat: string
    pod: 'Captured' | 'Pending' | 'Not applicable'
  }>
  timeline: Array<{
    label: string
    time: string
    state: 'done' | 'current' | 'future' | 'issue'
  }>
}
```

### Sample Bookings (6 mock records)

| ID | Sales Order | Status | Route | Weight | Freight | Progress |
|---|---|---|---|---|---|---|
| BK-2401 | SO-77821 | IN_TRANSIT_DELAYED | Mumbai → Bengaluru | 24.5 MTS | Rs 84,500 | 68% |
| BK-2402 | SO-77832 | IN_TRANSIT | Pune → Hyderabad | 18.2 MTS | Rs 67,200 | 44% |
| BK-2403 | SO-77849 | IN_TRANSIT_EXCEPTION | Indore → Nagpur | 16.8 MTS | Rs 59,250 | 57% |
| BK-2398 | SO-77791 | DELIVERED | Chennai → Coimbatore | 12.4 MTS | Rs 38,200 | 100% |
| BK-2404 | SO-77867 | PENDING_ASSIGNMENT | Jaipur → Delhi | 9.8 MTS | Rs 24,100 | 12% |
| BK-2405 | SO-77870 | PENDING_RATE_APPROVAL | Surat → Ahmedabad | 7.2 MTS | Rs 17,800 | 8% |

### Notable Booking Details

**BK-2401 (Delayed):**
- Exception note: "Rain slowdown near Tumakuru. Revised ETA shared."
- Delayed by 3.2 hours

**BK-2403 (Exception):**
- Exception note: "Vehicle breakdown reported. Replacement review in progress."
- Average speed: 22 km/h (breakdown)

**BK-2404 (Pending Assignment):**
- Driver: "Masked until assigned" (privacy control)
- Vehicle: "-"
- Consignee link: Not sent

**BK-2398 (Delivered):**
- ePOD: Captured, Photo + OTP, timestamp: May 30 18:20
- Feedback: "Delivered intact. OTP verified."
- All 5 timeline steps done

---

## 8. Form Analysis

### Booking Creation Form (Section: Create)

| Field | Type | Source | Required | Notes |
|---|---|---|---|---|
| Customer | Pre-filled text | `displayName` (session) | Yes | Read-only |
| Origin | Select | Location Master | Yes | — |
| Destination | Select | Location Master | Yes | — |
| Lane | Auto text | Derived from Origin + Destination | Auto | — |
| Commodity Type | Select | Commodity Master | Yes | — |
| Vehicle Type | Select | Vehicle Type Master | Yes | — |
| Loading Date/Time | DateTime picker | — | Yes | Future dates only |
| Material Quantity | Number | — | Yes | — |
| UOM | Select | UOM Master | Yes | — |
| Goods Value | Number (INR) | — | Yes | E-way bill alert if > Rs 50,000 |
| Special Instructions | Multi-select | — | No | Hazmat / Fragile / Temperature-sensitive |

**Action Buttons:**
- **Save Draft** — intended: save as DRAFT
- **Submit Booking** — intended: transition to PENDING_RATE_APPROVAL

> **CRITICAL:** No `onSubmit` handler found. Buttons exist in UI but do nothing.

---

## 9. API Catalog

> **CRITICAL NOTE:** There are **zero API calls** in this module. All data — bookings, KPIs, finance, notifications, consignee analytics — is hardcoded in the component file. No `fetch()`, `axios`, React Query, or service files exist.

### Implied Production Endpoints (needed for real implementation)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/customer/bookings` | GET | Customer's booking list |
| `/api/customer/bookings` | POST | Create new booking |
| `/api/customer/bookings/:id` | GET | Booking detail + timeline |
| `/api/customer/bookings/:id/tracking` | GET | Live location + ETA |
| `/api/customer/bookings/:id/epod` | GET | ePOD status + document |
| `/api/customer/finance/invoices` | GET | Invoice list + aging |
| `/api/customer/reports/:type` | GET | Report data |
| `/api/customer/reports/:type/export` | POST | Export PDF/Excel/CSV |
| `/api/customer/notifications` | GET | Notification list |
| `/api/auth/logout` | POST | Session termination |

---

## 10. State Management

### Architecture
No Redux, Zustand, or Context. All state is local `useState` within `CustomerDashboardShell`.

### Component State (CustomerBrdDashboard)

```typescript
activeSection: CustomerSection = 'overview'
query: string = ''
statusTab: string = 'all'
detailTab: DetailTab = 'freight'
selectedBookingId: string = BOOKINGS[0].id  // 'BK-2401'
```

### Memoized Computations

```typescript
// Identity
portalCustomer = useMemo(() => readPortalCustomerIdentity(), [])
displayName    = portalCustomer?.customerName ?? user.name ?? 'Customer User'
displayRole    = portalCustomer ? 'Customer' : user.role ?? 'CBD'

// Search (CustomerApp.tsx)
filteredSearchItems = useMemo(() =>
  SEARCH_ITEMS.filter(item => item.toLowerCase().includes(query.toLowerCase())),
  [query]
)

// Bookings
filteredBookings = useMemo(() => {
  let result = BOOKINGS
  if (query) result = result.filter(b =>
    [b.id, b.salesOrder, b.consignee, b.vehicle, b.origin, b.destination]
      .some(f => f.toLowerCase().includes(query.toLowerCase()))
  )
  switch (statusTab) {
    case 'active':    return result.filter(b => ACTIVE_STATUSES.includes(b.status))
    case 'pending':   return result.filter(b => PENDING_STATUSES.includes(b.status))
    case 'completed': return result.filter(b => b.status === 'DELIVERED')
    case 'exceptions':return result.filter(b => EXCEPTION_STATUSES.includes(b.status))
    case 'cancelled': return result.filter(b => b.status === 'CANCELLED')
    default:          return result
  }
}, [query, statusTab])

// Exception tracking
activeExceptions = BOOKINGS.filter(b =>
  b.status === 'IN_TRANSIT_DELAYED' || b.status === 'IN_TRANSIT_EXCEPTION'
)
activeBookings   = BOOKINGS.filter(b => ACTIVE_STATUSES.includes(b.status))
selectedBooking  = BOOKINGS.find(b => b.id === selectedBookingId) ?? BOOKINGS[0]
```

---

## 11. RBAC & Authentication

### Portal Protection
```typescript
<ProtectedRoute portal="customer">
  <CustomerDashboardShell />
</ProtectedRoute>
```
- Blocks non-customer authenticated users from accessing the module
- Redirects to `/login` if session invalid

### Session Context
```typescript
localStorage['optimile.session.context'] = {
  loginType: 'CUSTOMER',     // required
  customerId: string,
  customerName: string,
  phone: string
}
```

### Logout Flow
```typescript
handleLogout(): void {
  logout()                            // from useAuth() — clears session
  window.location.assign('/login')    // hard redirect
}
```

### No Internal RBAC
- No role-based feature gates within the module
- All sections visible to any authenticated customer user
- Driver info masked for pre-assignment bookings (data-level only)

---

## 12. Business Rules Catalog

| # | Rule | Detail |
|---|---|---|
| BR-01 | Delay threshold = 2 hours | ETA slip > 2h triggers `IN_TRANSIT_DELAYED` status |
| BR-02 | E-way bill required above Rs 50,000 | Form shows notice when goods value > 50,000 |
| BR-03 | Driver info masked pre-assignment | `driver = "Masked until assigned"`, `driverPhone = "-"` |
| BR-04 | LR number only after assignment | `lrNumber = "-"` until READY_FOR_DISPATCH+ |
| BR-05 | Vehicle only after PENDING_ASSIGNMENT | `vehicle = "-"` until assigned |
| BR-06 | Consignee link not sent pre-assignment | `consigneeLink = "Not sent"` for PENDING_* statuses |
| BR-07 | Progress = 0 for pre-dispatch statuses | DRAFT/PENDING_*/READY statuses show low progress |
| BR-08 | ePOD required for DELIVERED | All DELIVERED bookings have ePOD captured |
| BR-09 | Exception alert only when active | Banner shown only if `activeExceptions.length > 0` |
| BR-10 | OTD color: green ≥ 90%, amber ≥ 80%, red < 80% | `otdClass()` helper function |
| BR-11 | createdBy tracks origin | ERP / Customer / Ops — shown in freight tab |
| BR-12 | Currency format: Indian locale | `Rs ${value.toLocaleString('en-IN')}` |
| BR-13 | Search debounce: none | Instant filter on keypress (no debounce) |
| BR-14 | Tab filter + text search combined | Both applied simultaneously via `useMemo` |
| BR-15 | Session fallback display | `user.name` used if no portal customer identity |
| BR-16 | Exception tab = delayed + exception | `IN_TRANSIT_DELAYED` + `IN_TRANSIT_EXCEPTION` combined |
| BR-17 | Notification badge: red dot | Always shown (not dynamic count) |
| BR-18 | Search blur delay: 120ms | `setTimeout(120)` prevents immediate close on result click |

---

## 13. Filtering & Search Logic

### Status Tab Groups

| Tab Key | Included Statuses |
|---|---|
| `all` | All (no filter) |
| `active` | DISPATCHED, IN_TRANSIT, IN_TRANSIT_DELAYED, IN_TRANSIT_EXCEPTION |
| `pending` | DRAFT, PENDING_RATE_APPROVAL, PENDING_AUCTION, PENDING_ASSIGNMENT, READY_FOR_DISPATCH |
| `completed` | DELIVERED |
| `exceptions` | IN_TRANSIT_DELAYED, IN_TRANSIT_EXCEPTION |
| `cancelled` | CANCELLED |

### Text Search Fields
`booking.id` | `booking.salesOrder` | `booking.consignee` | `booking.vehicle` | `booking.origin` | `booking.destination`

### Helper Functions

```typescript
currency(value: number): string
  → `Rs ${value.toLocaleString('en-IN')}`

otdClass(value: number): string
  → value >= 90 ? 'text-success'
  → value >= 80 ? 'text-warning'
  → 'text-danger'

statusCount(statuses: BookingStatus[]): number
  → BOOKINGS.filter(b => statuses.includes(b.status)).length
```

---

## 14. Finance & Reporting Reference

### Consignee Analytics (CONSIGNEE_ANALYTICS)
| Consignee | Trips | OTD % |
|---|---|---|
| Kanodia Cement - Bengaluru DC | 34 | 88% |
| Apex Retail Hub | 29 | 93% |
| Central Stock Point | 21 | 76% |
| South Zone Consignee | 18 | 96% |

### Invoice Aging Buckets
| Days | Amount |
|---|---|
| 0–15 | Rs 2.4L |
| 16–30 | Rs 3.1L |
| 31–45 | Rs 1.9L |
| 46–60 | Rs 0.8L |
| 60+ | Rs 0.4L |

### Reports Export Formats
| Report | PDF | Excel | CSV |
|---|---|---|---|
| Shipment Summary | ✅ | ✅ | ✅ |
| Lane Performance | ✅ | ✅ | ✅ |
| Consignee Report | ✅ | ✅ | ✅ |
| Freight Spend | ✅ | ✅ | ✅ |
| Exception Analysis | ✅ | ✅ | ✅ |
| Invoice Aging | ✅ | ✅ | ❌ |

---

## 15. Dependency Matrix

| Feature | Component | Data Source | State | Auth | Downstream |
|---|---|---|---|---|---|
| Portal access | ProtectedRoute | localStorage session | — | `portal="customer"` | All sections |
| KPI grid | Overview section | BOOKINGS (computed) | `activeSection` | Customer session | — |
| Exception alert | Overview section | BOOKINGS filter | `activeExceptions` | — | Bookings section |
| Booking list | Bookings section | BOOKINGS | `filteredBookings` | — | Detail panel |
| Booking detail | Detail panel | `selectedBooking` | `selectedBookingId`, `detailTab` | — | — |
| Tracking tab | Detail panel | `selectedBooking` | `detailTab` | — | GPS (missing) |
| Create form | Create section | Session identity | local form state | — | No submit |
| Finance tiles | Finance section | FINANCE_TILES | `activeSection` | — | — |
| Reports | Reports section | REPORTS | `activeSection` | — | No download |
| Search | Header | BOOKINGS / SEARCH_ITEMS | `query`, `searchFocused` | — | Bookings filter |
| Notifications | Header bell | NOTIFICATIONS | local | — | — |
| Language switcher | Sidebar | Static options | — | — | No effect |
| Logout | Header | useAuth() | — | `logout()` | /login redirect |

---

## 16. Edge Cases

| Scenario | Handling |
|---|---|
| No portal customer in localStorage | Falls back to `user.name` / `user.role` from auth |
| Malformed localStorage JSON | `try/catch` → returns null → graceful fallback |
| `loginType ≠ 'CUSTOMER'` | `readPortalCustomerIdentity()` returns null |
| No bookings match search + tab | `filteredBookings = []` — empty list (no empty state component found) |
| `selectedBookingId` not in BOOKINGS | Falls back to `BOOKINGS[0]` |
| All exceptions resolved (0 active) | Exception alert banner hidden |
| Booking with no ePOD | `epod` field is `undefined` — detail tab shows Pending |
| Pre-assignment booking selected | Driver/vehicle/LR shown as "-" |
| Search blur on result click | 120ms delay prevents premature close |
| Language switched (EN/HI/KN) | No translation logic found — UI only |
| Export button clicked | No download handler — buttons are visual only |
| Create form submitted | No `onSubmit` — buttons do nothing |
| GPS map requested | Placeholder div — no map renders |
| Notifications bell clicked | Dropdown toggles (no mark-as-read logic) |

---

## 17. Hidden Features & Technical Debt

### Disabled / Non-functional Features

| Feature | Location | Status |
|---|---|---|
| Booking creation submit | Create section | Buttons render but **no onSubmit handler** |
| GPS live map | Tracking tab | **Placeholder div** — no map integration |
| Report downloads (PDF/Excel/CSV) | Reports section | **UI only** — no download handler |
| Language switcher | Sidebar | **UI only** — no i18n implementation |
| Notifications mark-as-read | Bell dropdown | No action |
| Consignee link generation | Tracking tab | Status shown but no "Send link" action |

### Technical Debt

| Item | Severity | Detail |
|---|---|---|
| **Zero API calls — all data hardcoded** | Critical | `BOOKINGS`, `FINANCE_TILES`, `NOTIFICATIONS`, `REPORTS` all static in component |
| **Booking creation form has no submit** | Critical | `onSubmit` handler not implemented |
| **GPS map is a placeholder** | High | Tracking tab's map is an empty `<div>` |
| **No pagination on booking list** | High | 6 items now; will break at scale |
| **Two CustomerApp files (CustomerApp.tsx vs CustomerBrdDashboard.tsx)** | Medium | Duplication — `main.tsx` uses simple version; BRD dashboard is separate |
| **No empty state components** | Medium | Empty `filteredBookings` shows nothing |
| **No error boundaries** | Medium | Any crash is unhandled |
| **No loading states** | Medium | All data renders instantly — no skeleton loaders |
| **Search has no debounce** | Low | Instant re-render on every keypress |
| **Notification count is static red dot** | Low | Not driven by actual unread count |
| **OTD % is color-only** | Low | No text indicator alongside color (accessibility issue) |
| **No ARIA labels** on most buttons | Low | Accessibility gap |
| **Language switcher with no effect** | Low | `<select>` with 3 options but no `onChange` handler |

---

## 18. Missing Features Report

| # | Feature | Priority | Detail |
|---|---|---|---|
| MF-01 | Real backend API integration | Critical | All data hardcoded — zero HTTP calls |
| MF-02 | Booking creation submit handler | Critical | Form exists but does nothing on submit |
| MF-03 | GPS live tracking map | Critical | Placeholder div — no map rendered |
| MF-04 | Report download (PDF/Excel/CSV) | High | 6 report types with no download handler |
| MF-05 | Pagination on booking list | High | No pagination — will not scale |
| MF-06 | Empty state for filtered results | High | No empty state UI when 0 bookings match |
| MF-07 | Error boundary / error states | High | No error handling anywhere |
| MF-08 | Loading states / skeletons | Medium | All data renders instantly |
| MF-09 | Language / i18n implementation | Medium | Switcher exists; no translations |
| MF-10 | Notifications mark-as-read | Medium | No read/unread state management |
| MF-11 | Consignee link send action | Medium | Status shown but no "Send" button |
| MF-12 | ePOD document download | Medium | ePOD captured status shown; no download |
| MF-13 | LR document download | Medium | "Download LR" action in STATUS_META but not wired |
| MF-14 | Real-time tracking poll | Medium | No polling or WebSocket for live updates |
| MF-15 | Booking cancellation flow | Medium | CANCELLED status exists; no cancel action |
| MF-16 | Draft booking edit flow | Medium | DRAFT status exists; no edit action wired |
| MF-17 | Contract section | Low | NAV_ITEMS has "Contracts" in CustomerApp.tsx only — not in BRD dashboard |
| MF-18 | Search debouncing | Low | No debounce on search input |
| MF-19 | Date range filter on reports | Low | No date picker in reports section |
| MF-20 | Accessibility (ARIA) | Low | Missing labels, keyboard nav, focus management |

---

## 19. Complete Type & Constant Reference

### Enums & Types

| Type | Values |
|---|---|
| `CustomerSection` | `'overview'` \| `'bookings'` \| `'create'` \| `'tracking'` \| `'finance'` \| `'reports'` |
| `DetailTab` | `'freight'` \| `'track'` \| `'timeline'` \| `'load'` |
| `BookingStatus` (11) | DRAFT, PENDING_RATE_APPROVAL, PENDING_AUCTION, PENDING_ASSIGNMENT, READY_FOR_DISPATCH, DISPATCHED, IN_TRANSIT, IN_TRANSIT_DELAYED, IN_TRANSIT_EXCEPTION, DELIVERED, CANCELLED |
| `ePOD.status` | `'Captured'` \| `'Pending'` |
| `ePOD.method` | `'OTP'` \| `'Photo + OTP'` |
| `createdBy` | `'ERP'` \| `'Customer'` \| `'Ops'` |
| `consigneeLink` | `'Sent and viewed'` \| `'Sent'` \| `'Not sent'` |
| `loadStop.pod` | `'Captured'` \| `'Pending'` \| `'Not applicable'` |
| `timeline.state` | `'done'` \| `'current'` \| `'future'` \| `'issue'` |
| `StatusMeta.badge` | `'default'` \| `'warning'` \| `'success'` \| `'destructive'` \| `'info'` \| `'muted'` \| `'outline'` |

### Status Filter Groups
```typescript
ACTIVE_STATUSES    = ['DISPATCHED', 'IN_TRANSIT', 'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION']
PENDING_STATUSES   = ['DRAFT', 'PENDING_RATE_APPROVAL', 'PENDING_AUCTION', 'PENDING_ASSIGNMENT', 'READY_FOR_DISPATCH']
EXCEPTION_STATUSES = ['IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION']
```

### CSS Custom Properties (global.css)
```css
--primary:     207 59% 30%  (strong blue)
--secondary:   207 59% 45%  (lighter blue)
--accent:       23 100% 50% (orange)
--success:     160 84% 39%  (green)
--warning:      38 92% 50%  (amber)
--danger:        0 84% 60%  (red)
--destructive:   0 84% 60%  (red)
--muted:       210 40% 96%  (light gray)
--border:      220 13% 91%  (light gray)
--radius:      0.5rem (8px)
```

### NAV_ITEMS (BRD Dashboard)
```typescript
[
  { id: 'overview',  label: 'Overview',        icon: LayoutDashboard  }
  { id: 'bookings',  label: 'Bookings',         icon: ClipboardList   }
  { id: 'create',    label: 'Create Booking',   icon: Plus            }
  { id: 'tracking',  label: 'Track & ePOD',     icon: Route           }
  { id: 'finance',   label: 'Finance',          icon: CircleDollarSign}
  { id: 'reports',   label: 'Reports',          icon: BarChart3       }
]
```

### NAV_ITEMS (Simple CustomerApp.tsx)
```typescript
[
  { id: 'overview',  label: 'Overview',         badge: undefined       }
  { id: 'requests',  label: 'Booking Requests', badge: '17'           }
  { id: 'shipments', label: 'Shipments',         badge: '42'          }
  { id: 'contracts', label: 'Contracts',         badge: undefined      }
]
```

### Lucide Icons Used
`AlertTriangle` | `BarChart3` | `Bell` | `BookOpenCheck` | `CheckCircle2` | `ChevronRight` | `CircleDollarSign` | `ClipboardCheck` | `ClipboardList` | `Clock3` | `Download` | `FileSpreadsheet` | `FileText` | `Filter` | `Languages` | `LayoutDashboard` | `LogOut` | `MapPin` | `PackageSearch` | `Plus` | `ReceiptText` | `Route` | `Search` | `Send` | `ShieldCheck` | `Truck` | `UserCircle2`

### Port & Dev Config
- **Dev port:** 3003
- **Host:** 127.0.0.1
- **Build:** `tsc --noEmit && vite build`

---

*End of Customer-Web Module Deep Code Review — Reverse-engineered from full source scan of `/modules/customer-web/`*
