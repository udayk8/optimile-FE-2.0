# Platform Admin · Tenant Admin · Booking (TMS)

Single reference covering the three control planes of this codebase: the
**platform-admin** shell (operates the platform), the **tenant-admin**
shell (a tenant operates its own workspace and embeds every module), and
the **TMS booking** module (the operational engine for shipments).

---

## 1. Platform Admin — `modules/platform-admin-new`

The Optimile-internal control plane. Used by platform operators to
onboard tenants, manage platform modules, and configure plans.

### URL prefix

```
/platform-admin/...
```

### Routes (`src/app/PlatformAdminApp.tsx`)

| Path | Page | Folder |
|---|---|---|
| `/platform-admin/dashboard` | `PlatformDashboardPage` | `pages/dashboard/` |
| `/platform-admin/tenants` | `PlatformTenantsPage` (list) | `pages/tenants/` |
| `/platform-admin/tenants/:tenantId` | `PlatformTenantDetailPage` (governance, modules, primary admin) | `pages/tenants/` |
| `/platform-admin/modules` | `PlatformModulesPage` (platform-level module catalog) | `pages/modules/` |
| `/platform-admin/tenant-login` | Redirect to unified login | — |

Other folders inside `pages/`: `audit-logs/`, `plans/`, `settings/` —
present but not currently wired into the router.

### Legacy redirects

Old URLs like `/platform-admin/tenant/...` and `/platform-admin/tms/booking/...`
are rewritten to `/tenant-admin/tenant/...` automatically — the tenant
workspace now lives entirely under the tenant-admin shell.

### What platform-admin owns (vs. tenant-admin)

- Creating tenants and provisioning their primary admin user.
- Enabling/disabling platform modules per tenant (`tenant.enabledModuleCodes`).
- Platform-level catalogs: modules, plans, capabilities.
- Cross-tenant view (a tenant operator never sees other tenants).

---

## 2. Tenant Admin — `modules/tenant-admin-new`

The tenant workspace shell. Every tenant user (Tenant Admin, Procurement
User, Fleet Manager, etc.) operates here. Hosts governance pages **and**
embeds every operational module (Booking from TMS, Auction, Vendor,
Fleet, Customer, Tracking) so the user never leaves the shell.

### URL prefix

```
/tenant-admin/tenant/:tenantId/...
```

### What lives here

| Area | Pages | Source |
|---|---|---|
| Governance | Dashboard, Hierarchy, Org Units, Users, Roles, Role Permissions, Modules, Audit Logs, Settings | `src/modules/tenant-admin/pages/` |
| Embedded portals | Vendor, Fleet, Auction / AMS, Customer, Track & Trace | `src/modules/tenant-admin/pages/embedded-modules/` |
| Layout & sidebar | Tenant shell chrome | `src/layouts/tenant/tenant-layout.tsx` |
| Routes | All tenant routes | `src/app/TenantAdminApp.tsx` |

Booking pages (`BookingListPage`, `CreateBookingPage`, etc.) live in
`modules/tms` but are mounted on tenant-admin routes — there is no
standalone TMS app.

### Sidebar gating

`tenant-layout.tsx` builds `tenantNav` per request based on:

- `tenant.enabledModuleCodes` — what the tenant has turned on
- `activeRole.moduleCodes` + `isTenantAdminRole(role)` — what the user can see

Key rules:

- **Top-level "Dashboard"** — visible only to Tenant Admin role.
- **Administration group** — visible only to Tenant Admin. Children: Hierarchy, Org Units, Users, Roles, Role Permissions, plus TMS setup (Customers, Vendors, Vehicle Types, Materials, UOM, Address Book, LR Config, Assignment/Document/POD Rules).
- **Module groups** (Booking, Auction, Track and Trace, Vendor, Fleet, Customer) — visible when tenant has the module enabled AND the role has at least one view-permitted feature. The group header has a `to` so clicking it expands + lands on the module dashboard; clicking again collapses.

