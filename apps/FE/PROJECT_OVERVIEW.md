# PROJECT OVERVIEW

## 1. Introduction

This repository is a frontend-only React application for an Optimile transport workspace. The implemented product has two active workspaces:

- Platform workspace for tenant provisioning, module governance, plans, audit logs, and settings.
- Tenant workspace for administration and TMS operations.

The tenant-side TMS flow currently implemented is:

- Administration setup for hierarchy, org units, users, roles, customers, vendors, materials, UOM, LR configuration, vehicles, drivers, and vehicle types.
- Customer commercial setup with configurable rate matching basis and customer rate cards.
- Booking creation for contract and spot bookings with multi-delivery support.
- Booking assignment to vendor, vehicle, and driver.
- Loading execution.
- Shipment document capture after loading, including per-delivery invoice data, e-way bill data, mock invoice extraction, live freight recalculation, and LR generation.
- Transit and delivery execution with POD capture, expenses, and structured remarks.
- Driver App simulation that shows assigned trips to the logged-in driver only and updates booking execution using local state.

There is no live backend integration. All runtime behavior is driven by mock seed data plus browser persistence.

## 2. Tech Stack

- React `19.1.0`
- React DOM `19.1.0`
- React Router DOM `7.6.1`
- TypeScript `5.8.3`
- Vite `6.4.1`
- Tailwind CSS `3.4.17`
- Framer Motion
- Lucide React
- Zod
- XLSX for customer address and customer rate-card import parsing

State and runtime handling:

- No Redux or Zustand runtime store is used.
- Centralized app state is managed through `MockStoreProvider` in `src/app/mock-store.tsx`.
- Feature hooks expose CRUD and workflow helpers over the mock store.
- Session state is handled separately in `src/app/session-context.tsx`.
- Driver App session, offline queue, incidents, expenses, and checklist data are persisted in `localStorage`.

## 3. Module Breakdown

### 3.1 Administration Module

Implemented administration areas include:

- Platform administration:
  - tenant onboarding and edit flow
  - plan assignment
  - platform module management
  - platform settings
  - platform audit logs
- Tenant administration:
  - hierarchy level configuration
  - org unit management
  - user management for internal, vendor, driver, and customer users
  - role management
  - role permission matrix
  - tenant module visibility
  - tenant audit log view
  - tenant settings page

Key behaviors:

- Org units enforce previous-level parent selection.
- Role hierarchy changes are blocked if assigned users would become invalid.
- Internal users require org units from the selected role level.
- Vendor users require linked vendor.
- Customer users require linked customer.
- Driver users require driver name or driver code.
- Disabled tenant modules restrict role assignment.

### 3.2 Customer Module

Customer setup is implemented as a guided workflow with these stages:

1. Basic Details
2. Addresses
3. Contacts
4. Credit & Billing
5. Contracts
6. Preferences

Current customer fields include:

- customer name, legal name, tier, code
- billing address, relationship manager, internal account owner
- GSTIN, PAN
- primary, accounts, and logistics contacts
- credit limit, credit days, current outstanding
- GST charge type, invoice format
- preferred vehicle types
- communication channel
- default payment mode
- allow auto booking
- `Rate Matching Basis`

Current `Rate Matching Basis` options:

- `LANE_TO_LANE`
- `CITY_TO_CITY`
- `PINCODE_TO_PINCODE`
- `ADDRESS_TO_ADDRESS`

Address handling:

- manual address creation
- bulk address import
- address status tracking
- customer-linked address master records used by booking and remarks

Commercial configuration implemented in UI:

- customer rate cards
- customer-specific UOM overrides
- preferred vehicle types
- auto booking preference
- rate matching basis

### 3.3 Rate Card Module

Customer rate-card management supports manual entry and Excel/CSV import. The current customer rate-card structure in UI and parsing includes:

- Lane
- From City
- To City
- From Location
- To Location
- From Pincode
- To Pincode
- Vehicle Type
- Rate Type
- Underload Rate
- Overload Rate
- TAT
- Effective From Date
- Effective To Date
- Remarks
- Status

Current supported customer rate types in code:

- `PER_MT`
- `PER_KM`
- `PER_TRIP`
- legacy-compatible `PER_TON`
- legacy-compatible `FIXED`

Current rate-card behaviors:

- import validates the expected template columns
- old rows using legacy fields are still normalized for backward compatibility
- matching is customer-config driven through `validateRateCard(...)`
- effective date range is checked during mock validation
- vehicle type filtering is applied when vehicle type is present

