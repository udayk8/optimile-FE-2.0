# Tenant-Admin-New Module — Complete Deep Code Review
**Module:** `/modules/tenant-admin-new/`
**Scan Date:** 2026-06-03
**Stack:** React + TypeScript + Vite | Zod validation | MockStore + optional real API
**Purpose:** Tenant-level administration — master data, user/role management, booking operations, LR config, module portal embedding, and RBAC enforcement

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Route Hierarchy](#2-route-hierarchy)
3. [Navigation & Sidebar Structure](#3-navigation--sidebar-structure)
4. [Screen Inventory](#4-screen-inventory)
5. [Feature Inventory](#5-feature-inventory)
6. [Booking Workflow](#6-booking-workflow)
7. [LR (Lorry Receipt) Workflow](#7-lr-lorry-receipt-workflow)
8. [Role & Permission System](#8-role--permission-system)
9. [Vendor Portal Bridge](#9-vendor-portal-bridge)
10. [Form Analysis](#10-form-analysis)
11. [API Catalog](#11-api-catalog)
12. [State Management](#12-state-management)
13. [RBAC Matrix](#13-rbac-matrix)
14. [Business Rules Catalog](#14-business-rules-catalog)
15. [Dependency Matrix](#15-dependency-matrix)
16. [Edge Cases](#16-edge-cases)
17. [Hidden Features & Technical Debt](#17-hidden-features--technical-debt)
18. [Missing Features Report](#18-missing-features-report)
19. [Complete Type & Enum Reference](#19-complete-type--enum-reference)

---

## 1. Architecture Overview

### Problem Domain
The tenant-level administration hub for Optimile. Serves as the control center for a single tenant's operations — managing master data (customers, vendors, drivers, vehicles, materials, UOM), users, roles, RBAC, hierarchy, org units, LR configuration, booking workflows, and embedded sub-module portals (Fleet, Track & Trace, Vendor, Customer, Finance, Auction).

### User Personas

| Persona | UserType | Access Level |
|---|---|---|
| Tenant Admin | `TENANT_ADMIN` | Full tenant admin — all pages, all actions |
| Internal User | `INTERNAL_USER` | Role-scoped — pages defined by assigned role |
| Vendor User | `VENDOR` | Vendor portal only — indents, fleet, trips |
| Customer User | `CUSTOMER` | Customer portal only |
| Driver User | `DRIVER` | Driver app only |

### Provider Stack (nesting order)
```
AuthProvider (@shared-auth)
  └── ThemeProvider
        └── SessionProvider
              └── MockStoreProvider
                    └── TenantLayout
                          └── PermissionGate (per route)
                                └── Pages (via Outlet)
```

### Rendering Modes
| Mode | Description |
|---|---|
| **Tenant Admin** | Full sidebar + all admin pages visible |
| **Vendor Portal** | Only vendor portal iframe/embed (`/vendor-portal/*`) |
| **Customer Portal** | Only customer portal embed (`/customer-portal`) |
| **Driver App** | Only driver-facing views |
| **Preview Mode** | Temporary session role override for access testing |

### Integration Architecture
```
tenant-admin-new
  ├── Embeds: track-trace-web    (/track-and-trace/*)
  ├── Embeds: fleet-web          (/fleet-management/*)
  ├── Embeds: vendor-web         (/vendor-portal/*)
  ├── Embeds: customer-web       (/customer-portal)
  ├── Embeds: finance-web        (/finance/*)
  └── Embeds: auction-web        (/auction-ams/*)
```

---

## 2. Route Hierarchy

```
/ → Redirect → /tenant/tenant-northstar/dashboard

/tenant/:tenantId
  ├── /dashboard                        ← TenantDashboardPage
  │
  ├── MASTER DATA
  ├── /customers                        ← TenantCustomersPage
  ├── /customers/:tenantCustomerId      ← TenantCustomerDetailPage
  ├── /vendors                          ← TenantVendorsPage
  ├── /vendors/new                      ← TenantVendorCreatePage
  ├── /vendors/:tenantVendorId/edit     ← TenantVendorEditPage
  ├── /vendors/:tenantVendorId          ← TenantVendorDetailPage
  ├── /drivers                          ← TenantDriversPage (Fleet module)
  ├── /drivers/new                      ← TenantDriverCreatePage
  ├── /drivers/:tenantDriverId/edit     ← TenantDriverEditPage
  ├── /vehicles                         ← TenantVehiclesPage (Fleet module)
  ├── /vehicles/new                     ← TenantVehicleCreatePage
  ├── /vehicles/:tenantVehicleId/edit   ← TenantVehicleEditPage
  ├── /vehicle-types                    ← TenantVehicleTypesPage
  ├── /materials                        ← TenantMaterialsPage
  ├── /uom-config                       ← TenantUOMConfigPage
  ├── /address-book                     ← TenantAddressBookPage
  │
  ├── USER & ACCESS
  ├── /users                            ← TenantUsersPage
  ├── /users/:userId                    ← TenantUserDetailPage
  ├── /roles                            ← TenantRolesPage
  ├── /roles/:roleId                    ← TenantRoleDetailPage
  ├── /role-permissions                 ← RolePermissionsPage
  │
  ├── HIERARCHY & ORG
  ├── /hierarchy                        ← TenantHierarchyPage
  ├── /org-units                        ← TenantOrgUnitsPage
  │
  ├── LR MANAGEMENT
  ├── /lr-config                        ← TenantLRConfigPage
  ├── /lr                               ← TenantLRManagementPage
  │
  ├── BOOKING (TMS)
  ├── /bookings                         ← BookingListPage
  ├── /bookings/create                  ← CreateBookingPage
  ├── /bookings/rate-approval           ← RateApprovalQueuePage
  ├── /bookings/assignment              ← AssignmentQueuePage
  ├── /bookings/live-tracking           ← LiveTrackingPlaceholderPage [STUB]
  ├── /bookings/completed               ← PODCompletedPage
  ├── /bookings/:bookingId              ← BookingDetailsPage
  ├── /bookings/:bookingId/edit         ← CreateBookingPage (edit mode)
  ├── /bookings/:bookingId/documents    ← BookingDocumentsPage
  ├── /bookings/:bookingId/lr           ← BookingLRViewPage
  │
  ├── BOOKING SETUP
  ├── /booking-setup                    ← BookingSetupOverviewPage
  ├── /assignment-rules                 ← TenantAssignmentRulesPage
  ├── /document-rules                   ← TenantDocumentRulesPage
  ├── /pod-rules                        ← TenantPodRulesPage
  ├── /shipment-documents               ← ShipmentDocumentsPage
  ├── /booking-reports                  ← BookingReportsPage
  │
  ├── GOVERNANCE
  ├── /audit-logs                       ← TenantAuditLogsPage
  ├── /settings                         ← TenantSettingsPage
  ├── /modules                          ← TenantModulesPage
  │
  └── EMBEDDED PORTALS
      ├── /track-and-trace/*            ← track-trace-web (embedded)
      ├── /fleet-management/*           ← fleet-web (embedded)
      ├── /vendor-portal/*              ← vendor-web (embedded)
      ├── /customer-portal              ← customer-web (embedded)
      ├── /finance/*                    ← finance-web (embedded)
      └── /auction-ams/*                ← auction-web (embedded)
```

### Permission Gate on Every Route
```typescript
<PermissionGate moduleCode="TMS" featureCode="CUSTOMERS" action="view">
  {children}
</PermissionGate>
```
- Access denied → redirect to `/dashboard` or portal homepage
- Vendor/Customer portal sessions bypass tenant RBAC

---

## 3. Navigation & Sidebar Structure

### Governance Section (Tenant Admin only)
```
Dashboard (LayoutDashboard icon)
```

### Administration Group
```
Hierarchy Setup      (Building2)   → /hierarchy
Org Units            (Building2)   → /org-units
Users                (Users)       → /users
Roles                (ShieldCheck) → /roles
Role Permissions     (ShieldCheck) → /role-permissions
Customers            (Users)       [CUSTOMERS feature]
Vendors              (Truck)       [VENDORS feature]
Vehicles             (Truck)       [VEHICLE_TYPES feature]
Drivers              (Users)       [VEHICLE_TYPES feature]
Vehicle Types        (Truck)       [VEHICLE_TYPES feature]
Materials            (Boxes)       [MATERIALS feature]
UOM                  (Boxes)       [UOM feature]
Address Book         (Building2)   [ADDRESS_BOOK feature]
LR Configuration     (ShieldCheck) [LR_CONFIGURATION feature]
LR Management        (ShieldCheck) [LR_MANAGEMENT feature]
Assignment Rules     (ShieldCheck) [ASSIGNMENT_RULES feature]
Document Rules       (ShieldCheck) [DOCUMENT_RULES feature]
POD Rules            (ShieldCheck) [POD_RULES feature]
```

### Booking Group (TMS module enabled)
```
Booking Dashboard    (Truck)       [BOOKING_DASHBOARD feature]
Create Booking       (Plus)        [CREATE_BOOKING feature, action: "create"]
Booking Assignment   (Truck)       [BOOKING_ASSIGNMENT feature]
Shipment Documents   (Truck)       [SHIPMENT_DOCUMENTS feature]
POD                  (ShieldCheck) [POD feature]
```

### Embedded Module Portals
```
Auction / AMS        (Gavel)    [AUCTION_DASHBOARD]  → /auction-ams/dashboard
Track & Trace        (MapPin)   [TRACKING_DASHBOARD] → /track-and-trace/dashboard
  ├── Dashboard
  ├── Live Map
  ├── Dispatch
  ├── Alerts
  ├── Geofences
  └── Route Performance
Vendor Portal        (Users)    [VENDOR_DASHBOARD]   → /vendor-portal/dashboard
Fleet Management     (Truck)    [FLEET_DASHBOARD]    → /fleet-management/dashboard
  ├── Fleet Dashboard       ├── Garage
  ├── Ops Intelligence      ├── Tyres
  ├── Exception Center      ├── Fuel
  ├── Live Map              ├── Cost Health
  ├── Dispatch              └── Fleet Settings
  ├── Vehicles
  ├── Drivers
  ├── Compliance
  └── Maintenance
Customer Portal      (UserCog)  [CUSTOMER_DASHBOARD] → /customer-portal
Finance              (Landmark) [FINANCE_DASHBOARD]  → /finance
```

---

## 4. Screen Inventory

### Screen 1: TenantDashboardPage — `/dashboard`

**Purpose:** Tenant admin governance overview — setup progress tracking.

#### KPI Cards
| Card | Metric |
|---|---|
| Org Units | count of created org units |
| Users | count of tenant users |
| Roles | count of defined roles |
| Booking Setup | % complete |
| LR Setup | % complete |

#### Setup Checklist (progress bars)
- Hierarchy configured
- Org Units created
- Users onboarded
- Roles defined
- Booking Master Data complete
- LR Configuration complete

#### Quick Action Links
- Go to Hierarchy | Org Units | Users | Roles | Booking Setup | LR Config

---

### Screen 2: TenantCustomersPage — `/customers`

**Purpose:** Customer master data management.

#### Filters
- Search: name, code, contact
- Status: Active | Inactive

#### Table Columns
Name | Code | Contact | Status | Addresses | Rate Cards | Actions (Edit / View)

#### Tabs on Customer
Customers | Addresses | Contacts | Credit & Billing | Contracts | Preferences

#### Actions
- Create Customer
- Edit Customer
- Address bulk import (from Excel)
- Rate card management (create/edit/delete)

---

### Screen 3: TenantVendorsPage — `/vendors`

**Purpose:** Vendor (carrier) master data management.

#### Vendor Onboarding Wizard (multi-step)
- Step 1: Basic info (name, GSTIN, code, status)
- Step 2: Bank details (account number, IFSC, bank name)
- Step 3: Service locations (origin/destination city pairs)
- Step 4: Vehicle types supported
- Step 5: Review & submit

#### Features
- Rate card import/export
- Service location coverage mapping
- Bank details management

---

### Screen 4: TenantDriversPage — `/drivers`

**Purpose:** Driver master data — creation, editing, compliance tracking.

#### Driver Fields
Name | Phone | License Classes | Employment Type | Status | Compliance Status | Linked Vehicle

#### Compliance Status Values
`COMPLIANT` | `EXPIRING_SOON` | `EXPIRED` | `PENDING_DOCS`

#### Status Badge Colors
| Status | Color |
|---|---|
| COMPLIANT | bg-emerald-100 text-emerald-700 |
| EXPIRING_SOON | bg-amber-100 text-amber-700 |
| EXPIRED | bg-rose-100 text-rose-700 |
| PENDING_DOCS | bg-gray-100 text-gray-600 |

---

### Screen 5: TenantVehiclesPage — `/vehicles`

**Purpose:** Vehicle master data — creation, editing, operational status.

#### Vehicle Fields
Registration No. | Type | Fuel Type | Status | Linked Driver | Compliance Docs

#### Operational Status Values
`ACTIVE` | `UNDER_MAINTENANCE` | `INACTIVE`

---

### Screen 6: TenantVehicleTypesPage — `/vehicle-types`

**Purpose:** Vehicle type catalog (e.g., 20ft Container, 32ft SXL Truck).

---

### Screen 7: TenantMaterialsPage — `/materials`

**Purpose:** Material master (goods type, applicable UOM, customer mapping).

---

### Screen 8: TenantUOMConfigPage — `/uom-config`

**Purpose:** Unit of Measure definitions and conversion mappings.

---

### Screen 9: TenantUsersPage & UserDetailPage — `/users`, `/users/:userId`

**Purpose:** User registry and individual user access profile.

#### User Fields
Name | Email | UserType | Role | Status | Org Units | Linked Entity (vendor/customer/driver)

#### UserType Values
`TENANT_ADMIN` | `INTERNAL_USER` | `VENDOR` | `CUSTOMER` | `DRIVER`

#### User Detail Page
- Identity card: name, email, type, status
- Assigned role + hierarchy level
- Org unit assignments
- Effective access matrix (computed from role + scope)

#### User Update Fields
`name` | `email` | `userType` | `roleId` | `orgUnitIds` | `linkedVendorId` | `linkedCustomerId` | `linkedDriverId` | `driverName` | `driverCode` | `status`

---

### Screen 10: TenantRolesPage & RoleDetailPage — `/roles`, `/roles/:roleId`

**Purpose:** Role catalog and full role access workspace.

#### RoleAccessWorkspace Tabs (7 tabs)
| Tab | Content |
|---|---|
| Role Details | Name, description, hierarchy level, active toggle |
| Module Access | Module selection grid (checkboxes per enabled module) |
| Feature Access | Feature page matrix per selected module (select/deselect all) |
| Action Permissions | Toggle grid: VIEW / CREATE / EDIT / DELETE / APPROVE / EXPORT per feature |
| Data Scope | ALL_TENANT / REGION / BRANCH / CUSTOMER / VENDOR / DRIVER / OWN_RECORDS |
| Assigned Users | List of users with this role |
| Role Preview | Preview access as if logged in as this role |

#### Role Fields
`name` | `description` | `hierarchyLevelId` | `moduleCodes: string[]` | `dataScope` | `roleAccess: RoleAccessModule[]` | `active: boolean`

#### BRD Default Templates
- Common role types have pre-built templates that can be applied to populate access matrix

---

### Screen 11: RolePermissionsPage — `/role-permissions`

**Purpose:** Cross-role permission matrix view for the entire tenant.

---

### Screen 12: TenantHierarchyPage — `/hierarchy`

**Purpose:** Configure the tenant's org hierarchy levels (Region → Zone → Branch etc.).

#### Hierarchy Fields
- Level name, order, active flag
- Uses `useTenantOrgTypes()` returning levels sorted by order

---

### Screen 13: TenantOrgUnitsPage — `/org-units`

**Purpose:** Create and manage org unit instances (e.g., "North Region", "Delhi Branch").

#### OrgUnit Fields
`name` | `levelId` | `parentId` | `active`

---

### Screen 14: TenantLRConfigPage — `/lr-config`

**Purpose:** Configure LR generation rules — Manual and Auto modes.

#### Tabs
| Tab | Content |
|---|---|
| Manual LR | Workflow actions, org-level pool settings |
| Auto LR | Auto-generation rules and prefix config |

#### Manual LR Workflow Actions
`UPLOAD_LR` | `ALLOCATE_LR` | `REQUEST_LR` | `APPROVE_LR` | `TRANSFER_LR` | `CONSUME_LR` | `VOID_LR` | `VIEW_AUDIT`

---

### Screen 15: TenantLRManagementPage — `/lr`

**Purpose:** Operational LR pool management — upload, allocate, request, approve, transfer.

#### Governed By
- Org unit hierarchy
- Ownership levels per org unit
- Role permissions from `useManualLrContext()`

#### Effective Workflow Permissions
`canRunWorkflowAction(action, configOverride?)` — checks role + config + org unit ownership

---

### Screen 16: BookingListPage — `/bookings`

**Purpose:** Booking pipeline dashboard (Kanban view).

#### Pipeline Columns (9)
Same as TMS module:
`Draft` | `Rate Approval` | `Assignment` | `In Transit` | `POD Pending` | `Completed` | `Invoiced` | `Exception` | `Cancelled`

#### Filters
- Search: bookingId, customer, vehicle, driver, cities
- Status filter
- Date range

#### Pagination
8 items per page per column

---

### Screen 17: CreateBookingPage — `/bookings/create` & `/:id/edit`

Full multi-delivery booking form — see [Section 10 Form Analysis](#10-form-analysis).

---

### Screen 18: BookingDetailsPage — `/bookings/:bookingId`

**Purpose:** Full booking operations hub — same feature set as TMS module's BookingDetailsPage.

#### Key Actions
Assignment, Reassignment, Vehicle Replacement, Breakdown, Destination Change, POD Capture, Loading, Dispatch, Cancel — all with role-permission gates.

---

### Screen 19: AssignmentQueuePage — `/bookings/assignment`

**Purpose:** Vendor indent queue — pending bookings awaiting vehicle/driver assignment.

---

### Screen 20: RateApprovalQueuePage — `/bookings/rate-approval`

**Purpose:** Rate deviation approval queue — Manager / HO level.

---

### Screen 21: BookingSetupOverviewPage — `/booking-setup`

**Purpose:** Setup cards linking to each configuration component.

#### Setup Cards
Customers | Vendors | Vehicle Types | Materials | UOM | Address Book | LR Configuration | Assignment Rules | Document Rules | POD Rules

---

### Screen 22: TenantAssignmentRulesPage — `/assignment-rules`

**Purpose:** Configure how bookings are assigned to vendors/vehicles/drivers.

#### Config Fields
| Field | Options |
|---|---|
| `assignmentMode` | AUTO / CONTROLLED / MANUAL |
| `vendorSelectionRule` | BEST_RATE / MANUAL / ROUND_ROBIN |
| `vehicleRequirementRule` | STRICT / FLEXIBLE |
| `driverAssignmentRule` | AUTO / VENDOR_MANAGED / MANUAL |

---

### Screen 23: TenantDocumentRulesPage — `/document-rules`

**Purpose:** Configure document requirements for dispatch.

#### Config Fields
| Field | Type |
|---|---|
| `invoiceRequired` | boolean |
| `ewaybillRequired` | boolean |
| `podRequired` | boolean |
| `uploadTiming` | BEFORE_DISPATCH / AFTER_DISPATCH / ON_POD |

---

### Screen 24: TenantPodRulesPage — `/pod-rules`

**Purpose:** Configure POD capture requirements.

#### Config Fields
| Field | Type |
|---|---|
| `otpRequired` | boolean |
| `signatureRequired` | boolean |
| `photoRequired` | boolean |
| `recipientNameRequired` | boolean |

---

### Screen 25: TenantAuditLogsPage — `/audit-logs`

**Purpose:** Tenant-level action audit trail.

#### Audit Log Fields
`actor` | `action` | `entityType` | `entityName` | `result` (success/warning/denied) | `timestamp` | `tenantId`

---

## 5. Feature Inventory

| # | Feature | Status | Screen |
|---|---|---|---|
| F-01 | Tenant governance dashboard | Live | Dashboard |
| F-02 | Setup checklist progress tracking | Live | Dashboard |
| F-03 | Customer master CRUD | Live | CustomersPage |
| F-04 | Customer address management | Live | CustomersPage |
| F-05 | Customer rate card management | Live | CustomersPage |
| F-06 | Customer address bulk import (Excel) | Live | CustomersPage |
| F-07 | Vendor onboarding wizard | Live | VendorsPage |
| F-08 | Vendor rate card management | Live | VendorsPage |
| F-09 | Vendor bank details management | Live | VendorsPage |
| F-10 | Driver master CRUD | Live | DriversPage |
| F-11 | Driver compliance tracking | Live | DriversPage |
| F-12 | Vehicle master CRUD | Live | VehiclesPage |
| F-13 | Vehicle operational status | Live | VehiclesPage |
| F-14 | Vehicle type catalog | Live | VehicleTypesPage |
| F-15 | Material master CRUD | Live | MaterialsPage |
| F-16 | UOM definitions + conversion mappings | Live | UOMConfigPage |
| F-17 | User management (CRUD + org unit assign) | Live | UsersPage |
| F-18 | User effective access matrix | Live | UserDetailPage |
| F-19 | Role management with 7-tab workspace | Live | RolesPage |
| F-20 | Module/Feature/Action permission matrix | Live | RoleDetailPage |
| F-21 | Data scope configuration per role | Live | RoleDetailPage |
| F-22 | BRD default role templates | Live | RoleDetailPage |
| F-23 | Role preview mode | Live | RoleDetailPage |
| F-24 | Cross-role permission matrix view | Live | RolePermissionsPage |
| F-25 | Hierarchy level configuration | Live | HierarchyPage |
| F-26 | Org unit management | Live | OrgUnitsPage |
| F-27 | LR config (Manual + Auto modes) | Live | LRConfigPage |
| F-28 | LR pool management (upload/allocate/transfer) | Live | LRManagementPage |
| F-29 | Manual LR workflow (8 actions) | Live | LRManagementPage |
| F-30 | Booking pipeline (Kanban) | Live | BookingListPage |
| F-31 | Multi-delivery booking creation | Live | CreateBookingPage |
| F-32 | Rate deviation detection & approval routing | Live | BookingDetailsPage |
| F-33 | Vehicle/driver assignment | Live | AssignmentQueuePage |
| F-34 | Vehicle reassignment (4 types) | Live | BookingDetailsPage |
| F-35 | Vehicle breakdown + replacement workflow | Live | BookingDetailsPage |
| F-36 | Destination change request workflow | Live | BookingDetailsPage |
| F-37 | POD capture per delivery | Live | BookingDetailsPage |
| F-38 | Loading start/complete tracking | Live | BookingDetailsPage |
| F-39 | Booking cancellation | Live | BookingDetailsPage |
| F-40 | Assignment rules configuration | Live | AssignmentRulesPage |
| F-41 | Document rules configuration | Live | DocumentRulesPage |
| F-42 | POD rules configuration | Live | PodRulesPage |
| F-43 | Address book management | Live | AddressBookPage |
| F-44 | Shipment documents | Live | ShipmentDocumentsPage |
| F-45 | Booking reports | Live | BookingReportsPage |
| F-46 | Audit log viewer | Live | AuditLogsPage |
| F-47 | Track & Trace embedded portal | Live | /track-and-trace/* |
| F-48 | Fleet Management embedded portal | Live | /fleet-management/* |
| F-49 | Vendor Portal embedded + data bridge | Live | /vendor-portal/* |
| F-50 | Customer Portal embedded | Live | /customer-portal |
| F-51 | Finance embedded portal | Live | /finance/* |
| F-52 | Auction/AMS embedded portal | Live | /auction-ams/* |
| F-53 | PermissionGate RBAC enforcement | Live | All routes |
| F-54 | Data scope filtering (REGION/BRANCH/etc.) | Live | All list views |
| F-55 | Session preview mode (role testing) | Live | RoleDetailPage |
| F-56 | Live tracking (booking) | **STUB** | /bookings/live-tracking |
| F-57 | Real backend API | **MISSING** | Entire module on MockStore |
| F-58 | Tenant settings management | **Partial** | /settings (screen exists, depth unclear) |
| F-59 | Tenant module management | **Partial** | /modules (screen exists, depth unclear) |

---

## 6. Booking Workflow

### Full Status Machine (24 statuses)

```
DRAFT
  │ [CONTRACT + deviation ≥ 5%]
  ├──► PENDING_RATE_APPROVAL
  │       ├──► [Approve] → PENDING_ASSIGNMENT
  │       └──► [Reject]  → DRAFT
  │ [SPOT or deviation < 5%]
  └──► PENDING_ASSIGNMENT
            └──► ACCEPTED / VEHICLE_ASSIGNED / ASSIGNED
                      └──► LOADING_STARTED → LOADING_COMPLETED
                                  └──► DOCUMENT_PENDING → DOCUMENT_COMPLETED
                                              └──► READY_FOR_DISPATCH → DISPATCHED
                                                          └──► IN_TRANSIT
                                                                    └──► POD_PENDING → ARRIVED
                                                                                └──► COMPLETED
                                                                                          └──► INVOICED
                                                                                                └──► PAID | DISPUTED

Exception paths:
  → DELAYED   (sub-state)
  → EXCEPTION (escalated)
  → CANCELLED (from: DRAFT, PENDING_RATE_APPROVAL, PENDING_ASSIGNMENT,
                ACCEPTED, VEHICLE_ASSIGNED, ASSIGNED)
```

### Rate Deviation Rules
| Deviation | Approval Level | Routing |
|---|---|---|
| < 5% | `AUTO` | Direct to PENDING_ASSIGNMENT |
| 5% – 15% | `MANAGER` | Route to PENDING_RATE_APPROVAL |
| > 15% | `HO` | Route to PENDING_RATE_APPROVAL |

### Freight Calculations
| Rate Type | Formula |
|---|---|
| PER_TRIP | `rate` (flat) |
| PER_MT | `rate × weight` |
| PER_KM | `rate × distanceKm` |

---

## 7. LR (Lorry Receipt) Workflow

### LR Modes
| Mode | Description |
|---|---|
| **Manual** | Pre-printed LR books; upload, allocate, request, approve, transfer, consume |
| **Auto** | System-generated LR numbers with configurable prefix/series |

### Manual LR Workflow Actions (8)
| Action | Description |
|---|---|
| `UPLOAD_LR` | Upload new LR number range into pool |
| `ALLOCATE_LR` | Allocate LRs to a booking |
| `REQUEST_LR` | Request LRs from another org unit |
| `APPROVE_LR` | Approve an LR request |
| `TRANSFER_LR` | Transfer LRs between org units |
| `CONSUME_LR` | Mark LR as used on a shipment |
| `VOID_LR` | Void unused/damaged LRs |
| `VIEW_AUDIT` | View LR audit trail |

### LR Permission Resolution
```
useManualLrContext()
  → access (from useTenantAccess)
  → activeConfig (active Manual LR config)
  → currentUser, currentRole
  → assignedOrgUnits, activeOrgUnit
  → effectiveWorkflowPermissions
  → canRunWorkflowAction(action, configOverride?)
```

### LR Pool Status Values
`AVAILABLE` | `USED` | `VOID` | `LOST` | `DAMAGED` | `ALLOCATED` | `REQUESTED` | `APPROVAL_PENDING` | `TRANSFER_PENDING` | `TRANSFERRED`

### LR API Switch
```
VITE_LR_MANAGEMENT_API=true  → uses real lrManagementApi (HTTP)
VITE_LR_MANAGEMENT_API=false → uses MockStore
```

---

## 8. Role & Permission System

### Permission Resolution Flow

```
1. Session actor → matches → TenantUser (by email/name)
2. TenantUser.roleId → RoleDefinition
3. RoleDefinition.moduleCodes ∩ Tenant.enabledModuleCodes → effective modules
4. RoleDefinition.roleAccess[moduleCode].pages[pageCode].canView → page visibility
5. RoleDefinition.roleAccess[moduleCode].pages[pageCode].actions → allowed actions
6. RoleDefinition.dataScope → data list filter (ALL_TENANT / REGION / BRANCH / CUSTOMER / VENDOR / DRIVER / OWN_RECORDS)
7. Preview mode → overrides step 1 with previewTenantRoleId
```

### PermissionGate Component

```typescript
interface PermissionGateProps {
  moduleCode: string        // "TMS" | "VENDOR" | "FLEET" | "TRACKING" | "AUCTION" | "CUSTOMER" | "FINANCE"
  featureCode: string       // e.g., "CUSTOMERS", "BOOKING_DASHBOARD"
  action?: PermissionAction // "view" | "create" | "edit" | "delete" | "approve" | "export"
  children: ReactNode
}
```

Access denied → redirect to `/dashboard` or portal homepage.
Vendor/Customer sessions → bypass tenant RBAC entirely.

### useTenantAccess() Hook

```typescript
{
  canViewPage(pageCode: string): boolean
  can(action: PermissionAction): boolean
  getActionsForPage(pageCode: string): RolePageAction[]
  getMatchedPage(): RoleAccessPage | null
  hasFeaturePermission(moduleCode, featureCode, action): boolean
  // Plus full roleContext: role, dataScope, orgUnits, moduleCodes
}
```

### RolePageAction Values
`VIEW` | `CREATE` | `EDIT` | `DELETE` | `APPROVE` | `EXPORT`

### Data Scope Values
| Scope | Description |
|---|---|
| `ALL_TENANT` | See all data across org |
| `REGION` | Scoped to own region |
| `BRANCH` | Scoped to own branch |
| `CUSTOMER` | Scoped to assigned customers |
| `VENDOR` | Scoped to assigned vendors |
| `DRIVER` | Scoped to self (driver only) |
| `OWN_RECORDS` | Only own-created records |

### Feature Codes by Module

**TMS Module:**
`CUSTOMERS` | `VENDORS` | `VEHICLE_TYPES` | `MATERIALS` | `UOM` | `ADDRESS_BOOK` | `LR_CONFIGURATION` | `LR_MANAGEMENT` | `BOOKING_DASHBOARD` | `CREATE_BOOKING` | `BOOKING_ASSIGNMENT` | `SHIPMENT_DOCUMENTS` | `POD` | `BOOKING_REPORTS` | `ASSIGNMENT_RULES` | `DOCUMENT_RULES` | `POD_RULES`

**FLEET Module:**
`FLEET_DASHBOARD` | `FLEET_OPS_INTEL` | `FLEET_EXCEPTIONS` | `FLEET_LIVE_MAP` | `FLEET_DISPATCH` | `FLEET_VEHICLES` | `FLEET_DRIVERS` | `FLEET_COMPLIANCE` | `FLEET_MAINTENANCE` | `FLEET_GARAGE` | `FLEET_TYRES` | `FLEET_FUEL` | `FLEET_COST` | `FLEET_SETTINGS`

**TRACKING Module:**
`TRACKING_DASHBOARD` | `TRACKING_LIVE_MAP` | `TRACKING_TRIPS` | `TRACKING_ALERTS` | `TRACKING_GEOFENCES` | `TRACKING_ANALYTICS`

**Other Modules:**
`VENDOR_DASHBOARD` | `AUCTION_DASHBOARD` | `CUSTOMER_DASHBOARD` | `FINANCE_DASHBOARD`

### Page Codes
`TENANT_DASHBOARD` | `HIERARCHY` | `ORG_UNITS` | `USERS` | `ROLES` | `ROLE_PERMISSIONS` | `CUSTOMERS` | `VENDORS` | `VEHICLES` | `DRIVERS` | `VEHICLE_TYPES` | `MATERIALS` | `UOM_CONFIG` | `ADDRESS_BOOK` | `LR_CONFIG` | `LR_DASHBOARD` | `ASSIGNMENT_RULES` | `DOCUMENT_RULES` | `POD_RULES` | `BOOKING_LIST` | `CREATE_BOOKING` | `ASSIGNMENT_QUEUE` | `SHIPMENT_DOCUMENTS` | `COMPLETED_BOOKINGS` | `AUDIT_LOGS` | `SETTINGS` | `MODULES`

---

## 9. Vendor Portal Bridge

### Purpose
`useVendorTenantDataBridge()` adapter maps tenant-side data models to vendor portal data models so the embedded vendor portal sees consistent types.

### Booking Status Mapping

| Vendor Bucket | Booking Statuses Included |
|---|---|
| `INDENT_STATUSES` (pending) | VEHICLE_ASSIGNED, ACCEPTED, ASSIGNED |
| `ACTIVE_STATUSES` (in-transit) | LOADING_STARTED, LOADING_COMPLETED, LOADING, LOADED, DOCUMENT_PENDING, DOCUMENT_COMPLETED, READY_FOR_DISPATCH, DISPATCHED, IN_TRANSIT, ARRIVED, DELAYED |
| `COMPLETED_STATUSES` | COMPLETED, INVOICED, PAID |

### Field Mappings

**Fuel Type:**
| Tenant Value | Vendor Value |
|---|---|
| `diesel` | `DIESEL` |
| `petrol` | `PETROL` |
| `cng` | `CNG` |
| `lng` | `LNG` |
| `ev` / `electric` | `ELECTRIC` |

**Gender:**
| Tenant | Vendor |
|---|---|
| `MALE` | `Male` |
| `FEMALE` | `Female` |
| `OTHER` | `Other` |

### Bridge Return Shape
```typescript
{
  // Identity
  tenantId: string
  vendorId: string
  vendorName: string

  // Data
  vehicles: VendorVehicle[]
  drivers: VendorDriver[]
  vehicleTypeOptions: string[]
  bookingIndents: VendorBookingIndent[]   // PENDING
  bookingTrips: VendorBookingTrip[]       // ACCEPTED/ACTIVE/COMPLETED

  // Actions
  acceptBooking(bookingId): void
  declineBooking(bookingId): void
  assignVehicle(bookingId, vehicleId, driverId): void
  getBookingDetail(bookingId): VendorBookingDetail
}
```

---

## 10. Form Analysis

### Form 1: Create Booking — Main Fields (same as TMS module)

| Field | Type | Required | Notes |
|---|---|---|---|
| `commercialType` | `CONTRACT \| SPOT` | Yes | — |
| `modeOfTransport` | `ROAD` | Yes | Fixed |
| `serviceType` | `FTL \| PTL` | Yes | — |
| `contractRateType` | `PER_TRIP \| PER_KM \| PER_MT` | Conditional | CONTRACT only |
| `customerId` | select | Yes | — |
| `pickupDateTime` | datetime-local | Yes | — |
| `sourceAddressId` | select | Yes | — |
| `destinationAddressId` | select | Yes | — |
| `vehicleTypeId` | select | Conditional | `shouldRequireVehicleType()` |
| `enteredRate` | number | Yes | INR |
| `deviationRemark` | text | Conditional | Required if deviation ≥ 5% |
| `opsRemark` | text | No | — |
| `numberOfDeliveries` | number | Yes | — |

### Form 2: Per-Delivery (same as TMS)

| Field | Required | Notes |
|---|---|---|
| `originCity` / `originAddressId` | Yes | — |
| `destinationCity` / `destinationAddressId` | Yes | Can defer with FROM_INVOICE_LATER |
| `materialId` | Yes | — |
| `quantity` | Yes | — |
| `uom` | Yes | — |
| `weight` | Yes | — |
| `weightUom` | Yes | KG / MT / LB |
| `distanceKm` | Conditional | Required for PER_KM |

### Form 3: Create / Edit User

| Field | Required | Validation |
|---|---|---|
| `name` | Yes | min 2 chars |
| `email` | Yes | valid email |
| `userType` | Yes | TENANT_ADMIN / INTERNAL_USER / VENDOR / CUSTOMER / DRIVER |
| `roleId` | Yes | from roles list |
| `orgUnitIds` | Conditional | Required for scoped roles |
| `linkedVendorId` | Conditional | Required if userType = VENDOR |
| `linkedCustomerId` | Conditional | Required if userType = CUSTOMER |
| `linkedDriverId` | Conditional | Required if userType = DRIVER |
| `status` | Yes | active / inactive |

### Form 4: Create / Edit Role

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | min 2 chars |
| `description` | No | — |
| `hierarchyLevelId` | Yes | from org types list |
| `moduleCodes` | Yes | At least 1 module |
| `dataScope` | Yes | One of 7 scope values |
| `active` | Yes | boolean |
| `roleAccess` | Yes | Feature/action matrix |

### Form 5: Vendor Onboarding Wizard

| Step | Fields |
|---|---|
| Step 1 | `name`, `code`, `GSTIN`, `status` |
| Step 2 | `bankAccountNumber`, `IFSC`, `bankName` |
| Step 3 | Service location pairs (origin city → destination city) |
| Step 4 | Supported vehicle types (multi-select) |
| Step 5 | Review & submit |

### Form 6: Assignment Rules Config

| Field | Options |
|---|---|
| `assignmentMode` | AUTO / CONTROLLED / MANUAL |
| `vendorSelectionRule` | BEST_RATE / MANUAL / ROUND_ROBIN |
| `vehicleRequirementRule` | STRICT / FLEXIBLE |
| `driverAssignmentRule` | AUTO / VENDOR_MANAGED / MANUAL |

### Form 7: Document Rules Config

| Field | Type |
|---|---|
| `invoiceRequired` | boolean |
| `ewaybillRequired` | boolean |
| `podRequired` | boolean |
| `uploadTiming` | BEFORE_DISPATCH / AFTER_DISPATCH / ON_POD |

### Form 8: POD Rules Config

| Field | Type |
|---|---|
| `otpRequired` | boolean |
| `signatureRequired` | boolean |
| `photoRequired` | boolean |
| `recipientNameRequired` | boolean |

### Form 9: Hierarchy Setup

| Field | Required |
|---|---|
| Level name | Yes |
| Level order | Yes |
| Active | Yes |

### Form 10: Org Unit

| Field | Required |
|---|---|
| `name` | Yes |
| `levelId` | Yes |
| `parentId` | Conditional |
| `active` | Yes |

---

## 11. API Catalog

> **Critical Note:** All operations flow through `useMockStore()` — in-memory mock. Only LR Management has an optional real API switch (`VITE_LR_MANAGEMENT_API=true`).

### LR Management API (real — when flag enabled)

| Function | Purpose | Payload |
|---|---|---|
| `upsertPools(records)` | Upload/update LR pool | `TenantLrPoolRecord[]` |
| `createRequest(input)` | Create LR request | `CreateLrRequestInput` |
| `approveRequest(id, count, actor, note?)` | Approve LR request | — |
| `rejectRequest(id, actor, note?)` | Reject LR request | — |
| `createTransfer(input)` | Transfer LRs | `CreateLrTransferInput` |
| `appendAuditLog(input)` | Log action | `{ actor, action, entityType, entityName, tenantId, result }` |

### Implied Production API Endpoints

#### Master Data
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/tenant/:id/customers` | GET / POST | Customer list + create |
| `/api/tenant/:id/customers/:cid` | GET / PATCH | Customer detail + update |
| `/api/tenant/:id/customers/:cid/addresses` | GET / POST / PATCH / DELETE | Address management |
| `/api/tenant/:id/customers/:cid/rate-cards` | GET / POST / PATCH / DELETE | Rate cards |
| `/api/tenant/:id/vendors` | GET / POST / PATCH | Vendor management |
| `/api/tenant/:id/vendors/:vid/rate-cards` | GET / POST / PATCH | Vendor rate cards |
| `/api/tenant/:id/drivers` | GET / POST / PATCH | Driver management |
| `/api/tenant/:id/vehicles` | GET / POST / PATCH | Vehicle management |
| `/api/tenant/:id/vehicle-types` | GET / POST / PATCH | Vehicle types |
| `/api/tenant/:id/materials` | GET / POST / PATCH | Material master |
| `/api/tenant/:id/uom` | GET / POST / PATCH | UOM config |

#### Access Control
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/tenant/:id/users` | GET / POST / PATCH | User management |
| `/api/tenant/:id/roles` | GET / POST / PATCH | Role management |
| `/api/tenant/:id/role-permissions` | GET / POST | Permission matrix |
| `/api/tenant/:id/hierarchy` | GET / PATCH | Hierarchy config |
| `/api/tenant/:id/org-units` | GET / POST / PATCH / DELETE | Org units |

#### Booking
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/tenant/:id/bookings` | GET / POST | Booking list + create |
| `/api/tenant/:id/bookings/:bid` | GET / PATCH | Detail + update |
| `/api/tenant/:id/bookings/:bid/transition` | POST | Status transition |
| `/api/tenant/:id/bookings/:bid/assign` | POST | Assignment |
| `/api/tenant/:id/bookings/:bid/reassign` | POST | Reassignment |
| `/api/tenant/:id/bookings/:bid/destination-change` | POST | DCR workflow |

---

## 12. State Management

### Architecture
MockStoreProvider supplies all data. No Redux/Zustand. Each page uses local `useState` + domain hooks.

### Session Context Shape
```typescript
{
  actorType: "tenant_admin" | "platform_admin"
  tenantId?: string
  actorName: string
  previewTenantRoleId?: string | null   // Preview mode role override
  activeTenantOrgUnitId?: string | null // Active org unit scope
  vendorId?: string                     // If vendor session
  vendorName?: string
  loginType?: string
}
```

### Key Mock Store Collections
```typescript
// Master data
customers: TenantCustomer[]
vendors: TenantVendor[]
drivers: TenantDriver[]
vehicles: TenantVehicle[]
vehicleTypes: TenantVehicleType[]
materials: TenantMaterial[]
uomDefinitions: TenantUOMDefinition[]
uomMappings: TenantUOMMapping[]
addresses: TenantCustomerAddress[]
rateCards: TenantCustomerRateCard[]
vendorRateCards: TenantVendorRateCard[]

// Access control
users: UserRecord[]
roles: RoleDefinition[]
rolePermissions: RolePermission[]
orgUnits: OrgUnit[]
hierarchyConfig: TenantHierarchyConfig

// Booking
bookings: BookingRecord[]
lrConfigs: TenantLRConfig[]
lrPools: TenantLrPoolRecord[]
lrs: LrRecord[]
lrRequests: LrRequestRecord[]
lrTransfers: LrTransferRecord[]

// Audit
auditLogs: AuditLogRecord[]
```

---

## 13. RBAC Matrix

### Role Access by User Type

| Feature | Tenant Admin | Internal User | Vendor | Customer | Driver |
|---|---|---|---|---|---|
| Dashboard | ✅ | Role-gated | ❌ | ❌ | ❌ |
| Customers CRUD | ✅ | Role-gated | ❌ | ❌ | ❌ |
| Vendors CRUD | ✅ | Role-gated | ❌ | ❌ | ❌ |
| Drivers CRUD | ✅ | Role-gated | ❌ | ❌ | ❌ |
| Vehicles CRUD | ✅ | Role-gated | ❌ | ❌ | ❌ |
| User Management | ✅ | Role-gated | ❌ | ❌ | ❌ |
| Role Management | ✅ | ❌ | ❌ | ❌ | ❌ |
| Hierarchy Config | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Booking | ✅ | Role-gated (create) | ❌ | ❌ | ❌ |
| Approve Rate | ✅ | Role-gated (approve) | ❌ | ❌ | ❌ |
| Assign Vehicle | ✅ | Role-gated | ❌ | ❌ | ❌ |
| POD Capture | ✅ | Role-gated | ❌ | ❌ | ❌ |
| LR Management | ✅ | Role-gated | ❌ | ❌ | ❌ |
| Vendor Portal | ❌ | ❌ | ✅ | ❌ | ❌ |
| Customer Portal | ❌ | ❌ | ❌ | ✅ | ❌ |
| Audit Logs | ✅ | Role-gated (export) | ❌ | ❌ | ❌ |
| View Margin | ✅ | Role-gated | ❌ | ❌ | ❌ |

---

## 14. Business Rules Catalog

| # | Rule | Implementation |
|---|---|---|
| BR-01 | Rate deviation < 5% → AUTO approval | `getDeviationApprovalLevel()` |
| BR-02 | Rate deviation 5–15% → MANAGER approval | `getDeviationApprovalLevel()` |
| BR-03 | Rate deviation > 15% → HO approval | `getDeviationApprovalLevel()` |
| BR-04 | CONTRACT + deviation ≥ 5% → PENDING_RATE_APPROVAL | `evaluateInitialBookingStatus()` |
| BR-05 | SPOT → skip rate approval always | `evaluateInitialBookingStatus()` |
| BR-06 | Cancellable statuses | DRAFT, PENDING_*, ACCEPTED, VEHICLE_ASSIGNED, ASSIGNED |
| BR-07 | PER_MT freight = rate × weight | `perMT()` |
| BR-08 | PER_KM freight = rate × distanceKm | `perKM()` |
| BR-09 | PER_TRIP freight = rate (flat) | `perTrip()` |
| BR-10 | ADMIN module always required | From platform-admin provisioning |
| BR-11 | Vendor portal session bypasses tenant RBAC | Portal module session check |
| BR-12 | Customer portal session bypasses tenant RBAC | Portal module session check |
| BR-13 | Data scope ALL_TENANT → no list filter | `computeEffectiveUserScope()` |
| BR-14 | Data scope REGION/BRANCH → filter by org unit | `computeEffectiveUserScope()` |
| BR-15 | Data scope OWN_RECORDS → filter by creator | `computeEffectiveUserScope()` |
| BR-16 | Preview mode → overrides session role | `previewTenantRoleId` in session |
| BR-17 | LR ADMIN module is locked | Cannot be removed from role |
| BR-18 | LR pool: AVAILABLE → ALLOCATED → CONSUMED | Pool status lifecycle |
| BR-19 | LR approval required before allocation | `APPROVE_LR` workflow action |
| BR-20 | Vendor fuel type normalization | Bridge: diesel/petrol/cng/lng/ev → uppercase enum |
| BR-21 | Assignment mode: AUTO → no manual vendor selection | `assignmentMode = "AUTO"` |
| BR-22 | Document upload timing | BEFORE_DISPATCH blocks dispatch until docs uploaded |
| BR-23 | POD OTP required → OTP must be verified | `otpRequired = true` blocks POD completion |
| BR-24 | Hierarchy levels sorted by order | `useTenantOrgTypes()` sorts by `order` field |
| BR-25 | User linked to vendor → VENDOR userType | Validation on user create |
| BR-26 | BRD role templates | Pre-populated access matrix for common role types |

---

## 15. Dependency Matrix

| Feature | Component | Hook | Store | Permission | Upstream | Downstream |
|---|---|---|---|---|---|---|
| Customer CRUD | CustomersPage | `useTenantCustomers()` | customers, addresses, rateCards | `TMS/CUSTOMERS/view` | — | Booking (customer rate lookup) |
| Vendor CRUD | VendorsPage | `useTenantVendors()` | vendors, vendorRateCards | `TMS/VENDORS/view` | — | Booking (vendor freight lookup) |
| Driver CRUD | DriversPage | `useTenantDrivers()` | drivers | `TMS/VEHICLE_TYPES/view` | — | Fleet, Booking assignment |
| Vehicle CRUD | VehiclesPage | `useTenantVehicles()` | vehicles | `TMS/VEHICLE_TYPES/view` | — | Fleet, Booking assignment |
| User Management | UsersPage | `useTenantUsers()` | users, roles, orgUnits | Tenant Admin only | Roles, OrgUnits | Session access resolution |
| Role Management | RolesPage | `useTenantRoles()` | roles | Tenant Admin only | Modules | User access matrix |
| Permission Matrix | RoleDetailPage | `useTenantRolePermissions()` | rolePermissions | Tenant Admin only | Roles | All page gates |
| Booking Pipeline | BookingListPage | `useTenantBookings()` | bookings | `TMS/BOOKING_DASHBOARD/view` | Customers, Vendors, Fleet | Finance (invoice), Track & Trace (tracking) |
| LR Management | LRManagementPage | `useTenantLrManagementService()` | lrPools, lrRequests, lrTransfers | `TMS/LR_MANAGEMENT/view` | LR Config, OrgUnits | Booking (LR assignment) |
| Vendor Portal | /vendor-portal/* | `useVendorTenantDataBridge()` | bookings, vehicles, drivers | `VENDOR/VENDOR_DASHBOARD` | All tenant master data | Vendor actions (accept/assign) |
| Track & Trace | /track-and-trace/* | (embedded module) | — | `TRACKING/TRACKING_DASHBOARD` | Booking (trip data) | — |
| Fleet Portal | /fleet-management/* | (embedded module) | — | `FLEET/FLEET_DASHBOARD` | Vehicle/Driver master | — |
| Audit Logs | AuditLogsPage | `useTenantAuditLogs()` | auditLogs | `AUDIT_LOGS/view` | All actions | Compliance |

---

## 16. Edge Cases

| Scenario | Handling |
|---|---|
| User has no role assigned | Access denied to all gated pages; redirect to dashboard |
| Role has no modules selected | User sees empty sidebar; only dashboard accessible |
| Data scope VENDOR but no linkedVendorId | `computeEffectiveUserScope()` returns empty list |
| Vendor session accessing tenant admin page | PermissionGate redirects to `/vendor-portal/dashboard` |
| Preview mode with invalid roleId | Falls back to actual session role |
| LR request rejected | Status → REJECTED; LRs not transferred |
| LR pool exhausted | `ALLOCATE_LR` fails; request workflow must be used |
| Booking deviation remark missing | Form blocks submit if deviation ≥ 5% |
| Assignment mode AUTO with no rate card | Falls back to manual rate entry |
| POD OTP required but not verified | POD completion blocked |
| Document upload before dispatch required | DISPATCHED transition blocked |
| Org unit deleted with active users | No guard found — data inconsistency risk |
| Module disabled but user has role with that module | PermissionGate blocks; `useTenantCapabilities()` filters |
| Hierarchy level removed with org units attached | No guard found |
| Booking cancelled after loading started | `canCancelBooking()` returns false — button disabled |
| Concurrent booking status change | No optimistic locking — last write wins in MockStore |
| Vendor bridge: unknown fuel type | Falls through to original value (no normalization) |
| Role with ALL_TENANT scope editing own profile | No self-edit restriction found |
| Empty LR pool on assignment | Assignment blocked; `preferredLrNumber` required |

---

## 17. Hidden Features & Technical Debt

### Disabled / Stub Features

| Feature | Location | Status |
|---|---|---|
| Live Tracking (booking) | `/bookings/live-tracking` | Placeholder page — **STUB** |
| Dispatch/Complete Trip buttons | BookingDetailsPage | **DISABLED** (same as TMS module) |
| Sample tenant creation | `useTenants().createSampleTenant` | Hook exists; no UI trigger |

### Environment / Feature Flags

| Flag | Default | Effect |
|---|---|---|
| `VITE_LR_MANAGEMENT_API` | `false` | `true` → uses real HTTP API for LR operations |

### Technical Debt

| Item | Severity | Detail |
|---|---|---|
| **Entire module on MockStore** | Critical | Only LR has optional real API; everything else in-memory |
| **No optimistic locking** | High | Concurrent writes silently overwrite in mock |
| **Org unit deletion unguarded** | High | No cascade check for users/org units attached |
| **Hierarchy level deletion unguarded** | High | No cascade check for org units at that level |
| **Vendor bridge: unknown fuel type passthrough** | Medium | Unrecognized fuel types not normalized — silent data mismatch |
| **Session preview mode** | Medium | Role override via `previewTenantRoleId` — no audit trail of preview sessions |
| **Role templates not versioned** | Medium | BRD templates are static — changes to BRD not reflected |
| **`createSampleTenant` unexposed** | Low | Hook function exists with no UI entry point |
| **No pagination on most list pages** | Low | All records rendered — will not scale |
| **Default tenant hardcoded** | Low | `tenant-northstar` hardcoded as fallback tenantId |

---

## 18. Missing Features Report

| # | Feature | Priority | Detail |
|---|---|---|---|
| MF-01 | Real backend API (all except LR) | Critical | Entire module on MockStore |
| MF-02 | Dispatch/Complete trip actions | High | Buttons disabled in BookingDetailsPage |
| MF-03 | Live tracking in booking context | High | Placeholder page — no implementation |
| MF-04 | Org unit deletion guard | High | No cascade validation before delete |
| MF-05 | Hierarchy level deletion guard | High | No cascade validation |
| MF-06 | Bulk user import | Medium | No CSV/Excel import for users |
| MF-07 | Role audit trail | Medium | No log of who changed role permissions |
| MF-08 | Pagination on list pages | Medium | All records rendered — scaling issue |
| MF-09 | Tenant settings screen (depth) | Medium | Route exists; full feature scope unclear |
| MF-10 | Tenant module management screen | Medium | Route exists; full feature scope unclear |
| MF-11 | Rate card import for customers | Medium | Only address import found via Excel |
| MF-12 | Driver behavior integration | Medium | Driver UserType exists; no behavior data in tenant admin |
| MF-13 | Vendor payment tracking | Medium | Invoice status defined; no vendor payment screen |
| MF-14 | Booking export | Low | No export on booking list/reports |
| MF-15 | Audit log export | Low | No CSV/PDF export on audit logs |
| MF-16 | Multi-role per user | Low | One roleId per user — no multi-role |
| MF-17 | Role inheritance | Low | No parent/child role hierarchy |
| MF-18 | Customer self-registration | Low | Not found |
| MF-19 | Driver app integration screen | Low | Driver UserType exists; no driver app management |
| MF-20 | SLA configuration per customer | Low | SLA types exist in tracking; not configurable in tenant admin |

---

## 19. Complete Type & Enum Reference

### Booking Enums

| Enum | Values |
|---|---|
| `BookingStatus` (24) | DRAFT, PENDING_RATE_APPROVAL, PENDING_ASSIGNMENT, ACCEPTED, VEHICLE_ASSIGNED, LOADING_STARTED, LOADING_COMPLETED, DOCUMENT_PENDING, DOCUMENT_COMPLETED, ASSIGNED, LOADING, LOADED, READY_FOR_DISPATCH, DISPATCHED, IN_TRANSIT, POD_PENDING, ARRIVED, DELAYED, EXCEPTION, COMPLETED, INVOICED, PAID, DISPUTED, CANCELLED |
| `BookingServiceType` | FTL, PTL |
| `BookingCommercialType` | CONTRACT, SPOT |
| `BookingApprovalLevel` | AUTO, MANAGER, HO |

### Booking Remark Types (22)
`OPS_REMARK` | `RATE_DEVIATION_REMARK` | `APPROVAL_REMARK` | `EXCEPTION_REMARK` | `CANCELLATION_REMARK` | `POD_REMARK` | `SYSTEM_REMARK` | `INTACT` | `DEPS` | `ACCIDENT_INCIDENT` | `VEHICLE_PLACEMENT_DELAY_DEVIATION` | `DELIVERY_DELAY` | `EPOD_SUBMITTED` | `EPOD_NOT_SUBMITTED` | `ORIGINAL_POD_NOT_SUBMITTED` | `VEHICLE_BREAKDOWN` | `DESTINATION_CHANGED` | `DRIVER_CHANGED` | `VEHICLE_CHANGED` | `VEHICLE_DRIVER_CHANGED` | `VENDOR_REPLACEMENT_REJECTED` | `VENDOR_ASSIGNED_REPLACEMENT_VEHICLE` | `INTERNAL_VENDOR_VEHICLE_DRIVER_REPLACED`

### User & Role Enums

| Enum | Values |
|---|---|
| `UserType` | TENANT_ADMIN, INTERNAL_USER, VENDOR, CUSTOMER, DRIVER |
| `UserStatus` | active, inactive |
| `RolePageAction` | VIEW, CREATE, EDIT, DELETE, APPROVE, EXPORT |
| `DataScope` | ALL_TENANT, REGION, BRANCH, CUSTOMER, VENDOR, DRIVER, OWN_RECORDS |

### LR Enums

| Enum | Values |
|---|---|
| `LrPoolStatus` | AVAILABLE, USED, VOID, LOST, DAMAGED, ALLOCATED, REQUESTED, APPROVAL_PENDING, TRANSFER_PENDING, TRANSFERRED |
| `LrMode` | MANUAL, AUTO |
| `ManualLrAction` | UPLOAD_LR, ALLOCATE_LR, REQUEST_LR, APPROVE_LR, TRANSFER_LR, CONSUME_LR, VOID_LR, VIEW_AUDIT |

### Fleet / Driver Enums

| Enum | Values |
|---|---|
| `ComplianceStatus` | COMPLIANT, EXPIRING_SOON, EXPIRED, PENDING_DOCS |
| `VehicleOperationalStatus` | ACTIVE, UNDER_MAINTENANCE, INACTIVE |

### Config Enums

| Enum | Values |
|---|---|
| `AssignmentMode` | AUTO, CONTROLLED, MANUAL |
| `VendorSelectionRule` | BEST_RATE, MANUAL, ROUND_ROBIN |
| `VehicleRequirementRule` | STRICT, FLEXIBLE |
| `DriverAssignmentRule` | AUTO, VENDOR_MANAGED, MANUAL |
| `DocumentUploadTiming` | BEFORE_DISPATCH, AFTER_DISPATCH, ON_POD |

### Audit Enums

| Enum | Values |
|---|---|
| `AuditResult` | success, warning, denied |

### Module Codes
`ADMIN` | `TMS` | `VENDOR` | `FLEET` | `TRACKING` | `AUCTION` | `CUSTOMER` | `FINANCE`

### Permission Actions
`view` | `create` | `edit` | `delete` | `approve` | `export`

### Session Context Fields
`actorType` | `tenantId` | `actorName` | `previewTenantRoleId` | `activeTenantOrgUnitId` | `vendorId` | `vendorName` | `loginType`

---

*End of Tenant-Admin-New Module Deep Code Review — Reverse-engineered from full source scan of `/modules/tenant-admin-new/`*
