# TMS Module — Complete Deep Code Review
**Module:** `/modules/tms/`
**Scan Date:** 2026-06-03
**Analyst:** Senior Product Architect + Business Analyst + QA Lead + Frontend Engineer

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Route Hierarchy](#2-route-hierarchy)
3. [Screen Inventory](#3-screen-inventory)
4. [Feature Inventory](#4-feature-inventory)
5. [Booking Lifecycle (24 Statuses)](#5-booking-lifecycle-24-statuses)
6. [Reassignment & Breakdown Lifecycle](#6-reassignment--breakdown-lifecycle)
7. [Destination Change Workflow](#7-destination-change-workflow)
8. [Form Analysis](#8-form-analysis)
9. [API Catalog](#9-api-catalog)
10. [State Management](#10-state-management)
11. [RBAC Matrix](#11-rbac-matrix)
12. [Business Rules Catalog](#12-business-rules-catalog)
13. [Dependency Matrix](#13-dependency-matrix)
14. [Edge Cases](#14-edge-cases)
15. [Hidden Features & Technical Debt](#15-hidden-features--technical-debt)
16. [Missing Features Report](#16-missing-features-report)

---

## 1. Architecture Overview

### Problem Domain
Full-lifecycle Transportation Management System covering road freight from booking creation through rate approval, vehicle/driver assignment, loading, dispatch, in-transit tracking, POD capture, and invoice generation.

Supports:
- **Commercial types:** Contract, Spot
- **Service types:** FTL (Full Truck Load), PTL (Part Truck Load)
- **Rate types:** PER_TRIP, PER_KM, PER_MT
- **Multi-delivery bookings** (chained deliveries within one booking)
- **LR (Lorry Receipt) management** — manual, pre-generated, auto
- **Destination change requests** with approval workflow
- **Breakdown & vehicle replacement** handling
- **Vendor and own-fleet** management

### Main User Personas

| Persona | Key Responsibilities |
|---|---|
| Platform Admin | Full access, all tenants |
| Tenant Admin | Full access for own tenant |
| Operations Manager / Region Manager | Rate approval, destination change approval, assignment oversight |
| Dispatcher | Assignment queue, vehicle/driver assignment |
| Finance User | Invoice creation, margin visibility |
| Customer | Raise destination change requests, view booking status |
| Vendor | Respond to vehicle replacement requests |

### Provider Stack (nesting order)
```
AuthProvider (shared-auth)
  └── BrowserRouter
        └── ThemeProvider
              └── SessionProvider
                    └── MockStoreProvider
                          └── Routes / Pages
```

### Module Entry
- Base route: `/tenant/:tenantId/bookings`
- Demo credentials: `tracking@optimile.com / testing`, `tms@optimile.com / testing`
- Session default actor: `platform_admin` (hardcoded)

### Upstream Dependencies
- Customer master (customers, addresses, rate cards, materials)
- Vendor master (vendors, vendor rate cards)
- Fleet master (vehicles, drivers, vehicle types)
- LR pool management (LR configs, LR pools)
- UOM definitions & mappings

### Downstream Impacts
- Finance module (invoice generation post-POD)
- Track & Trace module (live tracking post-dispatch)
- LR allocation (assigned on booking)
- Audit log (every action logged)

---

## 2. Route Hierarchy

```
/
└── /tenant/:tenantId                          ← BookingLayout
    ├── /bookings                              ← BookingListPage (Kanban pipeline)
    ├── /bookings/create                       ← CreateBookingPage
    ├── /bookings/rate-approval                ← RateApprovalQueuePage
    ├── /bookings/assignment                   ← AssignmentQueuePage
    ├── /bookings/live-tracking                ← LiveTrackingPlaceholderPage  [STUB]
    ├── /bookings/completed                    ← PODCompletedPage
    ├── /bookings/:bookingId/edit              ← CreateBookingPage (edit mode)
    ├── /bookings/:bookingId/documents         ← BookingDocumentsPage
    ├── /bookings/:bookingId/lr                ← BookingLRViewPage
    ├── /bookings/:bookingId                   ← BookingDetailsPage
    └── /*                                     ← Redirect → /tenant/:tenantId/bookings

Default: / → /tenant/:tenantId/bookings
```

**Dynamic Params:**
- `tenantId` — scopes all data
- `bookingId` — normalized via `normalizeBookingId()` (trim + lowercase)

---

## 3. Screen Inventory

### Screen 1: BookingListPage — `/bookings`

**Purpose:** Kanban pipeline dashboard showing all bookings organized by status column.

#### Pipeline Columns (9)

| Key | Label | Internal Statuses Shown |
|---|---|---|
| `erp` | ERP Bookings | *(empty — future ERP integration)* |
| `draft` | Draft | DRAFT |
| `approval` | Rate Approval | PENDING_RATE_APPROVAL |
| `assignment` | Assignment | PENDING_ASSIGNMENT |
| `transit` | In Transit | IN_TRANSIT |
| `pod` | POD Pending | POD_PENDING |
| `completed` | Completed | COMPLETED |
| `invoiced` | Invoiced | INVOICED |
| `exception` | Exception | EXCEPTION |
| `cancelled` | Cancelled | CANCELLED |

#### Filters
- **Full-text search:** `bookingId`, `customerName`, `cities`, `driverName`, `vehicleLabel`
- **Customer dropdown:** from admin sources
- **Date range:** `fromDate` / `toDate` on `createdAt`
- **Pipeline column tab** (status filter)

#### Actions
- **Create Booking** — gated: `access.hasFeaturePermission("TMS", "CREATE_BOOKING", "create")`
- Click card → navigate to `/bookings/:bookingId`
- Switch pipeline column → `setSelectedPipelineKey`

#### Conditional Badges
- `EDITED_BOOKING` — `destinationChangeRequests` has status in `[SUBMITTED, UNDER_REVIEW, APPROVED]`
- `DESTINATION_REVISED` — any delivery has `revisions.length > 0`

#### Pagination
8 items per page per column

#### Data Transformations
- `buildCustomerLookup()` → `Map<customerId, TenantCustomer>`
- `buildAddressLookup()` → `Map<addressId, TenantCustomerAddress>`
- `buildDriverLookup()` → `Map<driverId, TenantDriver>`
- `getPrimaryBookingStatus()` — collapses 24 internal → 9 pipeline statuses

---

### Screen 2: CreateBookingPage — `/bookings/create` & `/bookings/:id/edit`

**Purpose:** Create new booking or edit draft. Edit mode detected by presence of `bookingId` in URL.

**See full form analysis in [Section 8](#8-form-analysis).**

#### Key Actions
- `+ Add Delivery` — chains from previous destination
- `Remove` — shown only if `deliveries.length > 1`
- `Save Draft` → persists with status `DRAFT`
- `Submit Booking` → status determined by `evaluateInitialBookingStatus()`
  - CONTRACT + deviation ≥ 5% → `PENDING_RATE_APPROVAL`
  - Otherwise → `PENDING_ASSIGNMENT`

#### Rate Auto-Lookup
- Debounced 300ms
- Triggers on: `commercialType`, `deliveries`, `customerId`, `pickupDate` change
- Tries `candidateRateTypes` in order, returns first match
- UOM conversion for PER_MT using material mapping

---

### Screen 3: BookingDetailsPage — `/bookings/:bookingId`

**Purpose:** Core operational hub. Displays full booking, executes all workflow transitions. **~3,663 lines — largest page in the module.**

#### Tab Structure
- `Deliveries` tab (default)
- Per-delivery workspace tabs:
  - Delivery details
  - LR assignment/usage
  - POD capture
  - Remarks/Timeline
  - Revision history

#### Conditional Action Buttons

| Button | Enabling Condition | Permission |
|---|---|---|
| Assign Vehicle | `!assignment && status in PENDING_ASSIGNMENT range` | `BOOKING_DETAIL / CHANGE_ASSIGNMENT` |
| Reassign | `canChangeAssignment` | `BOOKING_DETAIL / CHANGE_ASSIGNMENT` |
| Replace Vehicle | `canReplaceVehicle` | `BOOKING_DETAIL / REPLACE_VEHICLE` |
| Handle Breakdown | Active assignment + breakdown condition | `BOOKING_DETAIL / HANDLE_VEHICLE_BREAKDOWN` |
| Start Loading | `status in [VEHICLE_ASSIGNED, ASSIGNED] && !loadingStarted` | `START_LOADING` |
| Capture POD | `status === POD_PENDING` | — |
| Cancel Booking | `!loadingStarted && canCancelBooking(status)` | — |
| Raise Dest. Change | `canRaiseDestinationChange` | Role regex check |
| Approve Dest. Change | `canApproveDestinationChange` | Role regex check |
| Dispatch Trip | Always rendered | **DISABLED — stub** |
| Complete Trip | Always rendered | **DISABLED — stub** |

#### `canRaiseDestinationChange` Logic
`currentUser.userType === "CUSTOMER"` OR role matches `/operations manager|...|region manager/i`

#### `canApproveDestinationChange` Logic
Role matches `/operations manager|...|region manager/i`

#### Derived Booleans
- `loadingStarted` — `loadingStartedAt` exists OR timeline contains loading event
- `loadingCompleted` — `loadingCompletedAt` exists OR timeline contains loaded event
- `allDeliveryPodsCaptured` — all deliveries have `pod.podUploaded = true`
- `bookingRevisionEnabled` — `destinationChangeRequests` in `[SUBMITTED, UNDER_REVIEW, APPROVED]`
- `bookingRevised` — any delivery has `revisions.length > 0`

---

### Screen 4: RateApprovalQueuePage — `/bookings/rate-approval`

**Purpose:** Review and approve/reject bookings with freight rate deviations.

**Queue filter:** `status === "PENDING_RATE_APPROVAL"`

#### Summary Cards
- Pending count
- Manager-level approvals needed
- HO-level approvals needed
- Average absolute deviation %

#### Table Columns

| Column | Data |
|---|---|
| Booking | `bookingId` + `createdAt` |
| Customer | Customer name |
| Commercial | `Rs {freight}` + rate type |
| Deviation | Badge: `>10%` → warning, else accent |
| Approval Level | `AUTO` / `MANAGER` / `HO` |
| Status | `BookingStatusBadge` |
| Actions | Approve / Reject / View |

#### Action Guards
- **Approve:** `access.can("RATE_APPROVAL", "APPROVE_RATE")`
- **Reject:** `access.can("RATE_APPROVAL", "REJECT")`

#### Flows
- **Approve:** Prompt remark → `transitionBooking(status="PENDING_ASSIGNMENT")`
- **Reject:** Prompt remark → `transitionBooking(status="DRAFT")`

---

### Screen 5: AssignmentQueuePage — `/bookings/assignment`

**Purpose:** Assign vehicle, driver, vendor, and LR to pending bookings.

**Queue filter:** `status === "PENDING_ASSIGNMENT"`

#### Summary Cards
- Pending count
- Active vehicles count
- Active drivers count

#### Badges on Booking Cards
- `EDITED_BOOKING` — DCR in `[SUBMITTED, UNDER_REVIEW, APPROVED]`
- `DESTINATION_REVISED` — any delivery has revisions

#### Assignment Dialog — See [Section 8](#8-form-analysis)

#### Vendor Freight Auto-Lookup
1. Filter `vendorRateCards` by `vendorId`
2. Validate against `source/destination/vehicleType`
3. Try: `[booking.rateType, "PER_MT", "PER_TRIP", "PER_KM"]`
4. Calculate freight by rate type
5. Set `vendorFreightSource = "RATE_CARD"` or `"MANUAL"`

#### Assignment Payload
```
{
  vendorId, vendorName,
  vehicleId, vehicleLabel (with "(OWN)" or "(Vendor: ...)" suffix),
  driverId, driverName,
  vendorFreight, vendorRateCardId, vendorRateType, vendorContractSource,
  customerFreight, sellingRateLabel, buyingRateLabel,
  marginAmount, marginPercent,
  actor, orgUnitId, actorUserId,
  lrType: "AUTO" | "MANUAL",
  lrConfigId, preferredLrNumber,
  manualLrPoolPreference: "PRE_GENERATED" | "GENERAL"
}
```

---

### Screen 6: BookingDocumentsPage — `/bookings/:id/documents`
Displays and manages booking-level documents (LR, POD, compliance docs).

### Screen 7: BookingLRViewPage — `/bookings/:id/lr`
Displays LR pool assignments and usage for a specific booking.

### Screen 8: PODCompletedPage — `/bookings/completed`
List view of bookings with `status in [COMPLETED, INVOICED]` and captured POD.

### Screen 9: LiveTrackingPlaceholderPage — `/bookings/live-tracking`
> **STUB — Not implemented.** Route exists, navigation item exists, but page is a placeholder with no functional content.

---

## 4. Feature Inventory

| # | Feature | Status | Location |
|---|---|---|---|
| F-01 | Booking creation (FTL/PTL, Contract/Spot) | Live | CreateBookingPage |
| F-02 | Multi-delivery booking | Live | CreateBookingPage |
| F-03 | Rate auto-lookup (customer rate cards) | Live | booking-selectors.ts |
| F-04 | Rate deviation detection & approval routing | Live | booking-engine.ts |
| F-05 | Rate approval queue (Manager / HO) | Live | RateApprovalQueuePage |
| F-06 | Vehicle / driver / vendor assignment | Live | AssignmentQueuePage |
| F-07 | LR allocation (Manual / Pre-generated / Auto) | Live | AssignmentQueuePage |
| F-08 | Vendor freight auto-lookup | Live | booking-selectors.ts |
| F-09 | Margin calculation & display | Live | AssignmentQueuePage |
| F-10 | Booking Kanban pipeline view | Live | BookingListPage |
| F-11 | Vehicle reassignment (4 types) | Live | BookingDetailsPage |
| F-12 | Vehicle breakdown handling | Live | BookingDetailsPage |
| F-13 | Vehicle replacement workflow (vendor / internal) | Live | BookingDetailsPage |
| F-14 | Destination change request (raise / approve / implement) | Live | BookingDetailsPage |
| F-15 | Delivery revision with impact preview | Live | destination-change.ts |
| F-16 | POD capture per delivery | Live | BookingDetailsPage |
| F-17 | Delivery remark types (12 types) | Live | BookingDetailsPage |
| F-18 | Loading start / complete tracking | Live | BookingDetailsPage |
| F-19 | Booking status stepper / timeline | Live | BookingDetailsPage |
| F-20 | Address creation inline (from booking form) | Live | CreateBookingPage |
| F-21 | UOM conversion (KG/MT/LB) | Live | booking-selectors.ts |
| F-22 | Audit logging (every action) | Live | useAppStore |
| F-23 | Booking cancellation | Live | BookingDetailsPage |
| F-24 | Delay detection (18h threshold) | Live | booking-engine.ts |
| F-25 | Own-fleet vs vendor fleet separation | Live | AssignmentQueuePage |
| F-26 | LR request / transfer workflows | Live | useAppStore |
| F-27 | Booking document management | Live | BookingDocumentsPage |
| F-28 | POD completed list | Live | PODCompletedPage |
| F-29 | Live tracking | **STUB** | LiveTrackingPlaceholderPage |
| F-30 | Dispatch Trip action | **DISABLED** | BookingDetailsPage |
| F-31 | Complete Trip action | **DISABLED** | BookingDetailsPage |
| F-32 | ERP booking import | **PLACEHOLDER** | BookingListPage (empty column) |
| F-33 | Invoice creation | **Partial** | useAppStore (no UI screen) |
| F-34 | Reporting / analytics | **MISSING** | Not found |

---

## 5. Booking Lifecycle (24 Statuses)

### All Status Values
```
DRAFT | PENDING_RATE_APPROVAL | PENDING_ASSIGNMENT | ACCEPTED |
VEHICLE_ASSIGNED | LOADING_STARTED | LOADING_COMPLETED | DOCUMENT_PENDING |
DOCUMENT_COMPLETED | ASSIGNED | LOADING | LOADED | READY_FOR_DISPATCH |
DISPATCHED | IN_TRANSIT | POD_PENDING | ARRIVED | DELAYED | EXCEPTION |
COMPLETED | INVOICED | PAID | DISPUTED | CANCELLED
```

### Full State Machine
```
DRAFT
  │ [Submit; deviation < 5% OR SPOT]
  ├─────────────────────────────────► PENDING_ASSIGNMENT
  │ [Submit; CONTRACT + deviation ≥ 5%]
  └──────────────────────────────────► PENDING_RATE_APPROVAL
                                              │ [Approve]
                                              ▼
                                       PENDING_ASSIGNMENT ◄── [Reject returns to DRAFT]
                                              │
                                              ▼
                                    ACCEPTED / VEHICLE_ASSIGNED / ASSIGNED
                                              │
                                              ▼
                                       LOADING_STARTED
                                              │
                                              ▼
                                      LOADING_COMPLETED
                                              │
                                              ▼
                                      DOCUMENT_PENDING
                                              │
                                              ▼
                                     DOCUMENT_COMPLETED
                                              │
                                              ▼
                                     READY_FOR_DISPATCH
                                              │
                                              ▼
                                          DISPATCHED
                                              │
                                              ▼
                                          IN_TRANSIT
                                              │
                                              ▼
                                         POD_PENDING
                                              │
                                              ▼
                                           ARRIVED
                                              │
                                              ▼
                                          COMPLETED
                                              │
                                              ▼
                                          INVOICED
                                           /    \
                                         PAID  DISPUTED

Exception paths (from any active status):
  ├──► DELAYED   (sub-state: >18h elapsed from last event)
  ├──► EXCEPTION
  └──► CANCELLED (only from: DRAFT, PENDING_RATE_APPROVAL, PENDING_ASSIGNMENT,
                              ACCEPTED, VEHICLE_ASSIGNED, ASSIGNED)
```

### Pipeline View Mapping (24 → 9)

| Internal Statuses | Maps To (Pipeline) |
|---|---|
| DRAFT | DRAFT |
| PENDING_RATE_APPROVAL | PENDING_RATE_APPROVAL |
| PENDING_ASSIGNMENT, ACCEPTED, VEHICLE_ASSIGNED, ASSIGNED, LOADING_STARTED, LOADING_COMPLETED, DOCUMENT_PENDING, DOCUMENT_COMPLETED, LOADING, LOADED, READY_FOR_DISPATCH, DISPATCHED | PENDING_ASSIGNMENT |
| IN_TRANSIT | IN_TRANSIT |
| POD_PENDING, ARRIVED | POD_PENDING |
| COMPLETED | COMPLETED |
| INVOICED, PAID, DISPUTED | INVOICED |
| EXCEPTION | EXCEPTION |
| CANCELLED | CANCELLED |

### Delay Detection Rule
`isBookingDelayCandidate()`:
- Status in `[DOCUMENT_COMPLETED, READY_FOR_DISPATCH, DISPATCHED, IN_TRANSIT]`
- AND elapsed > **18 hours** from latest event *(hardcoded — should be configurable)*

---

## 6. Reassignment & Breakdown Lifecycle

### Reassignment Types

| Type | What Changes |
|---|---|
| `DRIVER` | Same vehicle, new driver |
| `VEHICLE` | Different vehicle (implicit vendor change) |
| `VEHICLE_DRIVER` | Both vehicle and driver |
| `VENDOR_VEHICLE_DRIVER` | Full trio — vendor + vehicle + driver |
| `DRIVER_AND_VEHICLE` | Alias for VEHICLE_DRIVER |

### Reassignment Reasons
`DRIVER_UNAVAILABLE` | `DRIVER_SICK` | `DRIVER_SHIFT_CHANGE` | `VEHICLE_BREAKDOWN` |
`VEHICLE_COMPLIANCE_ISSUE` | `VEHICLE_PLACEMENT_ISSUE` | `VENDOR_REPLACEMENT` |
`ROUTE_OPERATIONAL_ISSUE` | `CUSTOMER_REQUEST` | `EMERGENCY_REPLACEMENT` | `OTHER`

### Vehicle Breakdown Workflow
```
Report Breakdown
  └──► repairStatus = WAITING_FOR_REPAIR
            │
            ├── [Repair OK] ──► REPAIRED_CONTINUED (calculates downtime, continues)
            │
            └── [Cannot repair] ──► REPLACEMENT_REQUIRED
                                          └──► Vehicle Replacement initiated

Vehicle Replacement Status Flow:
  REQUESTED
    ├──► SENT_TO_VENDOR
    │       ├──► VENDOR_ASSIGNED_REPLACEMENT ──► COMPLETED
    │       └──► VENDOR_REJECTED ──► INTERNAL_REPLACEMENT_REQUIRED
    │                                       └──► INTERNAL_REPLACEMENT_COMPLETED ──► COMPLETED
    └──► DIRECT (internal immediate swap) ──► COMPLETED
```

### Replacement Modes

| Mode | Description |
|---|---|
| `DIRECT` | Immediate internal vehicle swap |
| `VENDOR_ACTION` | Request sent to vendor; status = `SENT_TO_VENDOR` |
| `INTERNAL_FALLBACK` | If vendor rejects, internal team takes over |

### Vehicle Replacement Reasons
`VEHICLE_BREAKDOWN` | `VEHICLE_COMPLIANCE_ISSUE` | `VEHICLE_PLACEMENT_ISSUE` |
`VENDOR_REPLACEMENT` | `ROUTE_OPERATIONAL_ISSUE` | `CUSTOMER_REQUEST` |
`EMERGENCY_REPLACEMENT` | `OTHER`

---

## 7. Destination Change Workflow

### DCR Status Machine
```
SUBMITTED (raised by customer or ops manager)
  └──► UNDER_REVIEW (approver opens review)
            ├──► APPROVED
            │       └──► IMPLEMENTED (revision atomically applied to delivery)
            └──► REJECTED
```

### Priority Levels
`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

### Address Matching Logic
1. Normalize tokens: `fullAddress`, `addressLabel`, `addressLine1`, `addressName`
2. `includes/contains` check against customer address bank
3. Match by `consigneeId` or `consigneeName`
4. Filter: `status=active`, `addressUsage=DESTINATION|BOTH`, `operationalAddressType=PRIMARY|ADDITIONAL|EMERGENCY`
5. If no match → allow creation of **temporary operational address**

### Temporary Address Fields
`addressLabel`, `fullAddress`, `city`, `state`, `pincode`, `contactPerson`, `contactNumber`, `gstNumber`, `remarks`

### On IMPLEMENTED
- Builds `DeliveryRevisionRecord` (previousSnapshot + proposedSnapshot + impact)
- Updates delivery: new destination, distance, freight
- Supersedes all previous `ACTIVE` revisions → `SUPERSEDED`
- Adds system remark: `"Destination revision activated"`
- Retains existing LR linkage
- Sets `operationalFlags`: `DESTINATION_CHANGED`, `DELIVERY_REVISED`, `BOOKING_EDITED`

### Impact Preview Fields
`freightDelta` | `distanceDeltaKm` | `routeDelta` | `etaDeltaHours` | `tripImpactSummary`

---

## 8. Form Analysis

### Form 1: Create Booking — Main Fields

| Field | Type | Required | Validation / Notes |
|---|---|---|---|
| `commercialType` | `CONTRACT \| SPOT` | Yes | — |
| `modeOfTransport` | `ROAD` | Yes | Fixed, not editable |
| `serviceType` | `FTL \| PTL` | Yes | — |
| `contractRateType` | `PER_TRIP \| PER_KM \| PER_MT` | Conditional | Only shown if CONTRACT |
| `numberOfDeliveries` | string | Yes | — |
| `customerId` | string | Yes | Dropdown from admin sources |
| `pickupDateTime` | datetime-local | Yes | — |
| `sourceAddressId` | string | Yes | Requires `customerId` first |
| `destinationAddressId` | string | Yes | — |
| `vehicleTypeId` | string | Conditional | `shouldRequireVehicleType()` rule |
| `enteredRate` | string | Yes | Rate in INR |
| `deviationRemark` | string | Conditional | Required if deviation ≥ 5% |
| `opsRemark` | string | No | — |

### Form 2: Per-Delivery Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | Auto-gen | — |
| `trackingId` | string | Auto-gen | `TRK-DRAFT-NN` |
| `originCity` | string | Yes | — |
| `originAddressId` | string | Yes | — |
| `destinationCity` | string | Yes | — |
| `destinationAddressId` | string | Conditional | Can be deferred: `FROM_INVOICE_LATER` |
| `destinationAddressSource` | `SAVED_ADDRESS \| FROM_INVOICE_LATER` | Yes | — |
| `consigneeFinalizationStatus` | `PENDING \| CONFIRMED` | Auto | — |
| `materialId` | string | Yes | — |
| `quantity` | string | Yes | — |
| `uom` | string | Yes | — |
| `weight` | string | Yes | — |
| `weightUom` | string | Yes | KG / MT / LB |
| `distanceKm` | string | Conditional | Only if `PER_KM` rate type |

### Form 3: Address Dialog (Inline Creation)

| Field | Required | Validation |
|---|---|---|
| `contactPersonName` | Yes | Non-empty |
| `phone` | Yes | Indian mobile — 10 digits normalized |
| `email` | No | RFC-simple format |
| `addressLine1` | Yes | Non-empty |
| `pincode` | Yes | Exactly 6 digits |
| `state` | Yes | Non-empty |
| `city` | Yes | Non-empty |
| `gstin` | No | 15-char format if provided |
| `contactCode`, `addressName`, `addressLine2`, `landmark`, `country` | No | — |

Usage types: `"ORIGIN"` | `"DESTINATION"` | `"BOTH"`

### Form 4: Assignment Dialog

| Field | Required | Notes |
|---|---|---|
| Vendor | Yes | Own Fleet or external (status=active) |
| Vehicle | Yes | Filtered: `isActive` + vendor match |
| Driver | Yes | Filtered: `isActive` + vendor match; vendor-match sorted first |
| Vendor Freight | Yes | > 0; triggers auto-lookup |
| Margin Amount | Display only | Gated: `VIEW_MARGIN` permission |
| Margin % | Display only | Gated: `VIEW_MARGIN` permission |
| LR Mode | Yes | `MANUAL` / `PRE_GENERATED` / `AUTO` |
| Active Place (Org Unit) | Conditional | Required if multiple org units |
| Manual LR Number | Conditional | Required if LR mode ≠ AUTO |

**Validation on Submit:**
- vendorId required
- vehicleId required
- driverId required
- vendorFreight > 0
- activeLrOrgUnitId must be set
- If mode ≠ AUTO: preferredLrNumber required

### Form 5: POD Capture (Per Delivery)

| Field | Type | Notes |
|---|---|---|
| `podDocument` | filename | Uploaded file |
| `podUploaded` | boolean | Set to true on upload |
| `podUploadedAt` | ISO datetime | Auto-stamped |
| `photoName` | string | — |
| `consigneeName` | string | — |
| `podRemark` | string | Optional note |
| `eSignRequested` | boolean | Toggle |
| `capturedAt` | ISO datetime | Auto-stamped |

### Form 6: Delivery Remark Types

| Remark Type | Extra Fields Required |
|---|---|
| `INTACT` | — |
| `DEPS` (Damaged/Excess/Pilferage/Shortage) | `requiresRemark` |
| `ACCIDENT_INCIDENT` | `requiresLocation` |
| `VEHICLE_PLACEMENT_DELAY_DEVIATION` | `requiresLocation` |
| `DELIVERY_DELAY` | — |
| `EPOD_SUBMITTED` | — |
| `EPOD_NOT_SUBMITTED` | — |
| `ORIGINAL_POD_NOT_SUBMITTED` | — |
| `VEHICLE_BREAKDOWN` | `requiresLocation` |
| `DESTINATION_CHANGED` | `requiresLocation` |
| `CONSIGNEE_DESTINATION_CHANGED` | `requiresLocation` + `requiresConsigneeDestination` + `requiresRemark` |
| `DRIVER_CHANGED` / `VEHICLE_CHANGED` / `VEHICLE_DRIVER_CHANGED` / `VENDOR_VEHICLE_DRIVER_CHANGED` | — |

---

## 9. API Catalog

> **Critical Note:** The entire module runs on `useMockStore()` — an in-memory JavaScript store. No real HTTP endpoints are wired. All endpoints below are implied production integration targets.

### Booking APIs

| Endpoint | Method | Purpose | Key Payload |
|---|---|---|---|
| `/api/tms/bookings` | GET | List all bookings | `tenantId`, `status`, `customerId` |
| `/api/tms/bookings` | POST | Create booking | `BookingInput` |
| `/api/tms/bookings/:id` | GET | Single booking detail | — |
| `/api/tms/bookings/:id` | PATCH | Update booking | `Partial<BookingInput>` |
| `/api/tms/bookings/:id/transition` | POST | Status transition | `BookingStatusTransitionInput` |
| `/api/tms/bookings/:id/assign` | POST | Assign vehicle/driver/vendor | `BookingAssignmentInput` |
| `/api/tms/bookings/:id/reassign` | POST | Reassign | `BookingReassignmentInput` |
| `/api/tms/bookings/:id/vehicle-replace` | POST | Initiate vehicle replacement | `BookingVehicleReplacementInput` |
| `/api/tms/bookings/:id/vehicle-replace/action` | POST | Vendor response to replacement | `BookingVehicleReplacementVendorActionInput` |
| `/api/tms/bookings/:id/destination-change` | POST | Raise / action DCR | DCR payload |

### Master Data APIs

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/customers` | GET | Customer list (tenantId scoped) |
| `/api/addresses` | GET | Address bank (customerId scoped) |
| `/api/vendors` | GET | Vendor list (tenantId scoped) |
| `/api/fleet/vehicles` | GET | Vehicle list |
| `/api/fleet/drivers` | GET | Driver list |
| `/api/rate-cards/customer` | GET | Customer rate cards |
| `/api/rate-cards/vendor` | GET | Vendor rate cards |
| `/api/materials` | GET | Material master |
| `/api/uom/definitions` | GET | UOM definitions |
| `/api/uom/mappings` | GET | UOM mappings |

### LR APIs

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/lr/pools` | GET | LR pool list |
| `/api/lr/configs` | GET | LR configs |
| `/api/lr/requests` | GET / POST | LR requests |
| `/api/lr/requests/:id/approve` | POST | Approve LR request |
| `/api/lr/requests/:id/reject` | POST | Reject LR request |
| `/api/lr/transfers` | GET / POST | LR transfers |
| `/api/lr/transfers/:id/complete` | POST | Complete LR transfer |

### Finance & Audit APIs

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/tms/invoices` | POST | Create invoice |
| `/api/audit` | POST | Append audit log entry |

---

## 10. State Management

### Store: `useAppStore` (via `MockStoreProvider` → `useMockStore`)

#### Full State Shape

```typescript
{
  // Master data
  customers: TenantCustomer[]
  vendors: TenantVendor[]
  vendorRateCards: TenantVendorRateCard[]
  materials: TenantMaterial[]
  uomDefinitions: TenantUOMDefinition[]
  uomMappings: TenantUOMMapping[]
  vehicleTypes: TenantVehicleType[]
  vehicles: TenantVehicle[]
  drivers: TenantDriver[]
  rateCards: TenantCustomerRateCard[]
  addresses: TenantCustomerAddress[]

  // Transactional
  bookings: BookingRecord[]
  invoices: InvoiceRecord[]

  // LR management
  lrConfigs: TenantLRConfig[]
  lrPools: TenantLrPoolRecord[]
  lrs: LrRecord[]
  lrRequests: LrRequestRecord[]
  lrTransfers: LrTransferRecord[]

  // Audit
  auditLogs: AuditLogRecord[]
  users: UserRecord[]

  // Fast-lookup Maps (memoized)
  customerMap: Map<customerId, TenantCustomer>
  customerAddressMap: Map<customerId, TenantCustomerAddress[]>
  customerRateCardMap: Map<customerId, TenantCustomerRateCard[]>
  vendorRateCardMap: Map<vendorId, TenantVendorRateCard[]>
}
```

#### Store Actions

```typescript
// Booking
createBooking(input)
updateBooking(bookingId, updates)
transitionBooking(bookingId, transition)
assignBooking(bookingId, input)
reassignBooking(bookingId, input)
replaceBookingVehicle(bookingId, input)
actionBookingVehicleReplacement(bookingId, input)

// Finance
createInvoice(input)

// LR
listLrPools() / upsertLrPools(records) / createLrs(records)
listLrRequests() / createLrRequest(input)
approveLrRequest(requestId, approvedCount, actor, note?)
rejectLrRequest(requestId, actor, note?)
listLrTransfers() / createLrTransfer(input)
completeLrTransfer(transferId, actor, note?)

// Audit
appendAuditLog(input)

// Sync
syncLrsForBooking(bookingId, status)
```

### LR Pool Status Values
`AVAILABLE` | `USED` | `VOID` | `LOST` | `DAMAGED` | `ALLOCATED` |
`REQUESTED` | `APPROVAL_PENDING` | `TRANSFER_PENDING` | `TRANSFERRED`

---

## 11. RBAC Matrix

### Permission Codes in TMS

| Permission Code | Feature | Action |
|---|---|---|
| `TMS / CREATE_BOOKING / create` | Create Booking button | Create |
| `BOOKING_DETAIL / CHANGE_ASSIGNMENT` | Assign / Reassign | Modify |
| `BOOKING_DETAIL / REPLACE_VEHICLE` | Replace Vehicle | Modify |
| `BOOKING_DETAIL / HANDLE_VEHICLE_BREAKDOWN` | Breakdown panel | Modify |
| `RATE_APPROVAL / APPROVE_RATE` | Approve in queue | Approve |
| `RATE_APPROVAL / REJECT` | Reject in queue | Reject |
| `ASSIGNMENT_QUEUE / ASSIGN_VEHICLE` | Vehicle assignment | Assign |
| `ASSIGNMENT_QUEUE / ASSIGN_VENDOR` | Vendor selection | Assign |
| `ASSIGNMENT_QUEUE / VIEW_MARGIN` | Margin fields | View |
| `CREATE_BOOKING / SUBMIT_BOOKING` | Submit button | Submit |
| `START_LOADING` | Start Loading button | Transition |

### Role Access Matrix

| Feature | Platform Admin | Tenant Admin | Ops Manager | Dispatcher | Finance | Customer | Vendor |
|---|---|---|---|---|---|---|---|
| Create Booking | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Submit Booking | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Booking | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve Rate | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reject Rate | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign Vehicle | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign Vendor | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Margin | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Reassign Vehicle/Driver | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Replace Vehicle | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Handle Breakdown | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Raise DCR | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Approve DCR | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Start Loading | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Capture POD | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cancel Booking | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Vendor Replacement Action | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

> ⚠️ `canRaiseDestinationChange` and `canApproveDestinationChange` resolved via role name **regex** (`/operations manager|...|region manager/i`) — brittle, should be refactored to discrete permission codes.

---

## 12. Business Rules Catalog

| # | Rule | Implementation Location |
|---|---|---|
| BR-01 | Deviation < 5% → auto-approved | `getDeviationApprovalLevel()` |
| BR-02 | Deviation 5–15% → MANAGER approval | `getDeviationApprovalLevel()` |
| BR-03 | Deviation > 15% → HO approval | `getDeviationApprovalLevel()` |
| BR-04 | CONTRACT + deviation ≥ 5% → `PENDING_RATE_APPROVAL` | `evaluateInitialBookingStatus()` |
| BR-05 | SPOT bookings always skip rate approval | `evaluateInitialBookingStatus()` |
| BR-06 | Vehicle type required: SPOT=No, `!PER_MT`=Yes, else=No | `shouldRequireVehicleType()` |
| BR-07 | Cancellable: DRAFT, PENDING_*, ACCEPTED, VEHICLE_ASSIGNED, ASSIGNED | `canCancelBooking()` |
| BR-08 | Delay candidate: transit status + elapsed > 18h | `isBookingDelayCandidate()` *(hardcoded)* |
| BR-09 | Margin amount = customerFreight − vendorFreight | `calculateMarginAmount()` |
| BR-10 | Margin % = (customer − vendor) / customer × 100 | `calculateMarginPercent()` |
| BR-11 | Vendor rate try-order: booking.rateType → PER_MT → PER_TRIP → PER_KM | Assignment dialog |
| BR-12 | Customer rate fallback: LANE → CITY → PINCODE → ADDRESS | `getEffectiveRateMatchingBasis()` |
| BR-13 | City alias: bangalore → bengaluru | `normalizeCityValue()` *(hardcoded)* |
| BR-14 | PRE_GENERATED LR: `poolType=CUSTOMER_RESERVED AND customerId=booking.customerId` | LR pool filter |
| BR-15 | GENERAL LR: `poolType=GENERAL AND !customerId` | LR pool filter |
| BR-16 | Active org unit required if multiple org units | Assignment validation |
| BR-17 | Delivery chain: new delivery origin = previous destination | `addDelivery()` |
| BR-18 | Minimum 1 delivery — Remove hidden if count = 1 | `deliveries.length > 1` |
| BR-19 | POD complete = all deliveries `pod.podUploaded = true` | `areAllDeliveryPodsCaptured()` |
| BR-20 | DCR revision supersession: new ACTIVE → previous ACTIVE → SUPERSEDED | `buildDeliveryRevisionRecord()` |
| BR-21 | DCR retains existing LR linkage on implementation | `destination-change.ts` |
| BR-22 | OWN_FLEET_VENDOR sentinel separates internal fleet from vendors | Constant |
| BR-23 | Direct customer tenant shows extra notice in create form | `isDirectCustomerTenant()` |
| BR-24 | UOM weight: KG=1, MT=1000, LB=0.45359237 | `weightUnitToKg` map |
| BR-25 | Driver sort: vendor-match drivers listed first | `availableDrivers` sort |
| BR-26 | Deviation % = (entered − l1Rate) / l1Rate × 100, 2 decimals | `calculateDeviationPercent()` |
| BR-27 | PER_MT freight = rate × weight | `perMT()` |
| BR-28 | PER_KM freight = rate × distance | `perKM()` |
| BR-29 | PER_TRIP freight = rate (flat) | `perTrip()` |
| BR-30 | Active address filter: status=active, usage=DESTINATION\|BOTH, type=PRIMARY\|ADDITIONAL\|EMERGENCY | DCR address matching |

---

## 13. Dependency Matrix

| Feature | Component | Service / Hook | Store | Permission | Upstream | Downstream |
|---|---|---|---|---|---|---|
| Create Booking | CreateBookingPage | `useTenantBookings`, `useBookingAdminSources` | bookings | `CREATE_BOOKING/create` | Customer, Rate cards | Assignment queue |
| Rate Approval | RateApprovalQueuePage | `useTenantBookings` | bookings | `RATE_APPROVAL/APPROVE_RATE` | Create booking | Assignment queue |
| Assignment | AssignmentQueuePage, BookingDetailsPage | `useTenantBookings`, `useBookingAdminSources` | bookings, vehicles, drivers | `ASSIGNMENT_QUEUE/ASSIGN_VEHICLE` | Vehicle master, Driver master, Vendor rate cards, LR pools | Dispatch, LR allocation |
| Rate Lookup | CreateBookingPage | `validateRateCard()` in booking-selectors.ts | rateCards | — | Customer rate cards | Freight pricing |
| Vendor Rate Lookup | AssignmentQueuePage | `validateVendorRateCard()` in booking-selectors.ts | vendorRateCards | `VIEW_MARGIN` | Vendor rate cards | Margin |
| Destination Change | BookingDetailsPage | `destination-change.ts` | bookings | Role regex | Address bank | Delivery revision, LR, freight |
| Vehicle Replacement | BookingDetailsPage | `replaceBookingVehicle()` | bookings | `REPLACE_VEHICLE` | Vendor management | Reassignment |
| POD Capture | BookingDetailsPage | `transitionBooking()` | bookings | — | Documents | Invoice trigger |
| LR Assignment | BookingDetailsPage, AssignmentQueuePage | `useTenantLrs` | lrPools | — | LR pool management | Shipment documents |
| Audit Log | All pages | `appendAuditLog()` | auditLogs | — | All actions | Compliance |
| UOM Conversion | CreateBookingPage | booking-selectors.ts | uomDefinitions, uomMappings | — | Material master | Freight calc |
| Breakdown Handling | BookingDetailsPage | `useTenantBookings` | bookings | `HANDLE_VEHICLE_BREAKDOWN` | Fleet master | Vehicle replacement |

---

## 14. Edge Cases

| Scenario | Current Handling |
|---|---|
| Booking not found | `TenantEmptyState "Booking not found"` rendered |
| No customer selected | Address dialog button hidden until `customerId` set |
| Rate card not found | Warning shown; manual rate entry allowed |
| Vendor rate card not found | `vendorFreightSource = "MANUAL"`, warning shown |
| No active vehicles | Vehicle selector shows empty dropdown; assignment blocked |
| Vendor rejects replacement | Status → `INTERNAL_REPLACEMENT_REQUIRED`; internal takes over |
| All PODs captured | `allDeliveryPodsCaptured = true`; COMPLETED transition enabled |
| Delivery removed | `trackingId` sequence rebuilt on removal |
| Loading already started | Cancel booking button disabled |
| Multiple org units | Forces `activeLrOrgUnitId` selection before assignment |
| PRE_GENERATED pool empty | Assignment blocked until LR number selected |
| Destination not in address bank | Temporary operational address creation offered |
| PER_MT missing weight | UOM conversion required; blocks if missing |
| Pincode invalid | Exactly 6 digits enforced; form blocked |
| GSTIN provided but invalid | 15-char format required if provided |
| No deviation remark on high deviation | Form blocked from submit |
| Concurrent revision | No optimistic locking — last write wins in mock store |
| Concurrent POD | No lock; last write wins |
| `DISPUTED` / `PAID` terminal states | No UI path to reach them |
| Edit on non-editable status | `getBookingEditability(status)` blocks form |
| DRIVER reassignment type | Vehicle filtered to `=== current` (enforces same vehicle) |
| Rate lookup mid-input | 300ms debounce prevents excessive calls |

---

## 15. Hidden Features & Technical Debt

### Stub / Disabled Features

| Feature | Location | Status |
|---|---|---|
| Live Tracking page | `/bookings/live-tracking` | Placeholder — no implementation |
| Dispatch Trip button | BookingDetailsPage header | Rendered but **DISABLED** |
| Complete Trip button | BookingDetailsPage header | Rendered but **DISABLED** |
| ERP Bookings column | Kanban pipeline | Column exists, status array empty |
| `ARRIVED` status | Status enum | Defined, no clear UI trigger |
| `PAID` / `DISPUTED` status | Status enum | Defined, no transition UI |

### Environment / Configuration Flags

| Flag / Constant | Effect |
|---|---|
| `MODULE_CODE_TO_KEY` | Maps `BK001→TMS`, `AMS01→AMS`, `FLT01→FLEET`, `FIN01→FINANCE` |
| `isDirectCustomerTenant(tenant)` | Conditional notice in CreateBookingPage |
| `SESSION_STORAGE` actor context | Default actor `platform_admin` hardcoded |
| `OWN_FLEET_VENDOR` sentinel | Magic string constant mixed with real vendor IDs |

### Technical Debt

| Item | Severity | Detail |
|---|---|---|
| Entire module on mock data | Critical | `useMockStore()` — no real backend wired anywhere |
| 3,663-line BookingDetailsPage | High | God component; urgently needs decomposition |
| Regex role checks for DCR | High | `/operations manager\|...\|region manager/i` — brittle |
| Hardcoded 18h delay threshold | Medium | Should be a configurable setting |
| Hardcoded city alias map | Medium | `bangalore → bengaluru` in `normalizeCityValue()` |
| No optimistic locking | Medium | Concurrent writes on same booking silently overwrite |
| Mock LR generation in service code | Medium | `buildMockLRNumber()` mixed into production service |
| `DISPUTED` / `PAID` unreachable | Medium | Status values with no UI path |
| ERP column placeholder | Low | Future integration not started |
| `ASSIGNED` vs `VEHICLE_ASSIGNED` overlap | Low | Both statuses mean "assigned" — semantic redundancy |

---

## 16. Missing Features Report

| # | Feature | Priority | Detail |
|---|---|---|---|
| MF-01 | Real backend API integration | Critical | Entire module on in-memory mock; no HTTP layer |
| MF-02 | Live tracking UI | Critical | Route stub exists; no GPS integration in TMS |
| MF-03 | Dispatch Trip action | High | Button rendered but disabled |
| MF-04 | Complete Trip action | High | Button rendered but disabled |
| MF-05 | PAID / DISPUTED workflow | High | Terminal statuses defined but unreachable from UI |
| MF-06 | Invoice creation screen | High | `createInvoice()` in store; no UI form in routes |
| MF-07 | ERP booking import | High | Kanban column placeholder; no integration |
| MF-08 | Load planning / consolidation | Medium | No multi-booking load planning screen |
| MF-09 | Manifest generation | Medium | No manifest screen in routes |
| MF-10 | Consignment management | Medium | Not found in module |
| MF-11 | Vendor-facing portal screen | Medium | Replacement response logic exists; no vendor portal |
| MF-12 | Freight cost analytics | Medium | Margin per booking only; no aggregate analytics |
| MF-13 | SLA monitoring dashboard | Medium | Delay detection exists; no SLA screen |
| MF-14 | Bulk booking actions | Low | No bulk approve / assign / cancel |
| MF-15 | Export functionality | Low | No export anywhere in module |
| MF-16 | Reverse logistics (return booking) | Low | No return flow |
| MF-17 | Push / email notifications | Low | No notification wiring |
| MF-18 | Driver performance scoring | Low | Not present in TMS module |
| MF-19 | Reports screen | Low | No dedicated reports route |
| MF-20 | Audit log viewer screen | Low | Audit written to store; no viewer UI in routes |

---

*End of TMS Module Deep Code Review — Reverse-engineered from full source scan of `/modules/tms/`*