Vendor rate cards are also present in the tenant workspace, but booking pricing in the current flow uses customer rate cards for contract freight validation.

### 3.4 Booking Module

Implemented booking pages:

- Booking list
- Create booking
- Edit booking
- Booking detail workspace
- Rate approval queue
- Assignment queue
- In Transit / Control Tower board
- Completed / POD board
- LR view page

Current booking creation flow:

1. Select customer.
2. Select commercial type.
3. Select service type.
4. Add one or more deliveries.
5. Select source, destination, material, quantity, UOM, weight, and optional distance per delivery.
6. For contract booking, resolve mock rate-card pricing.
7. Enter pickup details and remarks.
8. Save draft or submit.

Current lifecycle after submission:

- `DRAFT`
- `PENDING_RATE_APPROVAL` when contract deviation requires approval
- `PENDING_ASSIGNMENT`
- `ASSIGNED`
- `LOADING`
- `LOADED`
- `DOCUMENT_PENDING`
- `DOCUMENT_COMPLETED`
- `READY_FOR_DISPATCH`
- `IN_TRANSIT`
- `ARRIVED`
- `DELIVERED`
- `INVOICED`
- `PAID`

Legacy `DISPATCHED` is still supported in code for older seeded or stored bookings.

Assignment and execution behavior:

- assignment requires vendor, vehicle, driver, and vendor freight
- margin percent is calculated from customer freight vs vendor freight
- driver ownership must match vehicle ownership
- loading start writes `loadingStartedAt` and moves booking to `LOADING`
- loading end writes `loadingCompletedAt`, records `LOADED`, then moves to `DOCUMENT_PENDING`

Shipment Documents section:

- lives inside Booking Details as its own tab
- works per delivery
- supports multiple invoices for one delivery
- supports single and multi-delivery bookings
- stores editable shipment-document drafts in local state and persists on submit

Per-delivery invoice fields currently implemented:

- Invoice document
- Invoice number
- Invoice value
- Invoice date
- Invoice material
- Sub brand
- Invoice quantity
- Quantity UOM
- Invoice weight
- Weight UOM

Per-delivery package / actual fields:

- Material
- Sub brand
- Actual quantity
- Quantity UOM
- Actual weight
- Weight UOM

Per-delivery e-way bill fields:

- E-way bill document
- E-way bill number
- Valid from date
- Valid from time
- Valid to date
- Valid to time

Current document flow:

- mock `extractInvoiceData(file)` pre-fills invoice fields from uploaded PDF file name
- user can edit extracted fields before submit
- submit validates required invoice, e-way bill, and actual weight data
- document submit stores shipment documents, updates flat document snapshots for compatibility, recalculates freight, generates LR metadata, and moves booking to `DOCUMENT_COMPLETED`
- user can then mark the booking `READY_FOR_DISPATCH`

Current freight recalculation behavior:

- contract bookings use local `validateRateCard(...)`
- matching basis comes from customer `rateMatchingBasis`
- date validity is checked
- rate type comes from booking pricing snapshot

Implemented pricing logic in shipment documents:

- `PER_MT`
  - uses cumulative actual weight across deliveries
  - uses latest delivery destination for the current leg
  - recalculates the full amount each time
  - does not sum previous leg amounts
- `PER_TRIP`
  - ignores weight
  - revalidates using source, last destination, vehicle type, and rate type
  - returns fixed matched rate
- `PER_KM`
  - placeholder only

Current edge-case behavior:

- no match shows `No rate found for selected configuration.`
- missing actual weight blocks `PER_MT` calculation
- live freight preview is debounced

### 3.5 LR / Consignment Module

Tenant LR configuration pages are implemented with:

- scope selection
- LR type configuration
- pool ownership
- pool source
- prefix and number format controls
- hierarchical allocation options

Booking-linked LR behavior currently implemented:

- LR number is generated after shipment document submission, not at booking creation
- generated LR is stored in both assignment and delivery records
- LR view page is available at booking level
- LR page supports two preview modes:
  - `COMBINED`
  - `ROW_WISE`
- LR page allows local updates to:
  - extra charges
  - advance
  - row-wise vs combined summary

Current LR mapping shown in UI:

- LR number
- booking ID
- LR date
- vehicle number
- driver name
- driver mobile
- consignor
- consignee
- customer
- invoice numbers
- e-way bill numbers
- shipment totals
- freight rate
- extra charges
- advance
- total due

### 3.6 Remarks / Delivery Module

Delivery and remarks are implemented inside Booking Details and downstream support pages.

