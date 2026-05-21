# Vendor Portal — Frontend Implementation Plan

> **Stack**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Shadcn/ui + React Router 7 + TanStack Query + Zustand  
> **Target**: Web-first responsive SPA (desktop + tablet + mobile)

---

## 1. Project Structure

```
vendor-portal-webapp/
├── public/
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── app/
│   │   ├── App.tsx               # Root — providers + router mount
│   │   ├── main.tsx              # Vite entry
│   │   ├── router.tsx            # All route definitions
│   │   └── providers.tsx         # QueryClient, ThemeProvider, Toaster
│   │
│   ├── components/
│   │   ├── ui/                   # Shadcn primitives (button, card, badge, dialog, input, select, table, tabs, sheet, tooltip, etc.)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx      # Sidebar + TopBar + content area
│   │   │   ├── Sidebar.tsx       # 8-tab nav (collapsible on desktop)
│   │   │   ├── TopBar.tsx        # Vendor name, notification bell, profile menu
│   │   │   ├── MobileNav.tsx     # Bottom bar (5 items + "More" sheet for rest)
│   │   │   └── PageHeader.tsx    # Page title + breadcrumbs
│   │   └── shared/
│   │       ├── StatusBadge.tsx   # Color-coded status pills
│   │       ├── SLACountdown.tsx  # mm:ss countdown timer
│   │       ├── FileUpload.tsx    # Drag-drop with preview
│   │       ├── DataTable.tsx     # Sortable, filterable, paginated table
│   │       ├── FilterBar.tsx     # Status + date range filter row
│   │       ├── EmptyState.tsx    # Illustration + message
│   │       ├── LoadingSkeleton.tsx
│   │       ├── ConfirmDialog.tsx # "Are you sure?" modal
│   │       ├── CurrencyDisplay.tsx # ₹ formatting
│   │       └── AuditTimeline.tsx # Timestamped event log
│   │
│   ├── features/                 # One folder per tab — each has components/, pages/, hooks/
│   │   ├── home/
│   │   ├── sourcing/
│   │   ├── contracts/
│   │   ├── trips/
│   │   ├── expenses/
│   │   ├── fleet/
│   │   ├── invoices/
│   │   └── profile/
│   │
│   ├── hooks/                    # Global hooks (useAuth, useDebounce, useMediaQuery)
│   ├── services/                 # API clients and service functions
│   ├── utils/                    # App-specific utilities
│   ├── stores/                   # Zustand (auth, ui, notifications)
│   ├── types/                    # TypeScript interfaces per feature + common.types.ts
│   └── styles/
│       └── globals.css           # Tailwind directives + custom tokens
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 2. Navigation & Routing

### Desktop: Left sidebar (collapsible) with 8 nav items  
### Mobile: Bottom bar with 5 items (Home, Trips, Expenses, Invoices, More → sheet with Sourcing, Contracts, Fleet, Profile)

### Route Map

| Route | Page | Tab |
|-------|------|-----|
| `/home` | Dashboard | Home |
| `/sourcing` | Sourcing tabs (RFI / RFQ / Auctions) | Sourcing |
| `/sourcing/rfi/:id` | RFI detail + response form | Sourcing |
| `/sourcing/rfq/:id` | RFQ detail + quote form | Sourcing |
| `/sourcing/auctions/:id` | Auction detail / live bid room | Sourcing |
| `/contracts` | Contract list | Contracts |
| `/contracts/:id` | Contract detail + sign | Contracts |
| `/trips` | Trip sub-tabs (Indents / Active / Completed) | Trips |
| `/trips/indents/:id` | Indent detail + accept/decline | Trips |
| `/trips/active/:id` | Active trip detail | Trips |
| `/trips/completed/:id` | Completed trip detail | Trips |
| `/expenses` | Expense list | Expenses |
| `/expenses/add/:tripId` | Add expense for a trip | Expenses |
| `/expenses/:id` | Expense detail | Expenses |
| `/fleet` | Fleet sub-tabs (Vehicles / Drivers / Capacity) | Fleet |
| `/fleet/vehicles/add` | Add vehicle form | Fleet |
| `/fleet/vehicles/:id` | Vehicle detail + compliance docs | Fleet |
| `/fleet/drivers/add` | Add driver form | Fleet |
| `/fleet/drivers/:id` | Driver detail + compliance docs | Fleet |
| `/invoices` | Invoice sub-tabs (Create / My Invoices / Ledger) | Invoices |
| `/invoices/create` | Create invoice wizard | Invoices |
| `/invoices/:id` | Invoice detail | Invoices |
| `/profile` | Profile sub-tabs (Company / Bank) | Profile |

---

## 3. Design System

### Colors (Status Mapping — used consistently across ALL tabs)
- 🟢 **Green**: ACTIVE, APPROVED, COMPLIANT, PAID, AWARDED, RESPONDED, DELIVERED
- 🔵 **Blue**: SUBMITTED, QUOTE_SUBMITTED, DISPATCHED, IN_TRANSIT
- 🟡 **Amber**: PENDING, INVITED, UPCOMING, AWAITING_VENDOR_SIGNATURE
- 🔴 **Red**: REJECTED, EXPIRED, TERMINATED, BLOCKED, NOT_AWARDED
- ⚪ **Gray**: DRAFT, CLOSED, INACTIVE, INVOICED

### Typography
- Font: **Inter** (headings + body), **JetBrains Mono** (IDs, amounts, reference numbers)
- Base size: 14px

### Shared Component Behaviors
- **StatusBadge**: Renders colored pill with status text. Single `statusColorMap` object drives all colors.
- **SLACountdown**: Takes a `deadline: ISO string`, renders live mm:ss countdown. Turns red when < 30 min.
- **DataTable**: Wraps TanStack Table. Supports server-side pagination, column sorting, row click navigation.
- **FileUpload**: Drag-drop zone, accepts images + PDF, shows thumbnail preview, max 5MB per file.
- **CurrencyDisplay**: Formats number as `₹1,23,456.00` (Indian locale).

---

## 4. Tab 1 — Home (Dashboard)

### Page: `DashboardPage.tsx`
Responsive grid of 6 widgets. Each widget is tappable → deep-links to relevant tab.

### Widgets

| Widget | Shows | Taps To |
|--------|-------|---------|
| **Pending Indents** | Count + top 3 with SLA countdown | `/trips?tab=indents` |
| **Open Sourcing** | Breakdown: X RFIs · Y RFQs · Z Auctions | `/sourcing` |
| **Contracts Awaiting Signature** | Count + contract IDs | `/contracts?status=AWAITING_VENDOR_SIGNATURE` |
| **Uninvoiced Bookings** | Count + total billable ₹ amount | `/invoices/create` |
| **Invoice Payment Status** | Segmented bar: Submitted / Approved / Rejected / Paid | `/invoices?tab=list` |
| **Notification Feed** | Last 10 unread notifications + "View All" | Notification history |

### Behavior
- Auto-refresh every 30s
- SLA countdowns are client-side timers synced from server timestamps
- Notification feed: each row has icon + message + relative time ("2 min ago")

---

## 5. Tab 2 — Sourcing

### Layout: 3 sub-tabs — RFI | RFQ | Auctions

### 5.1 RFI

**List View** — Table with filters (INVITED / RESPONDED / CLOSED)  
Columns: RFI ID, Customer, Lane, Vehicle Type, Deadline, Status

**Detail View** — `/sourcing/rfi/:id`
- Lane details card (origin → destination, vehicle type, volume estimates)
- **Response form** (when INVITED):
  - Capacity availability: Available / Partially Available / Not Available
  - Indicative rate range: Min ₹ — Max ₹
  - Notes (optional)
  - Submit button → status becomes RESPONDED
- After submission: read-only confirmation view
- Customer follow-up section (if any)

### 5.2 RFQ

**List View** — Table with filters (INVITED / QUOTE_SUBMITTED / QUOTE_REVISED / AWARDED / NOT_AWARDED / EXPIRED)  
Columns: RFQ ID, Customer, Lane, Vehicle Type, Deadline, Status  
AWARDED rows: green highlight | NOT_AWARDED: muted

**Detail View** — `/sourcing/rfq/:id`
- Lane + volume + requirements card
- **Quote form** (when INVITED or revision allowed):
  - Rate per unit (₹)
  - Vehicle type selection
  - Validity period (date range picker)
  - Notes
  - Submit / Revise Quote button
  - After deadline: form disabled, "Deadline Passed" notice
- **Quote history**: table of all quotes/revisions with timestamps (audit)
- **Award outcome**: AWARDED or NOT_AWARDED badge with date

### 5.3 Auctions

**List View** — Table with filters by Status (UPCOMING / LIVE / CLOSED) and Type (Reverse / Spot / Lot / Bulk)  
Columns: Auction ID, Type Badge, Customer, Lane, Start Time, Status  
LIVE auctions: pulsing red dot indicator

**Auction Detail / Live Room** — `/sourcing/auctions/:id`

- Header: auction type badge, status, customer, lane details
- **Timer component**: Countdown to end. On EXTENDED → timer resets with flash animation
- **Bid panel** (only when LIVE / EXTENDED):
  - Current best bid display
  - Bid input with validation rules (e.g., reverse auction = must be lower)
  - "Place Bid" button → confirmation dialog → submit
  - "Revise Bid" option
- **Bid history**: immutable timestamped table of all bids by this vendor (audit per P5)
  - Columns: Amount, Time, Status (Active / Revised / Superseded)
- **Outcome** (when CLOSED): AWARDED or NOT_AWARDED badge, link to contract if awarded

**Real-time**: WebSocket for live state updates (bid changes, timer extensions). Fallback: 3s polling.

---

## 6. Tab 3 — Contracts

### List View — `/contracts`
- Filters: All / AWAITING_VENDOR_SIGNATURE / ACTIVE / EXPIRED / TERMINATED / AMENDED
- Search: by contract ID or customer name
- Columns: Contract ID, Customer, Lane Summary, Validity Period, Status
- Row click → `/contracts/:id`

### Detail View — `/contracts/:id`

Sections rendered as collapsible cards:

| Section | Content |
|---------|---------|
| **Lane Details** | Origin → Destination, route, distance |
| **Rate Card** | Table: Vehicle Type, Rate (per trip/km), Surcharges |
| **Volume** | Allocated volume, frequency |
| **Payment Terms** | Credit period (days), billing cycle |
| **SLA Clauses** | Placement SLA, Delivery SLA values |
| **Penalty Clauses** | Table: Breach Type, Penalty Amount/%, Description |
| **Duration** | Start → End date, renewal terms |
| **Amendment History** | Timeline: date, change description, before/after values (if AMENDED) |

### Actions
- **Sign Digitally** (when AWAITING_VENDOR_SIGNATURE): confirmation dialog → signs → status becomes ACTIVE
- **Download PDF**: available on all statuses
- **Expiry Alert**: amber banner when within 30 days of expiry

---

## 7. Tab 4 — Trips

### Layout: 3 sub-tabs — Indent Requests | Active Trips | Completed Trips

### 7.1 Indent Requests

**List View**
- Each indent rendered as a **card** (not table row) for better mobile UX
- Card shows: Contract ref, Lane (pickup → delivery), Load details, Vehicle type, Reporting date, **SLA countdown timer**
- Actions per card: **Accept** | **Decline**

**Indent Detail** — `/trips/indents/:id`
- Full indent info: contract reference, lane, load (commodity, weight, volume), vehicle type, required reporting date/time
- SLA metrics displayed: Time to Accept deadline
- **Accept flow**:
  1. Click "Accept"
  2. **Vehicle nomination** dropdown — shows only COMPLIANT + AVAILABLE vehicles from Fleet (enforces BR-06)
  3. **Driver nomination** dropdown — shows only COMPLIANT + ACTIVE drivers with matching license class (enforces BR-07)
  4. Estimated reporting time (datetime picker)
  5. Confirm → indent accepted, vehicle + driver assigned
- **Decline flow**: Click "Decline" → reason input (required) → confirm

### 7.2 Active Trips

**List View** — Cards showing:
- Trip ID, Contract/Indent ref
- Assigned vehicle + driver
- Current status badge: Dispatched / In Transit / At Delivery / Exception
- ETA milestone (if exposed)

**Detail View** — `/trips/active/:id`
- Trip header: ID, status, vehicle, driver
- Status timeline: Dispatched → In Transit → At Delivery
- Exceptions summary (delays, deviations, incidents) — read-only
- Delivery status progress
- **No access** to internal control tower or other vendor data (P1)

### 7.3 Completed Trips

**List View** — Table:
- Columns: Trip ID, Lane, Delivered Date, POD Status, Freight Rate, Expense Total, Invoiced (Yes/No badge)
- Filter: Invoiced / Uninvoiced

**Detail View** — `/trips/completed/:id`
- Trip details + delivered date
- POD confirmation status + reference
- Freight rate (from contract rate card)
- Expense summary: total approved expenses for this trip
- Invoiced flag
- **Action buttons**:
  - "Add Expenses" → navigates to `/expenses/add/:tripId` (only if POD confirmed, enforces BR-01)
  - "View Expenses" → filtered expenses list for this trip

---

## 8. Tab 5 — Expenses

### List View — `/expenses`
- **Summary bar** at top: Total Approved & Uninvoiced = ₹XX,XXX (the billable amount)
- Filters: All / PENDING / APPROVED / REJECTED + date range + trip reference search
- Columns: Trip ID, Expense Type, Amount (₹), Status, Submitted Date
- Row click → expense detail

### Add Expense — `/expenses/add/:tripId`

**Pre-condition check**: Page first validates that the linked trip is DELIVERED with POD confirmed. If not → error screen: "Expenses can only be submitted for delivered trips with confirmed POD" (BR-01).

**Form** (can add multiple line items before submitting):
- Each line item:
  - Expense Type: dropdown (Toll / Detention / Loading-Unloading / Weighbridge / Other)
  - Amount: ₹ input
  - Description: optional text
  - Supporting Document: file upload (receipt image or PDF)
- "Add Another" button to add more lines
- Review all lines → "Submit for Approval" button
- On submit: all lines get status=PENDING

### Expense Detail — `/expenses/:id`
- Trip reference (linked, clickable)
- Expense type, amount, description
- Supporting document preview (image viewer or PDF viewer)
- Status badge + status history timeline
- Rejection reason (if REJECTED)

### Status Rules
- PENDING: submitted, awaiting customer review
- APPROVED: approved by customer, available for invoicing
- REJECTED: rejected with reason, cannot be invoiced

---

## 9. Tab 6 — Fleet

### Layout: 3 sub-tabs — Vehicles | Drivers | Capacity Declaration

### 9.1 Vehicles

**List View** — Table:
- Columns: Reg Number, Vehicle Type, Base Location, Operational Status, Compliance Status (🟢/🟡/🔴), GPS Device
- Compliance Status indicators:
  - 🟢 All docs valid
  - 🟡 Any doc expiring within 30 days
  - 🔴 Any doc expired → vehicle **blocked** from indent nomination (BR-06)
- Row click → vehicle detail

**Add Vehicle** — `/fleet/vehicles/add`
- Form: Registration Number, Vehicle Type (dropdown), Base Location, GPS Device ID (optional)
- Compliance document uploads (all with expiry date picker):
  - Insurance
  - Fitness Certificate
  - Permit (National/State)
  - PUC Certificate
- On save: compliance status auto-calculated from expiry dates

**Vehicle Detail** — `/fleet/vehicles/:id`
- All vehicle fields (editable)
- Compliance documents section: table with Doc Type, Upload Date, Expiry Date, Status (Valid/Expiring/Expired), actions (View/Replace)
- "Renew" button per document → re-upload with new expiry
- Operational status toggle: Active / Inactive / Under Maintenance
- Blackout dates: date range picker for temporary unavailability

### 9.2 Drivers

**List View** — Table:
- Columns: Name, Mobile, License Number, License Expiry, License Class, Compliance Status, Current Status (Active/Inactive/Blocked)
- Same 🟢/🟡/🔴 compliance logic as vehicles

**Add Driver** — `/fleet/drivers/add`
- Form: Name, Mobile, License Number, License Expiry (date), License Class (multi-select: vehicle categories)
- Compliance doc uploads:
  - Driving License (with expiry)
  - Medical Certificate (with expiry)
  - Driver Badge (if required)

**Driver Detail** — `/fleet/drivers/:id`
- All driver fields (editable: name, mobile, contact)
- Compliance documents section (same pattern as vehicles)
- Current status management

### 9.3 Capacity Declaration

**Page** — `/fleet/capacity`
- Table of current declarations with inline editing
- Each row: Vehicle Type, Available Quantity, Base Operating Hubs (multi-select), Blackout Dates
- "Add Declaration" button to add new vehicle type row
- Save button per row or bulk save
- Changes reflected immediately (feeds into sourcing pool)

---

## 10. Tab 7 — Invoices

### Layout: 3 sub-tabs — Create Invoice | My Invoices | Ledger

### 10.1 Create Invoice — `/invoices/create`

**Step-by-step wizard (3 steps)**:

**Step 1 — Select Bookings**
- System shows all uninvoiced completed trips (POD confirmed + at least one APPROVED expense or applicable freight rate)
- Already-invoiced trips are hidden (BR-05)
- Checkbox per trip to select for inclusion
- Must select at least 1 booking (BR-04)
- Trip row shows: Trip ID, Lane, Delivered Date, Freight Rate, Approved Expenses Total

**Step 2 — Review Line Items**
- Per selected booking, auto-populated breakdown:
  - Freight Charge (from contract rate card)
  - Expense: Toll (approved amount)
  - Expense: Detention (approved amount)
  - Expense: Loading/Unloading (approved amount)
  - Expense: Other (approved amount)
  - **Line Total** = Freight + All Approved Expenses
- Invoice totals:
  - Subtotal (sum of all line totals)
  - GST (auto-calculated)
  - **Grand Total** = Subtotal + GST
- Invoice-level notes field (optional)
- Vendor GSTIN (from profile, read-only) and Customer GSTIN (from contract, read-only)

**Step 3 — Confirm & Submit**
- Review summary: invoice date (auto), billing period, payment due date (from contract payment terms)
- "Submit Invoice" button → confirmation dialog
- On submit:
  - Invoice number generated (system)
  - Invoice status = SUBMITTED
  - All selected trips marked INVOICED
  - Dashboard Uninvoiced Bookings count decreases

### 10.2 My Invoices — `/invoices?tab=list`

**List View** — Table:
- Filters: All / SUBMITTED / APPROVED / REJECTED / PAID
- Columns: Invoice Number, Date, Total Amount (₹), Bookings Count, Status
- Row click → invoice detail

**Invoice Detail** — `/invoices/:id`
- Header: invoice number, date, status badge, total amount
- Booking references included (linked to trip details)
- Freight breakup per booking
- Expense breakup per booking
- GST details
- Payment status + payment date (when paid)
- "Download PDF" button

### 10.3 Ledger — `/invoices?tab=ledger`

**Full financial history table**:
- Columns: Date, Entry Type, Description, Credit (₹), Debit (₹), Running Balance

Entry types:
| Entry | Type |
|-------|------|
| Invoice Approved | Credit |
| Payment Received | Credit |
| SLA Penalty Deduction | Debit |
| Other Deduction | Debit |
| TDS Deduction | Debit |

**Downloadable documents**:
- Payment Advice (per payment entry) — PDF download button
- TDS Certificate (per applicable period) — PDF download button

---

## 11. Tab 8 — Profile

### Layout: 2 sub-tabs — Company Info | Bank Details

### 11.1 Company Information — `/profile?tab=company`
- Editable form:
  - Trading Name, Legal Name
  - Registered Address (street, city, state, pin)
  - GSTIN, PAN
  - Primary Contact: name, phone, email
  - Service Regions (multi-select)
  - Supported Vehicle Types (multi-select)
- Save button → changes may trigger re-verification (info banner)

### 11.2 Bank Details — `/profile?tab=bank`
- Editable form:
  - Bank Name, Branch
  - Account Number (masked in display, editable in edit mode)
  - IFSC Code
  - Account Type (Savings/Current)
  - Supporting Document: upload cancelled cheque or bank letter
- Save → may trigger re-verification (info banner)

---

## 12. Business Rules — Frontend Enforcement Summary

| Rule | Where Enforced | How |
|------|---------------|-----|
| **BR-01** | Expenses → Add | "Add Expense" only enabled on trips with DELIVERED status + POD confirmed |
| **BR-02** | Invoices → Create | Only trips with APPROVED expenses or freight rate shown in booking list |
| **BR-04** | Invoices → Create | "Submit Invoice" button disabled until ≥1 booking selected |
| **BR-05** | Invoices → Create | Already-invoiced bookings excluded from the selection list |
| **BR-06** | Trips → Indent Accept | Vehicle dropdown filters out non-compliant + already-assigned vehicles |
| **BR-07** | Trips → Indent Accept | Driver dropdown filters out expired-license, inactive, blocked drivers |
| **BR-08** | Global | SUSPENDED vendors: banner shown, accept indent + sourcing actions disabled |
| **BR-09** | Global | BLACKLISTED vendors: restricted read-only view with info banner |
| **P1** | Global | All data scoped by auth token; no cross-vendor data possible |
| **P5** | Sourcing, Trips | Bid history, quote history, indent acceptance — immutable audit timelines |

---

## 13. Implementation Phases

### Phase 1 — Foundation (Week 1-2)
- [ ] Vite + React + TypeScript project setup
- [ ] Tailwind CSS + Shadcn/ui installation and theme config
- [ ] Design tokens (colors, typography, spacing)
- [ ] AppShell layout: Sidebar, TopBar, MobileNav, PageHeader
- [ ] Routing setup with all routes (empty page stubs)
- [ ] Auth flow: login page, auth guard, token management
- [ ] Shared components: StatusBadge, DataTable, FilterBar, EmptyState, LoadingSkeleton, FileUpload, ConfirmDialog, SLACountdown, CurrencyDisplay
- [ ] API client setup (Axios instance, interceptors)
- [ ] Zustand stores: auth, ui

### Phase 2 — Core Operations (Week 3-5)
- [ ] **Home** — Dashboard with all 6 widgets + notification feed
- [ ] **Trips** — Indent requests (list + detail + accept/decline + vehicle/driver nomination)
- [ ] **Trips** — Active trips (list + detail)
- [ ] **Trips** — Completed trips (list + detail)
- [ ] **Fleet** — Vehicles (list + add + detail + compliance docs)
- [ ] **Fleet** — Drivers (list + add + detail + compliance docs)
- [ ] **Fleet** — Capacity declaration

### Phase 3 — Financial Flow (Week 6-7)
- [ ] **Expenses** — List with filters + summary bar
- [ ] **Expenses** — Add expense form (multi-line with document upload)
- [ ] **Expenses** — Detail view with status tracking
- [ ] **Invoices** — Create invoice wizard (3-step)
- [ ] **Invoices** — My invoices list + detail + PDF download
- [ ] **Invoices** — Ledger view with downloadable documents

### Phase 4 — Commercial (Week 8-9)
- [ ] **Sourcing** — RFI list + detail + response form
- [ ] **Sourcing** — RFQ list + detail + quote form + revision
- [ ] **Sourcing** — Auction list + detail + live bid room + WebSocket
- [ ] **Contracts** — List with filters + search
- [ ] **Contracts** — Detail with all sections + digital signature + PDF download

### Phase 5 — Profile & Polish (Week 10)
- [ ] **Profile** — Company information form
- [ ] **Profile** — Bank details form
- [ ] **Profile** — Notification preferences matrix
- [ ] Global: vendor status guards (SUSPENDED / BLACKLISTED banners)
- [ ] Responsive QA across breakpoints
- [ ] Loading states, error boundaries, empty states for every page
- [ ] Accessibility pass (keyboard nav, screen reader, focus management)
- [ ] Performance optimization (code splitting per feature, lazy loading)

---

## 14. Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| **State** | TanStack Query for server data, Zustand for client | Separation of concerns; TanStack handles caching/refetch automatically |
| **Forms** | React Hook Form + Zod | Performant (no re-renders), schema validation, TypeScript integration |
| **Tables** | TanStack Table (headless) | Full control over rendering, server-side pagination built-in |
| **Navigation** | Sidebar (desktop) + Bottom bar (mobile) | 8 tabs too many for bottom bar alone; hybrid approach |
| **Auction real-time** | WebSocket with 3s polling fallback | Critical for live bidding; polling as degraded fallback |
| **PDF download** | Server-generated PDFs, browser download | Contracts and invoices need server-rendered PDF; frontend just triggers download |
| **File upload** | react-dropzone + presigned URL upload | Files go to object storage via presigned URLs, reducing backend load |
| **Auth** | JWT in httpOnly cookie | Secure; prevents XSS token theft |

---

## 15. Mock Data Strategy

Until backend APIs are ready, all features will use **MSW (Mock Service Worker)** to intercept network calls and return realistic mock data. This allows full frontend development and testing in parallel with backend.

Each feature folder can optionally include a `mocks/` folder with handlers:
```
features/trips/mocks/
├── handlers.ts      # MSW request handlers
└── data.ts          # Mock data generators
```

---

*End of Implementation Plan*

Dummy.