### Smart landing

`packages/shared-admin-core/src/modules/tenant-admin/lib/tenant-landing.ts` exports `pickTenantLandingPath(tenantId, role, enabledModules)`.

- Tenant Admin → `/dashboard` (governance overview)
- Anyone else → first code in `tenant.enabledModuleCodes` the role has access to → that module's dashboard
- `PROCUREMENT` routes to Auction dashboard

Used by `unified-login-page.tsx` (login redirect) AND `TenantDashboardPage` (refresh / direct-URL guard — non-admins hitting `/dashboard` are bounced).

### Permissions

- `useTenantAccess()` (`src/modules/tenant-admin/hooks/`) → `hasFeaturePermission(moduleCode, featureCode, action)`
- `<PermissionGate moduleCode="..." featureCode="..." action="...">` wraps protected routes/pages
- Feature registry: `packages/shared-admin-core/src/modules/tenant-admin/lib/tenant-modules.ts` (`BOOKING_FEATURES`, `AUCTION_FEATURES`, `FLEET_FEATURES`, etc.)
- Role Permission Matrix UI: `src/modules/tenant-admin/pages/shared/tenant-placeholder-pages.tsx` → `TenantRolePermissionsPage`
- `ADMIN` is reserved for the system Tenant Admin role only — sidebar and matrix filters use `isTenantAdminRole(role)`, not `moduleCodes.includes("ADMIN")`.

### Adding a tenant page

1. Build the page component under `src/modules/tenant-admin/pages/<area>/`.
2. Register the route in `src/app/TenantAdminApp.tsx`, wrap in `<PermissionGate>` if gated.
3. Add a sidebar entry in `tenant-layout.tsx` with `featureCode` + `pageCode`.
4. If introducing a new permission: add the feature code to the relevant `*_FEATURES` array in `tenant-modules.ts` and a row to `PERMISSION_GROUPS` in `tenant-placeholder-pages.tsx`.

---

## 3. Booking (TMS) — `modules/tms`

The TMS booking engine. End-to-end shipment lifecycle: Draft → Rate
Approval → Assignment → In-Transit → POD → Invoiced. Mounted inside the
tenant-admin shell — no standalone app.

### Routes (registered in `tenant-admin-new/src/app/TenantAdminApp.tsx`)

| Path | Page | Permission |
|---|---|---|
| `/bookings` | `BookingListPage` | `TMS / BOOKING_DASHBOARD` (view) |
| `/bookings/create` | `CreateBookingPage` | `TMS / CREATE_BOOKING` (create) |
| `/bookings/:id` | `BookingDetailsPage` | `TMS / BOOKING_DASHBOARD` (view) |
| `/bookings/:id/edit` | `CreateBookingPage` | `TMS / CREATE_BOOKING` (edit) |
| `/bookings/:id/documents` | `BookingDocumentsPage` | `TMS / SHIPMENT_DOCUMENTS` |
| `/bookings/:id/lr` | `BookingLRViewPage` | `TMS / LR_MANAGEMENT` |
| `/bookings/rate-approval` | `RateApprovalQueuePage` | `TMS / BOOKING_ASSIGNMENT` |
| `/bookings/assignment` | `AssignmentQueuePage` | `TMS / BOOKING_ASSIGNMENT` |
| `/bookings/live-tracking` | `LiveTrackingPlaceholderPage` | `TMS / BOOKING_DASHBOARD` |
| `/bookings/completed` | `PODCompletedPage` | `TMS / POD` |
| `/shipment-documents` | `ShipmentDocumentsListPage` | `TMS / SHIPMENT_DOCUMENTS` |
| `/booking-reports` | `BookingReportsPage` | `TMS / BOOKING_REPORTS` |

All paths are under `/tenant-admin/tenant/:tenantId/...`.

### Source layout