Current delivery remark types:

- `INTACT`
- `DEPS`
- `ACCIDENT_INCIDENT`
- `VEHICLE_PLACEMENT_DELAY_DEVIATION`
- `DELIVERY_DELAY`
- `EPOD_SUBMITTED`
- `EPOD_NOT_SUBMITTED`
- `ORIGINAL_POD_NOT_SUBMITTED`
- `VEHICLE_BREAKDOWN`
- `DESTINATION_CHANGED`
- `CONSIGNEE_DESTINATION_CHANGED`

Current behaviors:

- remarks are linked to a delivery ID
- some types require location
- some types require remark text
- consignee-destination change requires consignee and destination
- POD becomes active only after booking reaches `DELIVERED`
- POD is saved per delivery

### 3.7 Driver App Module

The repo currently includes a web-based Driver App simulation under tenant routes.

Implemented sections:

- Driver Login
- Driver Dashboard
- My Trips
- Trip Details
- Incident Center
- Profile

Current driver flow:

- driver logs in using mobile number and mock OTP `123456`
- session is stored in local storage
- only active and available drivers can log in
- driver sees only bookings where assigned `driverId` matches session driver

Trip execution features:

- pre-departure checklist
- start trip
- mark arrival
- POD capture
- incident raise
- expense entry
- offline action queue with sync count

Current driver trip status grouping:

- upcoming: `ASSIGNED`, `LOADING`, `LOADED`, `DOCUMENT_PENDING`, `DOCUMENT_COMPLETED`, `READY_FOR_DISPATCH`, legacy `DISPATCHED`
- active: `IN_TRANSIT`, `ARRIVED`
- completed: `DELIVERED`
- exception: `EXCEPTION`

Driver trip start is currently blocked until:

- checklist is complete
- booking is `READY_FOR_DISPATCH` or legacy `DISPATCHED`

## 4. Data Handling

Current runtime data sources:

- `src/services/mock/data.ts` seed data
- `MockStoreProvider` runtime store
- `localStorage` persistence

Persisted domains include:

- platform tenants
- platform modules
- platform settings
- platform audit logs
- hierarchy workspaces
- org units
- users
- roles
- role permissions
- customers
- customer addresses
- customer rate cards
- vendors
- vendor rate cards
- vehicle types
- vehicles
- drivers
- materials
- UOM definitions
- UOM mappings
- LR configs
- bookings
- driver app session and offline data

Current caching/persistence behavior:

- booking, master, and admin data are stored in browser persistence
- recovery logic supports current keys, namespaced keys, legacy keys, and backup keys
- shipment document drafts are edited in component state first, then saved into the booking record
- driver offline actions are queued locally and replayed when the browser comes back online

## 5. Key Functional Logic

Current implemented logic includes:

- contract rate matching based on customer `rateMatchingBasis`
- date-window validation during local rate-card matching
- conditional vehicle type matching when vehicle type is present
- customer-specific UOM override fallback to tenant UOM mapping
- multi-delivery booking aggregation for quantity, weight, and distance
- per-delivery shipment documents with multiple invoices
- invoice extraction simulation from uploaded PDF metadata
- debounced live freight recalculation in Booking Details
- `PER_MT` cumulative recalculation using latest destination leg
- `PER_TRIP` fixed-rate refresh from matched rate card
- `PER_KM` placeholder status only
- LR generation after document submission
- status transition enforcement through centralized booking transition rules
- delivery status synchronization with booking status transitions
- driver-specific trip filtering in Driver App
- offline driver action queue with later replay

Conditional rendering currently implemented:

- assignment actions only for `PENDING_ASSIGNMENT`
- loading actions only for `ASSIGNED` and `LOADING`
- shipment-document actions after loading
- ready-for-dispatch action only after document completion
- transit actions only after ready-to-dispatch or transit states
- POD entry only after booking is delivered
- expense entry only in transit
- driver start-trip action only when checklist is complete and trip is dispatch-ready

## 6. Routing Structure

Platform routes:

- `/platform/dashboard`
- `/platform/tenants`
- `/platform/tenants/:tenantId`
- `/platform/modules`
- `/platform/plans`
- `/platform/audit-logs`
- `/platform/settings`

Tenant administration and setup routes:

