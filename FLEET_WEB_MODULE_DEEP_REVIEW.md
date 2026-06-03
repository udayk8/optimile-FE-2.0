# Fleet-Web Module — Complete Deep Code Review
**Module:** `/modules/fleet-web/`
**Scan Date:** 2026-06-03
**Stack:** React 19.0 + TypeScript 5.6 + Vite 6.0
**Total Files:** 70 | **Pages:** 30 | **API Modules:** 20+ | **Type Definitions:** 100+

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Route Hierarchy](#2-route-hierarchy)
3. [Screen Inventory](#3-screen-inventory)
4. [Feature Inventory](#4-feature-inventory)
5. [Vehicle Lifecycle](#5-vehicle-lifecycle)
6. [Driver Lifecycle](#6-driver-lifecycle)
7. [Maintenance & Work Order Lifecycle](#7-maintenance--work-order-lifecycle)
8. [Garage Visit Lifecycle](#8-garage-visit-lifecycle)
9. [Tyre Intelligence Subsystem](#9-tyre-intelligence-subsystem)
10. [Battery Management Lifecycle](#10-battery-management-lifecycle)
11. [Form Analysis](#11-form-analysis)
12. [API Catalog](#12-api-catalog)
13. [State Management](#13-state-management)
14. [RBAC Matrix](#14-rbac-matrix)
15. [Business Rules Catalog](#15-business-rules-catalog)
16. [Dependency Matrix](#16-dependency-matrix)
17. [Edge Cases](#17-edge-cases)
18. [Hidden Features & Technical Debt](#18-hidden-features--technical-debt)
19. [Missing Features Report](#19-missing-features-report)
20. [Complete Type & Enum Reference](#20-complete-type--enum-reference)

---

## 1. Architecture Overview

### Problem Domain
A comprehensive Fleet Management System (FMS) covering the full vehicle and driver lifecycle: registration, compliance, maintenance scheduling, work order management, garage visit tracking, fuel/energy analytics, tyre intelligence, battery management, spare parts inventory, vendor invoicing, cost reconciliation, driver behavior monitoring, live GPS tracking, and operational exception management.

### Main User Personas

| Persona | Key Responsibilities |
|---|---|
| Fleet Admin | Full fleet configuration, master data, all workflows |
| Maintenance Manager | Work orders, garage visits, templates, cost management |
| Ops / Viewer | Dashboard, live map, exceptions, dispatch, read access |
| Driver | Trip dispatch, behavior events (via driver app) |
| Finance | Invoice approval, cost reconciliation, vendor ledger |

### Technology Stack
- **Framework:** React 19 + TypeScript 5.6 + Vite 6
- **Routing:** React Router DOM 7.1
- **Maps:** Google Maps API (LiveMapPage), Leaflet (History Playback Modal)
- **Icons:** Custom SVG icon library (80+ icons) + Lucide React
- **Shared packages:** `@optimile/shared-auth`, `@optimile/shared-ui`
- **Port:** 3002 (dev server)

### Module Path Aliases
```
@fleet      → ./src
@shared-auth → ../../packages/shared-auth/src
@shared-ui  → ../../packages/shared-ui/src
@shared-api → ../../packages/shared-api/src
@shared-utils → ../../packages/shared-utils/src
```

### Upstream Dependencies
- TMS module (bookings → trips assigned to vehicles/drivers)
- Track & Trace module (live location data)
- Finance module (invoice approval flow)
- Shared auth (user session, roles)

### Downstream Impacts
- TMS dispatch (vehicle/driver availability)
- Finance (cost events, vendor invoices)
- Track & Trace (tracker device config)
- Compliance audit (document status)

---

## 2. Route Hierarchy

```
/fleet
├── /fleet/dashboard          ← DashboardPage
├── /fleet/fleet              ← FleetPage (Vehicle Registry)
├── /fleet/drivers            ← DriversPage
├── /fleet/vehicles/:id       ← VehicleDetailsPage
├── /fleet/drivers/:id        ← DriverDetailsPage
├── /fleet/maintenance        ← MaintenancePage
├── /fleet/live-map           ← LiveMapPage
├── /fleet/exceptions         ← ExceptionCenterPage
├── /fleet/fuel               ← FuelPage
├── /fleet/cost               ← CostHealthPage
├── /fleet/compliance         ← CompliancePage
├── /fleet/behavior           ← DriverBehaviorPage
├── /fleet/garage             ← GaragePage
├── /fleet/inventory          ← InventoryPage
├── /fleet/reconciliation     ← ReconciliationPage
├── /fleet/marketplace        ← MarketplacePage
├── /fleet/data-coverage      ← DataCoveragePage
├── /fleet/dispatch           ← DispatchPage
├── /fleet/ops-intelligence   ← OpsIntelligencePage
├── /fleet/alerts             ← AlertManagementPage
├── /fleet/trips/:id          ← TripDetailsPage
├── /fleet/settings           ← FleetSettingsPage
├── /fleet/vendors            ← VendorManagementPage
├── /fleet/tyre               ← TyreTrackerPage
├── /fleet/tyre/:id           ← TyreDetailPage
├── /fleet/tyre-analytics     ← TyreAnalyticsPage
├── /fleet/tyre-indents       ← TyreIndentsPage
├── /fleet/tyre-jobs          ← TyreJobsPage
├── /fleet/tyre-inspections   ← TyreInspectionsPage
├── /fleet/batteries          ← BatteryPage
└── /fleet/batteries/:id      ← BatteryDetailsPage

Tab Navigation: useFleetTabNavigate() → maps tab name → /fleet/{tab}
Exception Polling: FleetRouteWrapper polls ExceptionAPI every 30 seconds
```

---

## 3. Screen Inventory

### Screen 1: DashboardPage — `/fleet/dashboard`

**Purpose:** Fleet command center — real-time health overview with AI-generated insights.

#### Command Strip (Top Bar)
- Total Fleet count
- Readiness % (active vehicles / total)
- At Risk count (exceptions + maintenance due)

#### KPI Cards (6)
| Card | Metric | Color Logic |
|---|---|---|
| Readiness | % fleet operational | Green >85%, Amber 70–85%, Red <70% |
| Ops Risk | Open exception count | Red if Critical present |
| Maint. Due | Overdue + Due count | Red if Overdue > 0 |
| Energy Risk | Anomaly count | Amber/Red by severity |
| Cost Health | Confidence score | Green High, Amber Medium, Red Low |
| Tyre Alerts | Active tyre signals | Red if High severity present |

#### Live Alert Ticker
- Scrolling banner of Critical/High exceptions
- Click → navigate to ExceptionCenterPage

#### AI Insights Panel
- `AIInsightsPanel` component
- Insights on: readiness, ops risk, maintenance, energy, cost
- Tone types: `positive` | `watch` | `critical` | `info`
- Color-coded by tone with action labels

#### Status Buckets (Fleet Segmentation)
- `healthy` — Active, no issues
- `at-risk` — Open exceptions
- `maintenance` — Scheduled or overdue maintenance
- `non-compliant` — Document expired/missing
- `offline` — No telematics ping

#### API Calls on Mount
```
VehicleAPI.getAll()
ExceptionAPI.getAll()
MaintenanceAPI.getSchedules()
EnergyAPI.getAnomalies()
ComplianceAPI.getAllDocuments()
SyncAPI.getEnergySummary()
MaintenanceAPI.getDashboardKPIs()
TyreAPI.getHealthSignals()
```

---

### Screen 2: FleetPage — `/fleet/fleet`

**Purpose:** Vehicle registry — list, search, filter, add, edit, delete vehicles.

#### Filters
- Search: registration number, VIN/chassis
- Status: Active, Inactive, Maintenance, Draft, Retired
- Type: Truck, Container, Trailer, Tanker
- Ownership: Owned, Leased, Rented
- Active filter badge showing count

#### Table Columns
Registration No. | Type | Axle Config | Capacity (T) | Ownership | Status | Driver | Actions (Edit/Delete)

#### Actions
- **Add Vehicle** → opens Add Vehicle Modal
- **Bulk Onboard** → button exists but **NOT YET ENABLED** (disabled stub)
- **Edit** → Edit Vehicle Modal (pre-filled)
- **Delete** → Removes from registry

#### Status Badge Colors
| Status | Color |
|---|---|
| Active | Green |
| Maintenance | Yellow |
| Inactive | Red |
| Draft | Gray |
| Retired | Gray |

#### Pagination
10 vehicles per page

---

### Screen 3: DriversPage — `/fleet/drivers`

**Purpose:** Driver registry — list, search, filter, add, bulk import.

#### Filters
- Search: name, license number, phone
- Status: Active, Inactive, Suspended, On Leave, Draft
- Type: Permanent, Contract, Temporary
- License Expiry filter: < 30 days

#### Table Columns
Name | Phone | License No. | Expiry | Type | Status | Assigned Vehicle | Actions

#### Actions
- **Add Driver** → Add Driver Modal
- **Bulk Import** → 4-step modal: Upload CSV → Validate → Review → Success

#### Bulk Import Validation Result
```typescript
{
  validCount: number
  errorCount: number
  warningCount: number
  errors: string[]
  parsedData: DriverImportRow[]
}
```

#### Status Badge Colors
| Status | Color |
|---|---|
| Active | Green |
| On Leave | Yellow |
| Suspended | Red |
| Inactive | Gray |
| Draft | Blue |

#### Pagination
10 drivers per page

---

### Screen 4: VehicleDetailsPage — `/fleet/vehicles/:id`

**Purpose:** Full vehicle profile with 7 tabbed workspaces.

#### Tabs
| Tab | Content |
|---|---|
| Overview | Registration, type, status, assignment, component health, compliance summary |
| Components | Engine, Transmission, Axle, Battery, Tyre, Tracking Device, Other — with add modal |
| Batteries | Installed batteries, health status (Good/Weak/Critical), install modal |
| Maintenance | Schedule items (Upcoming/Due/Overdue), component history |
| Compliance | Document matrix (RC, Insurance, PUC, Permit, Fitness) — upload/history |
| Telemetry | Latest GPS events, speed, ignition status, map placeholder |
| Bookings | Current trip + booking history sub-tabs |

#### Tracking Devices Sub-section
- Primary / secondary tracker config
- Install Tracker Modal: device kind selector
- Advanced config: `server_host`, `server_port`, `apn`, `reporting_interval_sec`, `idle_interval_sec`, `heartbeat_interval_sec`

#### Compliance Document Matrix
- Types: RC, Insurance, PUC, Permit, Fitness
- Status: Valid (green), Expired (red), Expiring Soon (amber), Missing (gray)
- Upload modal with document number, issue date, expiry date, file upload
- Expandable document history with previous versions

---

### Screen 5: DriverDetailsPage — `/fleet/drivers/:id`

**Purpose:** Full driver profile with 5 tabbed workspaces.

#### Tabs
| Tab | Content |
|---|---|
| Profile | Name, phone, alternate phone, license, type, employment date, home location, assigned vehicle |
| Licenses | LMV, HMV, MCWG, HAZMAT license types and expiry |
| Documents | Aadhaar, PAN, Medical Certificate, Police Verification |
| Behavior | Historical behavior events (Harsh Braking, Overspeed, etc.) with severity |
| Compliance | Driver document status matrix |

---

### Screen 6: MaintenancePage — `/fleet/maintenance`

**Purpose:** Maintenance operations hub — 3 views.

#### Views
| View | Content |
|---|---|
| Dashboard | KPIs + vehicle health scores + energy maintenance signals |
| Work Orders | List of all work orders with filters and create action |
| Templates | Maintenance schedule templates by vehicle type |

#### Dashboard KPIs
- Overdue services count
- Average downtime (hours)
- Breakdowns last 7 days
- Breakdowns last 30 days
- Chronic vehicles (repeated breakdowns)

#### Vehicle Health Score Buckets
- Good | Watch | Critical

#### Work Orders Table Columns
Vehicle Reg | Issue Type | Type | Odometer | Workshop | Workshop Type | Status | Reported By | Location | Immobilized | Towing | Actions

#### Work Order Detail Modal — 3 Tabs
| Tab | Content |
|---|---|
| Overview | Status, closure form, remarks, cost signals, downtime hours |
| Parts | Add parts, quantity, hub; issue/consume workflow |
| Invoices | Add vendor invoice with line items (Part/Labour/Service) |

---

### Screen 7: LiveMapPage — `/fleet/live-map`

**Purpose:** Real-time GPS tracking of entire fleet.

#### Map Features
- Google Maps with vehicle markers
- Cluster markers at zoom < 8
- Search by registration number

#### Marker Colors (Derived Status)
| Status | Color |
|---|---|
| Moving | Green |
| Idle | Yellow |
| Stopped/Long Idle | Red |
| Offline | Gray |
| Maintenance | Blue |

#### Selected Vehicle Panel
- Driver name and phone
- Speed, heading, last update timestamp
- Trip information if on active trip

#### History Playback Modal
- Day filter dropdown (All Days + individual dates)
- Timeline slider with graduated progress
  - Blue solid = traveled route
  - Gray dashed = remaining route
- Controls: Play/Pause, Step Forward/Back, Jump to Start/End
- Speed/time display pill
- Alert markers with severity coloring (High/Medium/Low)
- Leaflet map with CARTO tiles

---

### Screen 8: ExceptionCenterPage — `/fleet/exceptions`

**Purpose:** Ops exception management with acknowledge/resolve workflow.

#### Filters
- Severity: Critical, High, Medium, Low
- Status: Open, Acknowledged, Resolved
- Entity Type: Vehicle, Driver, Inventory
- Age (hours): configurable threshold

#### Exception Detail Modal
- Description and recommendation
- Owner assignment
- Resolution notes input
- Action buttons: Acknowledge, Resolve

#### Polling
- FleetRouteWrapper polls ExceptionAPI every **30 seconds**

---

### Screen 9: GaragePage — `/fleet/garage`

**Purpose:** Garage visit management — internal and external.

#### Garage Types
`INTERNAL` | `EXTERNAL`

#### Visit Status Workflow
`CHECKED_IN` → `IN_PROGRESS` → `COMPLETED` → `CANCELLED`

#### Closure Status Workflow
`DRAFT` → `READY_FOR_APPROVAL` → `OPS_APPROVED` → `FINANCE_APPROVED` → `CLOSED` → `REJECTED`

#### Visit Details
- Entry datetime, odometer in
- Reason: Scheduled Service, Breakdown, Accident, Inspection, Other
- Linked work order IDs
- Exit datetime, odometer out
- Cost summary: parts + labour + service + GST
- Invoice IDs and payment status
- Approval chain: OPS → FINANCE

#### Metrics
- Downtime hours per visit
- Cost breakdown by category
- Garage performance metrics

---

### Screen 10: InventoryPage — `/fleet/inventory`

**Purpose:** Spare parts inventory — stock levels, movements, reorder alerts.

#### Stock Columns
Part Name | Part Code | Category | UOM | Available Qty | Reserved Qty | Min Qty | Reorder Qty | Avg Cost | Inventory Value

#### Movement Types
`IN` | `OUT` | `RESERVE` | `CONSUME_RESERVED` | `ADJUSTMENT` | `RETURN`

#### Movement Reference Types
`WorkOrder` | `Manual` | `Vendor` | `PurchaseOrder`

#### Reorder Alerts
- Triggered when `available_quantity ≤ minimum_quantity`
- Reorder status: Open → Acknowledged → Ordered

---

### Screen 11: FuelPage — `/fleet/fuel`

**Purpose:** Fuel consumption analytics and energy management.

#### Fuel Event Sources
`Pump` | `Fuel Card` | `Browser (manual entry)`

#### Metrics Displayed
- Average KM per liter
- Fuel cost per KM
- AdBlue-to-fuel ratio %
- Energy anomalies (Theft, Sudden Drop, Abnormal Consumption, AdBlue Under-Consumption)
- Maintenance signals (AdBlue System Check, Fuel System Check, Engine Tuning)

---

### Screen 12: CostHealthPage — `/fleet/cost`

**Purpose:** Cost health dashboard with confidence scoring.

#### Cost Categories
`FUEL` | `MAINTENANCE` | `TOLL` | `OTHER`

#### Confidence Flags
`ACTUAL` | `ESTIMATED` | `HIGH` | `MEDIUM` | `LOW`

#### Reconciliation Integration
Links to ReconciliationPage for variance analysis

---

### Screen 13: CompliancePage — `/fleet/compliance`

**Purpose:** Fleet-wide document compliance matrix.

#### Document Types (Vehicle)
`RC` | `INSURANCE` | `PUC` | `PERMIT` | `FITNESS`

#### Document Statuses
`VALID` | `EXPIRED` | `EXPIRING_SOON` | `MISSING`

#### Status Colors
Valid = Green | Expired = Red | Expiring Soon = Amber | Missing = Gray

---

### Screen 14: DriverBehaviorPage — `/fleet/behavior`

**Purpose:** Driver behavior event analytics and trends.

#### Behavior Event Types
`HARSH_BRAKING` | `HARSH_ACCELERATION` | `OVERSPEED` | `EXCESSIVE_IDLING` | `NIGHT_DRIVING` | `ROUTE_DEVIATION`

#### Severity Levels
`HIGH` | `MEDIUM` | `LOW`

---

### Screen 15: ReconciliationPage — `/fleet/reconciliation`

**Purpose:** Cost event reconciliation — estimated vs actual variance.

#### Reconciliation Status
`OPEN` → `REVIEWED` → `RECONCILED`

---

### Screen 16: MarketplacePage — `/fleet/marketplace`

**Purpose:** Marketplace provider management for rented/leased fleet.

#### Provider Details
- Contact, address, fleet size, contract term dates
- Provider types: Rental, Leasing, Contract

---

### Screen 17: DataCoveragePage — `/fleet/data-coverage`

**Purpose:** Data quality and coverage metrics per vehicle.

#### Coverage Dimensions
- Fuel data coverage
- Telematics coverage
- Maintenance records coverage
- Document completeness

#### Coverage Status
`Good` | `Warning` | `Poor`

---

### Screen 18: VendorManagementPage — `/fleet/vendors`

**Purpose:** Vendor registry and financial ledger.

#### Vendor Fields
Name | GSTIN | Address | Service Categories | Status (Active/Inactive)

#### Vendor Invoice Status
`SUBMITTED` → `APPROVED` → `PARTIALLY_PAID` → `PAID` | `REJECTED`

#### Payment Modes
`NEFT` | `RTGS` | `IMPS` | `CHEQUE` | `CASH` | `UPI`

---

### Tyre Intelligence Screens (7 Screens)

| Screen | Route | Purpose |
|---|---|---|
| TyreTrackerPage | `/fleet/tyre` | Fleet-wide tyre status overview |
| TyreDetailPage | `/fleet/tyre/:id` | Individual tyre profile and history |
| TyreAnalyticsPage | `/fleet/tyre-analytics` | TPI score, wear rate, cost per km |
| TyreIndentsPage | `/fleet/tyre-indents` | Indent request workflow |
| TyreJobsPage | `/fleet/tyre-jobs` | Job card management |
| TyreInspectionsPage | `/fleet/tyre-inspections` | Inspection records |
| VehicleMasterPage | — | Vehicle type master (wraps TyreAppProvider) |

### Battery Screens (2 Screens)

| Screen | Route | Purpose |
|---|---|---|
| BatteryPage | `/fleet/batteries` | Battery inventory and health |
| BatteryDetailsPage | `/fleet/batteries/:id` | Individual battery profile + installation history |

---

## 4. Feature Inventory

| # | Feature | Status | Location |
|---|---|---|---|
| F-01 | Vehicle registry (CRUD) | Live | FleetPage |
| F-02 | Driver registry (CRUD + Bulk Import) | Live | DriversPage |
| F-03 | Vehicle detail with 7 tabs | Live | VehicleDetailsPage |
| F-04 | Driver detail with 5 tabs | Live | DriverDetailsPage |
| F-05 | Maintenance scheduling & templates | Live | MaintenancePage |
| F-06 | Work order management | Live | MaintenancePage |
| F-07 | Work order parts (issue/consume) | Live | MaintenancePage |
| F-08 | Work order vendor invoicing | Live | MaintenancePage |
| F-09 | Garage visit management | Live | GaragePage |
| F-10 | Garage closure (OPS + FINANCE approval) | Live | GaragePage |
| F-11 | Live GPS tracking (Google Maps) | Live | LiveMapPage |
| F-12 | Historical route playback (Leaflet) | Live | LiveMapPage → HistoryPlaybackModal |
| F-13 | Vehicle compliance (5 document types) | Live | CompliancePage, VehicleDetailsPage |
| F-14 | Driver behavior monitoring (6 event types) | Live | DriverBehaviorPage, DriverDetailsPage |
| F-15 | Exception management (Acknowledge/Resolve) | Live | ExceptionCenterPage |
| F-16 | Exception polling every 30s | Live | FleetRouteWrapper |
| F-17 | Fuel analytics + AdBlue tracking | Live | FuelPage |
| F-18 | Energy anomaly detection | Live | FuelPage, DashboardPage |
| F-19 | Cost health + confidence scoring | Live | CostHealthPage |
| F-20 | Cost reconciliation | Live | ReconciliationPage |
| F-21 | Spare parts inventory | Live | InventoryPage |
| F-22 | Inventory movement tracking (7 types) | Live | InventoryPage |
| F-23 | Vendor management + invoicing | Live | VendorManagementPage |
| F-24 | Tyre intelligence (7 screens) | Live | Tyre* pages |
| F-25 | Tyre indent workflow | Live | TyreIndentsPage |
| F-26 | Tyre job card management | Live | TyreJobsPage |
| F-27 | Battery inventory + health tracking | Live | BatteryPage |
| F-28 | Battery installation tracking | Live | BatteryDetailsPage |
| F-29 | Vehicle tracking device management | Live | VehicleDetailsPage |
| F-30 | Vehicle component management | Live | VehicleDetailsPage |
| F-31 | AI insights panel (dashboard) | Live | DashboardPage |
| F-32 | Marketplace / rental provider management | Live | MarketplacePage |
| F-33 | Data coverage metrics | Live | DataCoveragePage |
| F-34 | Fleet-wide KPI dashboard | Live | DashboardPage |
| F-35 | Ops intelligence | Live | OpsIntelligencePage |
| F-36 | Alert management | Live | AlertManagementPage |
| F-37 | Trip dispatch | Live | DispatchPage |
| F-38 | Bulk vehicle onboard | **DISABLED** | FleetPage (button present, not enabled) |
| F-39 | Reporting / export | **MISSING** | Not found |
| F-40 | Real backend API | **MISSING** | Entire module on mock data |

---

## 5. Vehicle Lifecycle

```
DRAFT
  └──► ACTIVE (requires: VIN, Engine Number, all required fields)
            ├──► MAINTENANCE (vehicle sent to garage/workshop)
            │       └──► ACTIVE (after repair/service)
            ├──► INACTIVE (decommissioned temporarily)
            └──► RETIRED (permanent end of service)
```

### Derived Live Status (Telematics)
```
Last ping > threshold  → OFFLINE
Speed > 0, ignition ON → MOVING
Speed = 0, ignition ON → IDLE / LONG_IDLE (if idle > threshold)
Ignition OFF           → STOPPED
In WorkOrder (active)  → MAINTENANCE
```

### Document Compliance Status
```
expiry_date > today + 30 days → VALID
expiry_date within 30 days   → EXPIRING_SOON
expiry_date < today          → EXPIRED
No document uploaded         → MISSING
```

---

## 6. Driver Lifecycle

```
DRAFT
  └──► ACTIVE
            ├──► ON_LEAVE (temporary absence)
            │       └──► ACTIVE
            ├──► SUSPENDED (disciplinary)
            │       └──► ACTIVE (reinstated) | INACTIVE
            └──► INACTIVE (permanent)
```

### License Types
`LMV` (Light Motor Vehicle) | `HMV` (Heavy Motor Vehicle) | `MCWG` | `HAZMAT`

### Driver Document Types
`AADHAAR` | `PAN` | `MEDICAL_CERTIFICATE` | `POLICE_VERIFICATION`

---

## 7. Maintenance & Work Order Lifecycle

### Work Order Status
```
OPEN → IN_PROGRESS → COMPLETED → CLOSED
```

### Work Order Types
`REPAIR` | `BREAKDOWN` | `SERVICE`

### Workshop Types
`INTERNAL` | `THIRD_PARTY` | `ROADSIDE`

### Issue Sources
`DRIVER` | `OPS` | `TELEMATICS` | `SYSTEM`

### Maintenance Schedule Status
`UPCOMING` | `DUE` | `OVERDUE`

### Work Order Parts Workflow
```
PLANNED → ISSUED → CONSUMED → RETURNED
```

### Template Structure
```
MaintenanceTemplate
  └── items[]:
        - name, component_type
        - maintenance_type (Service/Repair/Inspection)
        - frequency_km
        - criticality (High/Medium/Low)
```

### Cost Confidence Flags
`ACTUAL` | `ESTIMATED` | `HIGH` | `MEDIUM` | `LOW`

---

## 8. Garage Visit Lifecycle

```
Vehicle arrives → CHECKED_IN
  └──► IN_PROGRESS (work begins)
            └──► COMPLETED (work done)
                      └──► Closure Workflow:
                                DRAFT
                                  └──► READY_FOR_APPROVAL
                                            └──► OPS_APPROVED
                                                      └──► FINANCE_APPROVED
                                                                └──► CLOSED
                                          (rejected at any stage) → REJECTED
```

### Visit Reasons
`SCHEDULED_SERVICE` | `BREAKDOWN` | `ACCIDENT` | `INSPECTION` | `OTHER`

### Garage Types
`INTERNAL` | `EXTERNAL`

### Approval Levels
`OPS` | `FINANCE`

### Cost Summary Fields
- Parts cost
- Labour cost
- Service charges
- GST breakdown (CGST / SGST / IGST)
- Total amount
- Amount paid
- Balance amount

---

## 9. Tyre Intelligence Subsystem

### Tyre Status Lifecycle
```
IN_STORE → ALLOCATED → ISSUED → FITTED
  ├──► RETREAD_IN_PROGRESS → FITTED (if retread OK) | SCRAPPED (if rejected)
  ├──► AWAITING_DECISION (damage/wear decision needed)
  └──► SCRAPPED → SOLD / DISPOSED
```

### Tyre Position Model
```typescript
{
  axleIndex: number  // 1-based
  side: 'Left' | 'Right'
  position: 'Inner' | 'Outer' | 'Single' | 'Spare'
}
```

### Job Card Types
`REPLACEMENT` | `ROTATION` | `INSPECTION` | `ALIGNMENT`

### Job Status
`OPEN` → `IN_PROGRESS` → `COMPLETED` | `CANCELLED`

### Tyre Signal Types (TPMS)
`PRESSURE_LOW` | `PRESSURE_HIGH` | `TEMP_HIGH` | `PUNCTURE` | `BURST` | `WEAR_LIMIT`

### Tyre Removal Reasons
`WEAR` | `DAMAGE` | `ROTATION` | `EOL` (End of Life) | `ABNORMAL_WEAR`

### Tyre Indent Workflow
```
PENDING → APPROVED → ORDERED → RECEIVED
        → REJECTED
```

### Indent Priority
`NORMAL` | `URGENT` | `CRITICAL`

### Tyre Audit Trail (ActionType)
`CREATED` | `FITTED` | `REMOVED` | `INSPECTED` | `RETREAD_SENT` | `RETREAD_COMPLETED` |
`RETREAD_REJECTED` | `REPAIR_LOGGED` | `DEFECT_CREATED` | `SCRAPPED` | `JOB_CREATED` |
`JOB_COMPLETED` | `STOCK_RECEIVED` | `STOCK_TRANSFERRED` | `ROTATION` | `SCRAP_SOLD` |
`ALIGNMENT_JOB_CREATED` | `SENSOR_LINKED`

### Tyre Analytics Metrics
- TPI (Tyre Performance Index) score
- Wear rate (mm per km)
- Cost per km
- Expected life km vs actual

---

## 10. Battery Management Lifecycle

### Battery Status
```
IN_STOCK → INSTALLED
             └──► FAILED → SCRAPPED
```

### Battery Types
`STARTER` | `AUXILIARY` | `REEFER`

### Battery Health Status
`GOOD` | `WEAK` | `CRITICAL`

### Battery Failure Types
`SUDDEN` | `GRADUAL` | `NO_CRANK` | `PHYSICAL_DAMAGE` | `OTHER`

### Tracking Fields
- `capacity_ah`, `voltage`, `warranty_months`, `warranty_expiry_date`
- `purchase_cost`, `purchase_date`
- `odometer_at_install`, `odometer_at_removal`
- `removal_reason`

---

## 11. Form Analysis

### Form 1: Add / Edit Vehicle

| Field | Type | Required | Validation / Notes |
|---|---|---|---|
| `registration_number` | text | Yes | Unique |
| `chassis_number` | text | Conditional | Required if status = Active |
| `engine_number` | text | Conditional | Required if status = Active |
| `make` | text | No | — |
| `model` | text | No | — |
| `manufacturing_year` | number | No | — |
| `vehicle_type` | enum select | Yes | Truck/Container/Trailer/Tanker |
| `axle_configuration` | enum select | Yes | 4x2/6x2/6x4/Multi-Axle |
| `capacity_tons` | number | Yes | > 0 |
| `gvw_tons` (gvwr) | number | No | — |
| `ownership_type` | enum select | Yes | Owned/Leased/Rented |
| `fuel_type` | enum select | Yes | Diesel/CNG/Electric |
| `emission_standard` | enum select | No | BS3/BS4/BS6 |
| `status` | enum select | Yes | Active requires complete fields |
| `assigned_driver_id` | dropdown | No | Available drivers list |
| `maintenance_template_id` | dropdown | No | Maintenance templates |
| `marketplace_provider_id` | dropdown | Conditional | Required if Leased/Rented |

### Form 2: Add / Edit Driver

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | text | Yes | Non-empty |
| `phone` | text | Yes | Indian mobile format |
| `alternate_phone` | text | No | — |
| `license_number` | text | Yes | Unique |
| `license_expiry_date` | date | Yes | Future date |
| `driver_type` | enum | Yes | Permanent/Contract/Temporary |
| `employment_start_date` | date | No | — |
| `home_location` | text | No | — |
| `status` | enum | Yes | — |
| `assigned_vehicle_id` | dropdown | No | Active vehicles |
| `profile_picture_url` | text/upload | No | — |

### Form 3: Create Work Order

| Field | Type | Required | Notes |
|---|---|---|---|
| `vehicle_id` | dropdown | Yes | Active vehicles |
| `issue_type` | text | Yes | Free text |
| `type` | enum | Yes | Repair/Breakdown/Service |
| `odometer_reading` | number | Yes | > 0 |
| `workshop_name` | text | Yes | — |
| `workshop_type` | enum | Yes | Internal/Third Party/Roadside |
| `start_date` | date | Yes | — |
| `status` | enum | Yes | Default: Open |
| `reported_by` | enum | Yes | Driver/Ops/Telematics/System |
| `location` | text | Conditional | Required if Roadside |
| `is_immobilized` | boolean | No | Default: false |
| `towing_required` | boolean | No | Default: false |

### Form 4: Upload Vehicle Document

| Field | Type | Required | Validation |
|---|---|---|---|
| `document_type` | enum | Yes | RC/Insurance/PUC/Permit/Fitness |
| `document_number` | text | Yes | Non-empty |
| `issue_date` | date | Yes | Past date |
| `expiry_date` | date | Yes | Future date, > issue_date |
| `document_url` | file upload | No | — |

### Form 5: Install Tracking Device

| Field | Type | Required | Notes |
|---|---|---|---|
| `device_kind` | enum | Yes | GPS/SIM/Manual/Driver App |
| `is_primary` | boolean | Yes | One primary per vehicle |
| `manufacturer` | text | Yes | — |
| `model` | text | Yes | — |
| `serial_number` | text | Yes | Unique |
| `imei` | text | Conditional | Required for GPS/SIM |
| `sim_iccid` | text | Conditional | Required for SIM |
| `mobile_number` | text | Conditional | Required for SIM |
| `protocol` | enum | Yes | GT06/Teltonika/Concox/Queclink/Other |
| `install_date` | date | Yes | — |
| `installer_vendor` | text | Yes | — |
| `mounting_location` | text | Yes | — |
| `power_source` | enum | Yes | OBD/Direct Wire/Internal Battery |
| `ignition_wired` | boolean | No | Default: false |
| `odometer_at_install` | number | Yes | — |
| `server_host` | text | Yes | — |
| `server_port` | text | Yes | — |
| `apn` | text | Yes | — |
| `reporting_interval_sec` | number | Yes | — |
| `idle_interval_sec` | number | No | — |
| `heartbeat_interval_sec` | number | No | — |
| `timezone` | text | No | Default: Asia/Kolkata |

### Form 6: Add Vendor Invoice

| Field | Type | Required | Notes |
|---|---|---|---|
| `vendor_id` | dropdown | Yes | Active vendors |
| `invoice_number` | text | Yes | Unique |
| `invoice_date` | date | Yes | — |
| `line_items[]` | array | Yes | Min 1 item |
| `item_type` | enum | Yes | Part/Labour/Service |
| `description` | text | Yes | — |
| `quantity` | number | Yes | > 0 |
| `rate` | number | Yes | > 0 |
| `gst_rate` | number | Yes | % |

### Form 7: Add Vehicle Component

| Field | Type | Required |
|---|---|---|
| `component_type` | enum | Yes |
| `serial_number` | text | Yes |
| `make` | text | Yes |
| `model` | text | Yes |
| `installation_date` | date | Yes |
| `remarks` | text | No |

### Form 8: Tyre Indent Request

| Field | Type | Required | Notes |
|---|---|---|---|
| `requestedBy` | text | Yes | — |
| `requestedByRole` | enum | Yes | UserRole |
| `location` | text | Yes | — |
| `priority` | enum | Yes | Normal/Urgent/Critical |
| `justification` | text | Yes | — |
| `items[].brand` | text | Yes | — |
| `items[].model` | text | Yes | — |
| `items[].size` | text | Yes | — |
| `items[].quantity` | number | Yes | > 0 |
| `items[].estimatedCost` | number | No | — |

---

## 12. API Catalog

> **Critical Note:** All APIs are mock implementations (`mockDatabase.ts`, `mockDatabase1.ts`, `mockDatabase2.ts`) with simulated delays. No real HTTP endpoints are wired.

### Vehicle APIs (`VehicleAPI`)

| Function | Method | Purpose | Returns |
|---|---|---|---|
| `getAll()` | GET (mock) | All vehicles | `Vehicle[]` |
| `getById(id)` | GET (mock) | Single vehicle | `Vehicle \| undefined` |
| `create(payload)` | POST (mock) | Create vehicle | `Vehicle` |
| `update(id, payload)` | PATCH (mock) | Update vehicle | `Vehicle` |
| `delete(id)` | DELETE (mock) | Remove vehicle | `void` |

### Driver APIs (`DriverAPI`)

| Function | Purpose | Returns |
|---|---|---|
| `getAll()` | All drivers | `Driver[]` |
| `getById(id)` | Single driver | `Driver \| undefined` |
| `create(payload)` | Create driver | `Driver` |
| `update(id, payload)` | Update driver | `Driver` |
| `delete(id)` | Remove driver | `void` |
| `validateBulkImport(file)` | Validate CSV | `BulkValidationResult` |
| `importBulk(data)` | Import parsed rows | `void` |

### Maintenance APIs (`MaintenanceAPI`)

| Function | Purpose | Returns |
|---|---|---|
| `getSchedules()` | All maintenance schedules | `MaintenanceSchedule[]` |
| `getWorkOrders()` | All work orders | `WorkOrder[]` |
| `getTemplates()` | Maintenance templates | `MaintenanceTemplate[]` |
| `getVehicleSchedule(vehicleId)` | Vehicle-specific schedule | `VehicleMaintenanceItem[]` |
| `getComponentHistory(vehicleId)` | Component history | `ComponentHistoryRecord[]` |
| `createWorkOrder(payload)` | Create WO | `WorkOrder` |
| `updateWorkOrder(id, payload)` | Update WO | `WorkOrder` |
| `getVehicleHealth(vehicleId)` | Vehicle health score | `VehicleMaintenanceHealth` |
| `getDashboardKPIs()` | KPI summary | `MaintenanceKPIs` |
| `getParts(workOrderId)` | WO parts | `WorkOrderPart[]` |
| `addPart(payload)` | Add part to WO | `WorkOrderPart` |
| `issuePart(woPartId)` | Issue part (PLANNED→ISSUED) | `void` |
| `consumePart(woPartId)` | Consume part (ISSUED→CONSUMED) | `void` |

### Compliance APIs (`ComplianceAPI`)

| Function | Purpose | Returns |
|---|---|---|
| `getDocuments(vehicleId)` | Vehicle docs | `VehicleDocument[]` |
| `getAllDocuments()` | All docs | `VehicleDocument[]` |
| `uploadDocument(payload)` | Upload new doc | `VehicleDocument` |
| `updateDocument(id, payload)` | Update doc | `VehicleDocument` |

### Exception APIs (`ExceptionAPI`)

| Function | Purpose | Returns |
|---|---|---|
| `getAll()` | All exceptions | `OpsException[]` |
| `getById(id)` | Single exception | `OpsException` |
| `updateStatus(id, status, notes?)` | Acknowledge/Resolve | `OpsException` |

### Energy APIs (`EnergyAPI`)

| Function | Purpose | Returns |
|---|---|---|
| `getAnomalies()` | Energy anomalies | `EnergyAnomaly[]` |
| `getMetrics(vehicleId)` | Vehicle energy metrics | `EnergyMetrics \| null` |
| `getMaintenanceSignals()` | Energy maintenance signals | `EnergyMaintenanceSignal[]` |

### Tracking Device APIs (`TrackingDeviceAPI`)

| Function | Purpose | Returns |
|---|---|---|
| `getAllByVehicleId(vehicleId)` | Vehicle trackers | `VehicleTrackingDevice[]` |
| `install(payload)` | Install tracker | `VehicleTrackingDevice` |
| `updateConfig(id, payload)` | Update config | `VehicleTrackingDevice` |
| `setPrimary(id)` | Set as primary | `VehicleTrackingDevice` |
| `remove(id)` | Remove tracker | `void` |

### Inventory APIs (`InventoryAPI`)

| Function | Purpose | Returns |
|---|---|---|
| `getParts()` | All spare parts | `SparePart[]` |
| `getStock(hubId)` | Stock levels by hub | `InventoryStock[]` |
| `getMovements(partId)` | Movement history | `InventoryMovement[]` |

### Vendor & Invoice APIs

| Function | Purpose | Returns |
|---|---|---|
| `VendorAPI.getAll()` | All vendors | `Vendor[]` |
| `VendorAPI.create(payload)` | Create vendor | `Vendor` |
| `InvoiceAPI.getByWorkOrder(id)` | WO invoices | `VendorInvoice[]` |
| `InvoiceAPI.create(payload)` | Create invoice | `VendorInvoice` |

### Garage APIs (`GarageAPI`, `GarageVisitAPI`)

| Function | Purpose | Returns |
|---|---|---|
| `GarageAPI.getAll()` | All garages | `Garage[]` |
| `GarageVisitAPI.getAll()` | All visits | `GarageVisit[]` |
| `GarageVisitAPI.create(payload)` | Create visit | `GarageVisit` |
| `GarageVisitAPI.close(id, payload)` | Close visit | `GarageVisit` |
| `GarageVisitAPI.validateReadiness(visitId, data)` | Check closure readiness | `boolean` |
| `GarageVisitAPI.calculateCosts(visitId)` | Cost summary | `GarageVisitCostSummary` |

### Battery APIs (`BatteryAPI`)

| Function | Purpose | Returns |
|---|---|---|
| `getAll()` | All batteries | `Battery[]` |
| `getByVehicle(vehicleId)` | Vehicle batteries | `Battery[]` |
| `install(payload)` | Install battery | `BatteryInstallation` |
| `getInstallations(vehicleId)` | Installation history | `BatteryInstallation[]` |

### Other APIs

| API | Function | Returns |
|---|---|---|
| `TripAPI` | `getAll()`, `getById()`, `create()`, `update()` | `Trip` / `Trip[]` |
| `TelematicsAPI` | `getHistory(vehicleId?, trackerId?)` | `TelemetryEvent[]` |
| `TyreAPI` | `getHealthSignals()`, `getEventSignals()` | Tyre signals |
| `BehaviorAPI` | `getAll()`, `getByDriver(id)` | `DriverBehaviorEvent[]` |
| `ComponentAPI` | `getByVehicleId()`, `add()` | `VehicleComponent[]` |
| `MarketplaceAPI` | `getAll()` | `MarketplaceProvider[]` |
| `SyncAPI` | `getEnergySummary()` | `EnergySyncSummary[]` |
| `ConfidenceAPI` | `getVehicleConfidence(id)` | `VehicleConfidence` |

---

## 13. State Management

### Architecture
No Redux or Zustand. State is managed via:
- `useState` / `useReducer` within each page component
- Props drilling for child components
- `useFleetTabNavigate()` hook for tab → route conversion
- Exception polling via `FleetRouteWrapper` (30s interval, stored at route wrapper level)

### Key Page-Level State Patterns
```typescript
// DashboardPage
const [kpiData, setKpiData] = useState(null)
const [intelData, setIntelData] = useState(null)
const [buckets, setBuckets] = useState({healthy:[], atRisk:[], maintenance:[], nonCompliant:[], offline:[]})
const [liveAlerts, setLiveAlerts] = useState([])
const [lastUpdated, setLastUpdated] = useState(null)

// FleetPage
const [vehicles, setVehicles] = useState<Vehicle[]>([])
const [search, setSearch] = useState('')
const [statusFilter, setStatusFilter] = useState('All')
const [typeFilter, setTypeFilter] = useState('All')
const [ownershipFilter, setOwnershipFilter] = useState('All')
const [page, setPage] = useState(1)
const [isAddModalOpen, setIsAddModalOpen] = useState(false)

// VehicleDetailsPage
const [vehicle, setVehicle] = useState<Vehicle | null>(null)
const [activeTab, setActiveTab] = useState('Overview')
const [components, setComponents] = useState<VehicleComponent[]>([])
const [documents, setDocuments] = useState<VehicleDocument[]>([])
const [trackers, setTrackers] = useState<VehicleTrackingDevice[]>([])
const [batteries, setBatteries] = useState<Battery[]>([])
```

### Tyre Intelligence State
- Managed via `TyreAppProvider` context (wraps tyre pages)
- Provides tyre inventory, vehicle types, jobs, indents, inspections state

---

## 14. RBAC Matrix

> No explicit permission code system found in fleet-web source. Access control inferred from role-based UI patterns and Tyre Intelligence UserRole enum.

### Tyre Intelligence Roles
| Role | Access Level |
|---|---|
| `Fleet Admin` | Full access: all tyre operations, indent approval, job management |
| `Maintenance Manager` | Work orders, garage visits, tyre jobs, battery management |
| `Ops / Viewer` | Dashboard, live map, exceptions — read only |
| `Driver` | Trip dispatch, behavior event submission |

### Implied Access Matrix (from UI conditional rendering)

| Feature | Fleet Admin | Maint. Manager | Ops/Viewer | Finance | Driver |
|---|---|---|---|---|---|
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create/Edit Vehicle | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create/Edit Driver | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Work Order | ✅ | ✅ | ❌ | ❌ | ❌ |
| Close Work Order | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve Garage (OPS) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve Garage (Finance) | ✅ | ❌ | ❌ | ✅ | ❌ |
| View Live Map | ✅ | ✅ | ✅ | ❌ | ❌ |
| Acknowledge Exception | ✅ | ✅ | ✅ | ❌ | ❌ |
| Resolve Exception | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Inventory | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve Vendor Invoice | ✅ | ❌ | ❌ | ✅ | ❌ |
| Manage Tyre Indents | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve Tyre Indent | ✅ | ✅ | ❌ | ❌ | ❌ |
| Upload Documents | ✅ | ✅ | ❌ | ❌ | ❌ |
| Install Tracker | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Driver Behavior | ✅ | ❌ | ✅ | ❌ | ❌ |
| Reconcile Costs | ✅ | ❌ | ❌ | ✅ | ❌ |

---

## 15. Business Rules Catalog

| # | Rule | Detail |
|---|---|---|
| BR-01 | Active vehicle requires VIN + Engine Number | Validated on status = Active in add/edit form |
| BR-02 | Vehicle status Active → all required fields mandatory | Client-side validation on submit |
| BR-03 | License expiry warning threshold | 30 days — filter shows expiring soon |
| BR-04 | Document EXPIRING_SOON threshold | 30 days from expiry date |
| BR-05 | Offline threshold | Configurable per tracker: `staleAfterMinutes` |
| BR-06 | One primary tracker per vehicle | `is_primary = true` — only one allowed |
| BR-07 | Tyre position model | axleIndex (1-based), side (Left/Right), position (Inner/Outer/Single/Spare) |
| BR-08 | Dual axle = 4 tyre positions | `isDual = true` in AxleDefinition |
| BR-09 | Work order part lifecycle | PLANNED → ISSUED → CONSUMED (cannot skip) |
| BR-10 | Garage closure requires OPS then FINANCE approval | Sequential — FINANCE cannot approve before OPS |
| BR-11 | Battery warranty tracking | `warranty_expiry_date = purchase_date + warranty_months` |
| BR-12 | Tyre indent priority | Normal → Urgent → Critical (processing priority order) |
| BR-13 | Reorder alert threshold | Triggered when `available_quantity ≤ minimum_quantity` |
| BR-14 | Fleet readiness % | `active_vehicles / total_vehicles * 100` |
| BR-15 | Delay detection | `isBookingDelayCandidate` equivalent not found — delay via ExceptionAPI |
| BR-16 | Marketplace provider required | Leased/Rented vehicles must have `marketplace_provider_id` |
| BR-17 | Vehicle health score | Good / Watch / Critical (derived from maintenance signals) |
| BR-18 | Energy anomaly confidence | ACTUAL > ESTIMATED; HIGH > MEDIUM > LOW |
| BR-19 | Bulk import validation | validCount + errorCount determines import proceed/block |
| BR-20 | Tyre retread rejection → SCRAPPED | If retread rejected, tyre goes to AWAITING_DECISION → SCRAPPED |
| BR-21 | GST breakup | CGST + SGST (intra-state) or IGST (inter-state) |
| BR-22 | Inventory movement reference required | `reference_type` + `reference_id` mandatory on all movements |
| BR-23 | Exception polling interval | Every 30 seconds (hardcoded in FleetRouteWrapper) |
| BR-24 | Work order immobilized flag | If `is_immobilized = true`, towing_required becomes relevant |
| BR-25 | Confidence scoring priority | ACTUAL > ESTIMATED for cost data; HIGH > MEDIUM > LOW for metrics |

---

## 16. Dependency Matrix

| Feature | Component / Page | API | State | Role Required | Upstream | Downstream |
|---|---|---|---|---|---|---|
| Vehicle Registry | FleetPage | VehicleAPI | Local useState | Fleet Admin | — | TMS (vehicle availability) |
| Driver Registry | DriversPage | DriverAPI | Local useState | Fleet Admin | — | TMS (driver availability) |
| Maintenance Scheduling | MaintenancePage | MaintenanceAPI | Local useState | Maint. Manager | Vehicle master | Garage, Inventory |
| Work Order Parts | MaintenancePage modal | MaintenanceAPI, InventoryAPI | Local useState | Maint. Manager | Inventory stock | Cost reconciliation |
| Garage Closure | GaragePage | GarageVisitAPI, InvoiceAPI | Local useState | OPS + Finance | Work orders | Finance module |
| Live Tracking | LiveMapPage | TelematicsAPI, VehicleAPI | Local useState | Ops/Viewer | Track & Trace (GPS feed) | — |
| History Playback | HistoryPlaybackModal | TelematicsAPI | Props | Ops/Viewer | Telematics history | — |
| Compliance Docs | CompliancePage, VehicleDetailsPage | ComplianceAPI | Local useState | Fleet Admin | Document uploads | Ops exceptions |
| Exception Management | ExceptionCenterPage | ExceptionAPI | FleetRouteWrapper (30s poll) | Ops/Viewer | All modules | — |
| Vendor Invoicing | MaintenancePage, VendorMgmtPage | VendorAPI, InvoiceAPI | Local useState | Finance | Work orders | Finance module |
| Battery Management | BatteryPage, VehicleDetailsPage | BatteryAPI, MaintenanceAPI | Local useState | Maint. Manager | Battery inventory | Cost tracking |
| Tyre Intelligence | TyreAppProvider + 7 pages | Tyre mock DB | TyreAppProvider context | Fleet Admin/Maint. | Tyre inventory | Cost, Inventory |
| Driver Behavior | DriverBehaviorPage | BehaviorAPI | Local useState | Ops/Viewer | Telematics/Driver app | Exception generation |
| AI Insights | AIInsightsPanel | All dashboard APIs | DashboardPage state | All | All modules | — |
| Energy/Fuel | FuelPage | EnergyAPI, SyncAPI | Local useState | Ops/Viewer | Telematics fuel data | Cost reconciliation |

---

## 17. Edge Cases

| Scenario | Current Handling |
|---|---|
| Vehicle not found by ID | `VehicleAPI.getById()` returns `undefined`; page likely shows empty state |
| No drivers available for assignment | Vehicle dropdown shows empty; assignment skipped |
| Tracker with no IMEI (Manual/Driver App) | IMEI field conditionally hidden |
| Only one delivery → Remove button hidden | `deliveries.length > 1` check (TMS pattern mirrored) |
| Document expired on upload | Validation: `expiry_date > today` enforced |
| Bulk import with errors | Blocked from proceeding; error list shown in review step |
| Battery warranty expired | `warranty_expiry_date < today` — shown as expired in UI |
| Tyre retread rejected | Status forced to AWAITING_DECISION → manual SCRAPPED decision |
| Garage closure without OPS approval | FINANCE approval blocked until OPS approved |
| Reorder below minimum stock | Alert generated; status = OPEN |
| No active primary tracker | Vehicle shown as OFFLINE on live map |
| Energy anomaly with LOW confidence | Shown with confidence badge; lower priority |
| Exception API poll failure | No explicit error handling observed — silent failure risk |
| Concurrent work order closure | No optimistic locking — last write wins (mock store) |
| Tyre in AWAITING_DECISION > threshold | No automated escalation observed |
| Multiple batteries installed | BatteryAPI returns all; health status per battery |
| Garage visit with no linked WO | Allowed — `linked_work_order_ids` is optional |
| Driver on leave assigned to trip | No explicit block observed — assignment proceeds |
| Vehicle in Maintenance assigned to trip | No explicit block observed |

---

## 18. Hidden Features & Technical Debt

### Disabled / Stub Features

| Feature | Location | Status |
|---|---|---|
| Bulk Vehicle Onboard | FleetPage | Button rendered but **NOT ENABLED** |
| Real backend API | Entire module | All data via `mockDatabase.ts` — no HTTP wired |
| Export / Reports | Not found | No export buttons in any screen |
| Push notifications | Not found | No notification wiring |
| Role-based permission codes | Not found | No discrete permission system — role inferred |

### Technical Debt

| Item | Severity | Detail |
|---|---|---|
| **Entire module on mock data** | Critical | 3 mock database files (`mockDatabase.ts`, `mockDatabase1.ts`, `mockDatabase2.ts`) — no HTTP layer |
| **No global state management** | High | All state is local to pages — no Redux/Zustand/Context (except TyreAppProvider) — causes prop drilling |
| **Exception polling hardcoded 30s** | Medium | `FleetRouteWrapper` interval not configurable |
| **30-page component complexity** | Medium | Large pages like `VehicleDetailsPage`, `MaintenancePage` likely 500-2000+ lines each |
| **No optimistic locking** | Medium | Concurrent mutations silently overwrite |
| **Driver-on-leave / vehicle-in-maintenance not blocking dispatch** | Medium | No guard preventing assignment of unavailable resources |
| **Silent exception poll failure** | Medium | No error handling if `ExceptionAPI.getAll()` fails during polling |
| **Tyre subsystem isolated** | Low | Separate `TyreAppProvider` context not integrated with main fleet state |
| **3 separate mock DB files** | Low | Data not normalized across `mockDatabase.ts`, `mockDatabase1.ts`, `mockDatabase2.ts` |
| **AI Insights hardcoded** | Low | `AIInsightsPanel` likely renders pre-written insight templates, not real ML |
| **Google Maps API key dependency** | Low | LiveMapPage fails silently without key |

---

## 19. Missing Features Report

| # | Feature | Priority | Detail |
|---|---|---|---|
| MF-01 | Real backend API | Critical | Entire module on in-memory mock — no HTTP integration |
| MF-02 | Bulk vehicle onboard | High | Button exists but disabled |
| MF-03 | Export / download | High | No export anywhere — no PDF, CSV, Excel |
| MF-04 | Role-based permission system | High | No discrete permission codes — role names used informally |
| MF-05 | Trip assignment guard (vehicle/driver unavailable) | High | No block preventing dispatch of maintenance/suspended resources |
| MF-06 | Real AI insights | Medium | AI panel likely template-based, not real ML/LLM |
| MF-07 | Push/email alerts for expiry | Medium | Document/license expiry has no notification trigger |
| MF-08 | Tyre sensor (TPMS) live feed | Medium | TyreSignalType defined but no live sensor integration |
| MF-09 | Fuel card integration | Medium | Fuel Card defined as source but no integration |
| MF-10 | Driver self-service (mobile) | Medium | Driver role defined but no driver-facing portal in fleet-web |
| MF-11 | Fleet reporting dashboard | Medium | No dedicated reports screen |
| MF-12 | Route optimization | Low | Not found |
| MF-13 | OBD device live data | Low | OBD power source defined but no OBD API |
| MF-14 | Tyre retread vendor integration | Low | Retread status defined but no vendor workflow |
| MF-15 | Battery predictive failure | Low | Health scoring exists; no predictive model |
| MF-16 | Inventory purchase order flow | Low | `PurchaseOrder` as reference type exists; no PO screen |
| MF-17 | Vendor payment tracking (full) | Low | PaymentStatus/Mode defined; payment recording UI not fully visible |
| MF-18 | Fleet utilization reporting | Low | Utilization % not shown as time-series |
| MF-19 | Geofence integration | Low | Not found in fleet-web (handled in track-trace-web) |
| MF-20 | SLA/SOP enforcement | Low | No SLA checks on maintenance windows |

---

## 20. Complete Type & Enum Reference

### Vehicle Enums

| Enum | Values |
|---|---|
| `VehicleType` | Truck, Container, Trailer, Tanker |
| `AxleConfiguration` | 4x2, 6x2, 6x4, Multi-Axle |
| `VehicleStatus` | Active, Maintenance, Inactive, Draft, Retired |
| `OwnershipType` | Owned, Leased, Rented |
| `FuelType` | Diesel, CNG, Electric |
| `EmissionStandard` | BS3, BS4, BS6 |
| `DerivedVehicleStatus` | Moving, Idle, Long Idle, Offline, Maintenance |

### Driver Enums

| Enum | Values |
|---|---|
| `DriverStatus` | Active, Inactive, Suspended, On Leave, Draft |
| `DriverType` | Permanent, Contract, Temporary |
| `LicenseType` | LMV, HMV, MCWG, HAZMAT |
| `DriverDocumentType` | Aadhaar, PAN, Medical Certificate, Police Verification |

### Maintenance Enums

| Enum | Values |
|---|---|
| `MaintenanceType` | Service, Repair, Inspection |
| `WorkOrderStatus` | Open, In Progress, Completed, Closed |
| `WorkOrderType` | Repair, Breakdown, Service |
| `WorkshopType` | Internal, Third Party, Roadside |
| `IssueSource` | Driver, Ops, Telematics, System |
| `ConfidenceFlag` | Actual, Estimated, High, Medium, Low |
| `MaintenanceHealthStatus` | Good, Watch, Critical |
| `WorkOrderPartStatus` | Planned, Issued, Consumed, Returned |

### Compliance Enums

| Enum | Values |
|---|---|
| `DocumentType` | RC, Insurance, PUC, Permit, Fitness |
| `DocumentStatus` | Valid, Expired, Expiring Soon, Missing |

### Garage Enums

| Enum | Values |
|---|---|
| `GarageType` | Internal, External |
| `GarageVisitStatus` | Checked In, In Progress, Completed, Cancelled |
| `GarageClosureStatus` | Draft, Ready for Approval, Ops Approved, Finance Approved, Closed, Rejected |
| `VisitReason` | Scheduled Service, Breakdown, Accident, Inspection, Other |
| `GarageApprovalLevel` | Ops, Finance |

### Tyre Enums

| Enum | Values |
|---|---|
| `TyreStatus` | In Store, Allocated, Issued, Fitted, Retread In Progress, Awaiting Decision, Scrapped, Sold/Disposed |
| `TyreSignalType` | Pressure Low, Pressure High, Temp High, Puncture, Burst, Wear Limit |
| `JobStatus` | Open, In Progress, Completed, Cancelled |
| `RemovalReason` | Wear, Damage, Rotation, EOL, Abnormal Wear |
| `IndentStatus` | Pending, Approved, Rejected, Ordered, Received |

### Battery Enums

| Enum | Values |
|---|---|
| `BatteryStatus` | In Stock, Installed, Failed, Scrapped |
| `BatteryType` | Starter, Auxiliary, Reefer |
| `BatteryHealthStatus` | Good, Weak, Critical |
| `BatteryFailureType` | Sudden, Gradual, No Crank, Physical Damage, Other |

### Inventory & Finance Enums

| Enum | Values |
|---|---|
| `PartCategory` | Filter, Fluid, Brake, Clutch, Electrical, Suspension, Engine Part, Body Part, Tyre, Belt, Steering, Other |
| `MovementType` | In, Out, Reserve, Consume Reserved, Adjustment, Return |
| `InvoiceStatus` | Submitted, Approved, Rejected, Partially Paid, Paid |
| `PaymentStatus` | Paid, Pending, Failed |
| `PaymentMode` | NEFT, RTGS, IMPS, Cheque, Cash, UPI |
| `ReconciliationStatus` | Open, Reviewed, Reconciled |

### Tracking & Telemetry Enums

| Enum | Values |
|---|---|
| `TrackerProtocol` | GT06, Teltonika, Concox, Queclink, Other |
| `TrackerDeviceKind` | GPS Tracking, SIM Tracking, Manual, Driver App, Other |
| `TrackerPowerSource` | OBD Port, Direct Wire, Internal Battery Pack |
| `TrackerStatus` | Active, Inactive, Fault, Removed |
| `ComponentType` | Engine, Transmission, Axle, Battery, Tyre, Tracking Device, Other |
| `ComponentStatus` | Active, Inactive, Removed |

### Exception & Behavior Enums

| Enum | Values |
|---|---|
| `ExceptionSeverity` | Critical, High, Medium, Low |
| `ExceptionStatus` | Open, Acknowledged, Resolved |
| `BehaviorEventType` | Harsh Braking, Harsh Acceleration, Overspeed, Excessive Idling, Night Driving, Route Deviation |
| `BehaviorSeverity` | High, Medium, Low |
| `EnergyAnomalyType` | Theft, Sudden Drop, Abnormal Consumption, AdBlue Under Consumption |

### Trip Enums

| Enum | Values |
|---|---|
| `TripStatus` | Planned, Dispatched, In Transit, Completed, Cancelled |
| `CostCategory` | Fuel, Maintenance, Toll, Other |

---

*End of Fleet-Web Module Deep Code Review — Reverse-engineered from full source scan of `/modules/fleet-web/` (70 files)*