```
modules/tms/src/modules/tms/booking/
  BookingList.tsx              list + pipeline view
  CreateBooking.tsx            create + edit (same component, mode flag)
  BookingDetails.tsx           detail page
  BookingDocumentsPage.tsx
  BookingLRView.tsx
  AssignmentQueue.tsx
  RateApprovalQueue.tsx
  BookingSupportPages.tsx      PODCompletedPage, LiveTrackingPlaceholderPage
  components/                  status badges, modals, panels
  hooks/                       useTenantBookings, useBookingAdminSources, ...
  services/                    booking-engine, booking-selectors, ...
  types.ts                     BookingRecord, BookingStatus, ...
```

Stores, RBAC, and role templates live in `modules/tms/src/shared/`.

### Feature codes (`BOOKING_FEATURES` in `tenant-modules.ts`)

Operational:
`BOOKING_DASHBOARD`, `CREATE_BOOKING`, `BOOKING_ASSIGNMENT`, `SHIPMENT_DOCUMENTS`, `POD`, `BOOKING_REPORTS`, `LR_MANAGEMENT`

Setup (under Administration in the sidebar):
`CUSTOMERS`, `VENDORS`, `VEHICLE_TYPES`, `MATERIALS`, `UOM`, `ADDRESS_BOOK`, `LR_CONFIGURATION`, `ASSIGNMENT_RULES`, `DOCUMENT_RULES`, `POD_RULES`

Pages call `useTenantAccess()` then `access.hasFeaturePermission("TMS", featureCode, action)`. Action buttons follow the disabled-with-tooltip pattern — the button stays visible but greyed, with a `title=` tooltip explaining the missing permission.

Implication encoded in `tenant-permissions.ts`:
- `TMS / CREATE_BOOKING (create)` implies `TMS / BOOKING_DASHBOARD (view)`.

### Booking lifecycle

`getPrimaryBookingStatus(booking)` in `booking-engine.ts` is the source of
truth for the status badge across all views. Pipeline columns in
`BookingListPage` map status → column:

```
DRAFT → PENDING_RATE_APPROVAL → PENDING_ASSIGNMENT → IN_TRANSIT →
POD_PENDING → COMPLETED → INVOICED   (+ EXCEPTION, CANCELLED side states)
```

ERP bookings are a placeholder column — no dedicated status yet.

### Adding a booking page

1. Build the component under `modules/tms/src/modules/tms/booking/`.
2. Register the route in `tenant-admin-new/src/app/TenantAdminApp.tsx`, wrap in `<PermissionGate moduleCode="TMS" featureCode="..." />`.
3. Add a sidebar entry in `tenant-layout.tsx` Booking group with `featureCode`.
4. If new permission: add to `BOOKING_FEATURES` in `tenant-modules.ts` and a matrix row in `PERMISSION_GROUPS` (`tenant-placeholder-pages.tsx`).

---

## How the three connect

```
Platform Admin             Tenant Admin (per tenant)               Modules embedded
─────────────              ──────────────────────────              ──────────────────
/platform-admin/...        /tenant-admin/tenant/:tid/...
  dashboard                  dashboard         (Tenant Admin only)
  tenants/:tid  ──onboards─▶ hierarchy, users, roles, permissions
  modules       ──enables──▶ tenant.enabledModuleCodes ───────────▶ Booking (TMS):  /bookings/*
                             role.moduleCodes (gated)              Auction:        /auction-ams/*
                             tenant-landing.ts → first dashboard   Fleet:          /fleet-management/*
                                                                   Vendor:         /vendor-portal/*
                                                                   Customer:       /customer-portal
                                                                   Tracking:       /track-and-trace/*
```

## Verification

Per `CLAUDE.md`: verify admin/tenant/booking changes with `vite build` or
the dev server, **not** `tsc` (root tsconfig is misaligned and excludes
the live folders).

Dev server: `npm run dev` → http://127.0.0.1:3000.