- `/tenant/:tenantId/dashboard`
- `/tenant/:tenantId/hierarchy`
- `/tenant/:tenantId/org-units`
- `/tenant/:tenantId/customers`
- `/tenant/:tenantId/customers/:tenantCustomerId`
- `/tenant/:tenantId/vendors`
- `/tenant/:tenantId/vendors/:tenantVendorId`
- `/tenant/:tenantId/users`
- `/tenant/:tenantId/users/:userId`
- `/tenant/:tenantId/roles`
- `/tenant/:tenantId/roles/:roleId`
- `/tenant/:tenantId/role-permissions`
- `/tenant/:tenantId/vehicle-types`
- `/tenant/:tenantId/vehicles`
- `/tenant/:tenantId/drivers`
- `/tenant/:tenantId/materials`
- `/tenant/:tenantId/uom-config`
- `/tenant/:tenantId/lr-config`
- `/tenant/:tenantId/modules`
- `/tenant/:tenantId/audit-logs`
- `/tenant/:tenantId/settings`

Tenant TMS routes:

- `/tenant/:tenantId/bookings`
- `/tenant/:tenantId/bookings/create`
- `/tenant/:tenantId/bookings/rate-approval`
- `/tenant/:tenantId/bookings/assignment`
- `/tenant/:tenantId/bookings/live-tracking`
- `/tenant/:tenantId/bookings/completed`
- `/tenant/:tenantId/bookings/:bookingId/edit`
- `/tenant/:tenantId/bookings/:bookingId`
- `/tenant/:tenantId/bookings/:bookingId/lr`

Driver App routes:

- `/tenant/:tenantId/driver-app/login`
- `/tenant/:tenantId/driver-app/dashboard`
- `/tenant/:tenantId/driver-app/trips`
- `/tenant/:tenantId/driver-app/trips/:bookingId`
- `/tenant/:tenantId/driver-app/incidents`
- `/tenant/:tenantId/driver-app/profile`

Navigation flow:

- platform uses `PlatformLayout`
- tenant workspace uses `TenantLayout`
- driver app is nested under tenant routing but uses its own layout and session flow

## 7. Component Architecture

High-level structure:

- `src/app`
  - router
  - mock store provider
  - session context
- `src/layouts`
  - platform and tenant layouts
- `src/components`
  - shared UI primitives
  - page headers
  - tables
  - tenant/platform shell components
- `src/features/platform`
  - platform workspace pages
- `src/features/tenant`
  - tenant admin, customer, vendor, fleet, master-data, and workspace pages
- `src/modules/tms/booking`
  - booking pages, support pages, hooks, status components, timeline components, pricing/matching services, shipment-document services
- `src/modules/tms/driver-app`
  - driver app pages, local store, and driver-specific types
- `src/services/mock`
  - seed data
- `src/lib`
  - import utilities, browser storage helpers, hierarchy utilities
- `src/types`
  - customer, fleet, vendor, platform, and workspace domain types

Reusable components used heavily in current UI:

- `PageHeader`
- `DataTable`
- `TenantPanel`
- `TenantSummaryCard`
- `TenantEmptyState`
- `Badge`
- `Button`
- `Dialog`
- `Input`
- `Select`
- `Tabs`
- `Textarea`
- `BookingStatusBadge`
- `BookingStatusTimeline`
- `BookingRemarksTimeline`

Smart vs presentational split:

- Smart pages and hooks live mainly in `src/features/**`, `src/modules/**`, and `src/app/mock-store.tsx`
- reusable presentational primitives live mainly in `src/components/**`
- booking logic helpers are concentrated in `src/modules/tms/booking/services/**`

## 8. Current Limitations

- No backend integration is active.
- No real API calls are used for booking pricing, driver execution, invoice extraction, or LR generation.
- Invoice extraction is simulated; no PDF parsing library is used.
- `PER_KM` document-stage freight recalculation is placeholder only.
- Booking status flow still keeps legacy `DISPATCHED` support for compatibility with old stored data.
- Customer and vendor delete flows are not active in the current UI.
- Live tracking is an operational board, not a map integration.
- Driver media upload is represented by file-name style capture, not actual file transfer to a server.
- LR preview is printable but not exported to a downloadable PDF by code.

## 9. Assumptions

These assumptions are derived from code behavior, not confirmed backend logic.

- The current product is intended to operate fully in mock/frontend mode because the router is wrapped in `MockStoreProvider`.
- The platform workspace is part of the actively implemented application, not only the TMS tenant workspace.
- Shipment document freight recalculation is authoritative only within frontend mock behavior and does not represent confirmed backend billing rules.
- LR generation in the current codebase is a frontend record-generation flow tied to booking document submission, not a confirmed backend LR allocation engine.
- Driver execution permissions are inferred from assignment and local session logic only; no server-side authorization is present in this repository.
