# LR (Lorry Receipt) Module

End-to-end documentation for the LR module — **configuration** and **management/operations** for the three LR types: **Manual LR**, **Pre‑generated / Customer LR**, and **Auto LR** — plus their integration with **booking assignment** (internal direct assignment and vendor‑indent assignment).

> Implementation note: state lives in the shared mock store (`packages/shared-admin-core/src/shared/store/mock-store.tsx`) and is persisted to `localStorage`. This document describes the current prototype behavior and the files that implement it.

---

## 1. Overview

An **LR (Lorry Receipt)** is the consignment note number attached to a booking/delivery. The LR module governs **how LR numbers are formatted, owned (per place), allocated, and consumed** across a tenant's organization hierarchy (Company Root → Region → Branch …).

There are three generation strategies (`lrType`):

| Type | When the number exists | Inventory unit |
|---|---|---|
| **MANUAL** | Pre-created/uploaded as a pool of actual numbers; consumed at assignment | A list of real LR numbers (pools) |
| **PRE_GENERATED / Customer LR** | Same as manual, but a slice is reserved for a specific customer | Customer‑reserved pools |
| **AUTO** | The number is **generated on the fly during vehicle assignment** | A **count/quota** per place (no number list until assignment) |

The same **hierarchy place governance** applies to all three: a user only sees/acts on their **active place + child places** (Company Root sees all).

---

## 2. Routes & top-level pages

| Surface | Route | Component (file) |
|---|---|---|
| LR Operations | `/tenant-admin/tenant/:tenantId/lr` | `TenantLrOperationsPage` — `…/pages/lr/lr-operations-page.tsx` |
| ↳ Manual mode | `/lr?mode=manual` | `TenantManualLrOperationsPage` — `…/pages/lr/manual-lr-operations-page.tsx` |
| ↳ Auto mode | `/lr?mode=auto` | `TenantAutoLrOperationsPage` — `…/pages/lr/auto-lr-operations-page.tsx` |
| LR Configuration | `/tenant-admin/tenant/:tenantId/lr-config` | `TenantLRConfigPage` — `…/pages/lr/lr-config-page.tsx` |
| ↳ Manual config | `/lr-config?mode=manual` | `TenantManualLRConfigPage` — `…/pages/lr/manual-lr-config-page.tsx` |
| ↳ Auto config | `/lr-config?mode=auto` | `TenantAutoLRConfigPage` — `…/pages/lr/auto-lr-config-page.tsx` |
| Mode tabs | — | `…/pages/lr/lr-mode-tabs.tsx` |
| Booking assignment | `/lr` is consumed by `bookings/assignment` and `bookings/:id` | `…/tms/booking/AssignmentQueue.tsx`, `…/tms/booking/BookingDetails.tsx` |

> **Pre‑generated / Customer LR** is **not a separate route** — it is the **"reserved" tab** ("Pre-generated LR / Customer LR" panel) inside the Manual LR Operations page (`manual-lr-operations-page.tsx`).

Base path prefix (paths are tenant-scoped): `modules/tenant-admin-new/src/modules/tenant-admin`.

---

## 3. Data model

### 3.1 LR configuration — `TenantLRConfig`
`packages/shared-admin-core/src/types/master-data.ts`

Key fields:
- `id`, `tenantId`, `status` (`active`/`inactive`)
- `lrType`: `"MANUAL" | "PRE_GENERATED" | "AUTO"`
- **Format**: `prefix`, `yearFormat` (`NONE`/`YY`/`YYYY`), `numberSeparator`, `zeroPaddingLength`, `numberingPolicy` (`STRICT_FORMAT` / `FLEXIBLE_PHYSICAL_BOOK`)
- **Scope / hierarchy**: `scopeType` (`TENANT`/`HIERARCHY`), `ownershipLevelId`, `distributionStrategy`, `workflowMode` (`APPROVAL_BASED` …)
- **Child governance**: `childGovernanceRules: ManualLRChildGovernanceRule[]`
- **Per-place format**: `placeFormatOverrides: ManualLRPlaceFormatOverride[]`
- **Customer ownership**: `customerOwnershipEnabled` (enables Customer LR), `customerId`
- `allocationFlow` (per-level capabilities)

`ManualLRChildGovernanceRule` (per child level): `childLevelId`, `formatMode`, `childCanRequestLr`, `parentCanGenerateLr`, `canApproveChildRequests`, `allocationRequired`, `approvalRequired`, `canTransferLr`, etc.

`ManualLRChildFormatMode`:
- `GLOBAL_PARENT_FORMAT` — child uses the parent sequence pattern (e.g. `ELAUTO-000001`)
- `PARENT_PREFIX_CHILD_SUFFIX` — parent prefix + child code (e.g. `ELAUTO-SOUTH-000001`)
- `FULL_CHILD_FORMAT` — child is its own independent sequence authority (e.g. `SOUTH-000001`)

`ManualLRPlaceFormatOverride`: `{ orgUnitId, prefix?, yearFormat?, numberSeparator?, zeroPaddingLength?, numberingPolicy? }` — the `prefix` here is the **child code** for `PARENT_PREFIX_CHILD_SUFFIX` and the **full prefix** for `FULL_CHILD_FORMAT`.

### 3.2 LR pool (Manual + Pre‑generated) — `TenantLrPoolRecord`
`modules/tms/src/modules/tms/booking/types.ts`

`id`, `tenantId`, `configId`, `lrNumber`, `status` (`AVAILABLE | ALLOCATED | USED | VOID`), `customerId`, `vendorId`, `poolType` (`GENERAL | CUSTOMER_RESERVED`), **place** (`ownerPlaceId` / `currentPlaceId` / `ownerLevelId`), `ownerUserId`, `bookingId`, `deliveryId`, `usedAt`, `voidReason`, `auditEvents[]`, `createdBy`, timestamps.

> Place is resolved as `currentPlaceId ?? ownerPlaceId ?? ownerLevelId`.

### 3.3 Generated LR (Auto + consumed Manual/Pre-gen) — `TenantLrRecord`
`modules/tms/src/modules/tms/booking/types.ts`

`id`, `tenantId`, `lrNumber`, `bookingId`, `deliveryId`, `customerId`, `vehicleNumber`, `driverName`, `status`, `type` (`MANUAL | PREGENERATED | AUTO`), `configId`, **`orgUnitId`** (owning place — set at generation; powers Auto LR per‑place counts), timestamps.

### 3.4 Allocation request — `TenantLrAllocationRequestRecord`
`sourceOrgUnitId` (requester), `targetOrgUnitId` (approver/parent), `requestedCount`, `approvedCount`, `status` (`PENDING | APPROVED | REJECTED`), `lrType`, `configId`, `decidedAt`, `rejectionReason`, etc.

### 3.5 Vendor indent — `BookingVendorIndent`
`packages/shared-admin-core/src/types/booking-indent.ts` — one record per (booking, vendor). For LR it carries `lrModeForVendorAssignment: "AUTO"`, `lrPlaceId`, `lrPlaceName` (vendor assignment is Auto‑LR‑only at the booking owner's place).

### 3.6 Storage keys
`packages/shared-admin-core/src/shared/lib/storage/browser-storage.ts` + literals:
- `optimile.tenant.lrConfigs`, `optimile.tenant.lrPools`, `optimile.tenant.lrs`, `optimile.tenant.lrRequests`, `optimile.tenant.lrTransfers`
- `optimile.tenant.bookingVendorIndents`

### 3.7 Store methods (`useMockStore`)
`listTenantLRConfigs`, `listTenantLrPools`, `upsertTenantLrPools`, `listTenantLrs`, `listTenantLrRequests`, `assignTenantBooking`, `transitionTenantBookingStatus`, `sendBookingVendorIndent`, `respondBookingVendorIndent`, plus the LR management service hook `useTenantLrManagementService` (`createRequest`, `approveRequest`, `rejectRequest`, `upsertPools`, `appendAuditLog`, allocate/transfer).

---

## 4. Hierarchy & place governance

- **Org units**: `OrgUnit { id, tenantId, name, hierarchyLevelId, parentOrgUnitId, status }` (`packages/shared-admin-core/src/types/access.ts`). Levels (Company Root / Region / Branch …) have an `order`.
- **Scope rule** (used everywhere): a user can see/act on their **active place + all descendants**; Company Root / Tenant Admin → **all places**; never parent/unrelated places.
- **Helpers**:
  - `computeEffectiveUserScope(user, role, orgUnits)` → `{ isCompanyRoot, allowedOrgUnitIds (Set: self + descendants, or all) }` — `…/modules/tenant-admin/lib/user-scope.ts`
  - `resolveManualLrScopedOrgUnits(...)` / `resolveManualLrConsumableOrgUnits(...)` — `…/shared/lib/manual-lr-scope.ts`, `…/shared/lib/manual-lr-governance.ts`
  - Manual operations page derives `visibleOwnershipOrgUnitIds` (active place + descendants via BFS) for inventory/allocation visibility.

---

## 5. LR number format & resolution

Format resolution is **shared across all LR types**:
`resolveManualLrFormatForOrgUnit(config, orgUnitId, orgUnits)` (`…/modules/tenant-admin/lib/manual-lr.ts`) walks the org‑unit lineage and applies, per level, the matching `childGovernanceRules.formatMode` and `placeFormatOverrides`:

- `GLOBAL_PARENT_FORMAT` → keep parent format.
- `PARENT_PREFIX_CHILD_SUFFIX` → `prefix = parentPrefix + childCode` (childCode = `override.prefix` or the org‑unit name, cleaned to `A–Z0–9`).
- `FULL_CHILD_FORMAT` → child uses its own `override.prefix` + format.

Builders: `buildManualLrNumber(format, sequence)`, `buildManualLrPreview(format)`, `buildFormattedLrNumber(...)`. The resolved format + a sequence produce the final number (e.g. `BLSRBLR-2026-000001`).

---

## 6. LR Configuration

`/lr-config` → mode tabs choose Manual or Auto config. (Pre‑generated uses a config with `lrType: "PRE_GENERATED"` / `customerOwnershipEnabled`.)

### 6.1 Manual / Pre‑generated config (`manual-lr-config-page.tsx`)
- Define the base **format** (prefix, year, separator, padding, numbering policy).
- **Child governance** per level (can request / approve / allocate / transfer; allocation/approval required).
- **Child format mode** (the 3 modes) + per‑place **child code / prefix** editor (writes `placeFormatOverrides`).
- Workflow mode and ownership level.

### 6.2 Auto LR config (`auto-lr-config-page.tsx`)
Tabs: **Governance, Sequence Rules, Allocation Rights, Requests, Generation Audit, Runtime Preview**.
- **Sequence Rules**: prefix / year / separator / padding (base tenant format).
- **Child format mode cards** (same 3 modes as Manual) — radio per child level.
- **Child code per place**: when mode is `PARENT_PREFIX_CHILD_SUFFIX` (child code) or `FULL_CHILD_FORMAT` (child prefix), a per‑child‑place input writes `placeFormatOverrides[orgUnit].prefix`, with a **live preview** of the resolved pattern for each place.
- **Runtime Preview** shows the resolved pattern, next number, and the child **format mode**.

---

## 7. Manual LR — management / operations

`manual-lr-operations-page.tsx`. Inventory and actions are scoped to the user's active place + descendants. Manual LR's defining trait: **approval/allocation creates actual LR numbers (pools)**.

Workflow actions (gated by `childGovernanceRules` + workflow permissions): `UPLOAD_LR`, `ALLOCATE_LR`, `REQUEST_LR`, `APPROVE_LR`, `TRANSFER_LR`, `CONSUME_LR`, `VOID_LR`, `VIEW_AUDIT`.

- **Upload / create pool**: create a range or list of actual numbers (`poolType = GENERAL` or `CUSTOMER_RESERVED`) owned by the **active place** (`ownerPlaceId/currentPlaceId/ownerLevelId = activeOrgUnit`). Validated against the place's resolved format and duplicates.
- **Request**: a child place requests `requestedCount` from its parent (`createRequest`, `lrType: "MANUAL"`).
- **Approve / Allocate**: the parent approves and **generates/allocates actual numbers** to the child at the child's format.
- **Transfer**: move available numbers between places.
- **Inventory**: per‑place stock (Available / Used / Void) + per‑child rollup; visible to a parent for itself and descendants.
- **Consumption**: at booking assignment (LR Mode = Manual), an `AVAILABLE` pool number at the active place is selected and flipped to `USED`, linked to the booking/delivery.

---

## 8. Pre‑generated / Customer LR

The **"reserved" tab** inside `manual-lr-operations-page.tsx` (panel **"Pre-generated LR / Customer LR"**). It reserves a slice of **general manual stock at a place** for a **specific customer**.

Form fields: **Customer**, **Place / Owning Place**, **Start LR**, **End LR**, **Count** (auto), **Create Customer LR**.

Governance & behavior:
- **Place / Owning Place** dropdown is governed: it lists the user's **active place + child places** only (Company Root → all). Shows a **hierarchy breadcrumb** (e.g. `Bluedart → South Region → Bangalore Branch`) and a helper note.
- **Start/End LR** lists the **selected place's own GENERAL manual LR** stock (sourced from in‑scope pools), not the active place's.
- On **Create Customer LR**: the selected range of general pools is reserved as `poolType = CUSTOMER_RESERVED` for the customer at the selected place (`ownerPlaceId/currentPlaceId/ownerLevelId = selected place`).
- A place is **required** and must be in scope (validated). A Tenant Admin at Company Root can pick any in‑scope place directly (no manual "active place" needed).
- **Booking assignment** with `manualLrPoolPreference = PRE_GENERATED` selects **customer‑reserved** pools matching the booking's customer + active place.

---

## 9. Auto LR — count/quota based

`auto-lr-operations-page.tsx`. Auto LR mirrors Manual governance but stays **count/quota‑based until assignment** — **no number list is created on approval**; the actual number is generated during vehicle assignment.

### 9.1 Quota model (derived — no separate storage)
For a place:
```
available(place) = Σ approvedCount of APPROVED requests owned by the place
                   − number of AUTO LR already generated for the place
```
- "owned by the place" = request `sourceOrgUnitId === place`.
- "generated for the place" = `TenantLrRecord` with `type === "AUTO"` and `orgUnitId === place`.
- Helper: `computeAutoLrPlaceInventory({ config, placeId, orgUnits, requests, generatedRecords })` → `{ approvedCount, generatedCount, availableCount, lastGenerated, nextNumber, formatPreview, approverOrgUnitId }` (`…/modules/tenant-admin/lib/auto-lr.ts`).

### 9.2 Request → Approval
- A child requests `requestedCount` Auto LR generation rights from its parent (`createRequest`, `lrType: "AUTO"`).
- Parent approves (`approveRequest` → `approvedCount = requestedCount`). This **increases available count** for the requesting place. **No LR numbers are created.**

### 9.3 Inventory display (Runtime tab)
Tabs: Governance / Sequence Rules / Allocation Rights / Requests / Generation Audit / **Runtime Preview & Auto LR Inventory**. The inventory table (scoped to active place + child places) shows per place:
`Place · Series/Format · Approved · Available · Generated · Next LR · Last Generated · Approved From · Status`.

### 9.4 Generation at vehicle assignment
When a booking is assigned with **LR Mode = Auto LR** (`assignTenantBooking`, `lrType: "AUTO"`):
1. Resolve the **place format** for the booking's active place (`resolveManualLrFormatForOrgUnit`).
2. **Hard quota check**: if `available(place) ≤ 0` → throw *"Auto LR is not available for the booking place: <Place>. Please allocate Auto LR quota before assignment."* (assignment is blocked).
3. Generate the next number using the **place format + per‑place sequence** (counts only that place's existing AUTO records).
4. Create the `TenantLrRecord` (`type: "AUTO"`, `orgUnitId = place`) and link it to the booking/delivery.
5. Available count effectively **decrements by 1** (one more generated record).

> Generation logic: `buildTenantLrAssignmentsForBooking` / `buildAutoLrNumberForPlace` in `modules/tms/src/modules/tms/booking/services/lr-generation.ts`. `orgUnits` is passed in by the store so the place format/sequence can be resolved.

---

## 10. Booking assignment integration

`AssignmentQueue.tsx` / `BookingDetails.tsx`. The internal user picks **LR Mode**: Manual / Pre‑generated / Auto, plus the **Active Place**.

- **Manual** → choose an LR number from the active place's `AVAILABLE` general pools.
- **Pre‑generated** → choose a customer‑reserved number (`manualLrPoolPreference = PRE_GENERATED`).
- **Auto** → no number selection. Shows **Auto LR Available: N**, **Next LR Preview**, and *"LR will be generated automatically after vehicle assignment."* The **Assign** button is disabled when available = 0.

### 10.1 Vendor‑indent assignment (Auto LR only)
External vendors must not access internal LR inventory. For the **vendor‑indent** flow:
- When the internal owner clicks **Send Indent to Vendors**, the indent stores `lrModeForVendorAssignment = AUTO`, `lrPlaceId`, `lrPlaceName` (the **booking owner's active place**). The assignment page badges show *"Indent sent · N notified · Auto LR @ <Place>"*.
- The vendor (Vendor Portal → Bookings → Indents → Accept → **Assign Vehicle & Driver**) selects **only vehicle + driver**. No LR mode / number / inventory is shown — only the note *"LR will be generated automatically by `<Tenant Name>` after vehicle assignment."*
- On submit, the bridge forces `lrType: "AUTO"` and `orgUnitId = lrPlaceId`, so Auto LR is generated from the **booking owner's place** (its format + sequence), quota is enforced at that place, and the booking becomes `VEHICLE_ASSIGNED`.

Cross‑module wiring (vendor portal ↔ shared store): `modules/vendor-web/src/integration/tenant-data-bridge.tsx` (port) and `modules/tenant-admin-new/src/modules/tenant-admin/integration/vendor-bridge-adapter.tsx` (adapter).

---

## 11. Status & lifecycle

- **Pool status**: `AVAILABLE → ALLOCATED → USED` (or `VOID`).
- **Generated LR status** follows the booking status (`mapBookingStatusToLrStatus`).
- **Allocation request**: `PENDING → APPROVED | REJECTED`.
- **Booking (LR‑relevant)**: `PENDING_ASSIGNMENT → VEHICLE_ASSIGNED → …`. LR (manual pool consumed, or Auto generated) is created at the `VEHICLE_ASSIGNED` transition via `assignTenantBooking`.

---

## 12. Validation rules (summary)

- **Format**: uploaded/created numbers must match the place's resolved `STRICT_FORMAT` regex; duplicates within tenant are rejected.
- **Place governance**: LR place selectors only offer the user's active place + child places; never parents/unrelated.
- **Customer LR**: a place is required and must be in scope; a customer must be selected.
- **Auto LR**: assignment is **blocked** when the booking place has no available quota.
- **Vendor indent**: assignment is **Auto‑LR‑only**; the vendor cannot choose LR mode/number or see internal inventory. No duplicate active indent per booking; first vendor to accept wins (others `CLOSED`).

---

## 13. File reference

| Concern | File |
|---|---|
| LR types (config, child modes, overrides) | `packages/shared-admin-core/src/types/master-data.ts` |
| Pool / generated / request types | `modules/tms/src/modules/tms/booking/types.ts` |
| Vendor indent type | `packages/shared-admin-core/src/types/booking-indent.ts` |
| Org unit / hierarchy types | `packages/shared-admin-core/src/types/access.ts` |
| Format resolution + builders | `packages/shared-admin-core/src/modules/tenant-admin/lib/manual-lr.ts` |
| Auto LR helpers (preview, inventory, config input) | `packages/shared-admin-core/src/modules/tenant-admin/lib/auto-lr.ts` |
| Place scope helpers | `…/shared/lib/manual-lr-scope.ts`, `…/shared/lib/manual-lr-governance.ts`, `…/modules/tenant-admin/lib/user-scope.ts` |
| Generation at assignment | `modules/tms/src/modules/tms/booking/services/lr-generation.ts` |
| Store (state, methods, quota guard, assignment) | `packages/shared-admin-core/src/shared/store/mock-store.tsx` |
| LR Operations (entry + mode tabs) | `…/pages/lr/lr-operations-page.tsx`, `…/pages/lr/lr-mode-tabs.tsx` |
| Manual LR operations + Pre‑generated/Customer LR tab | `…/pages/lr/manual-lr-operations-page.tsx` |
| Auto LR operations | `…/pages/lr/auto-lr-operations-page.tsx` |
| LR config (entry / manual / auto) | `…/pages/lr/lr-config-page.tsx`, `…/pages/lr/manual-lr-config-page.tsx`, `…/pages/lr/auto-lr-config-page.tsx` |
| Booking assignment (LR mode) | `…/tms/booking/AssignmentQueue.tsx`, `…/tms/booking/BookingDetails.tsx` |
| Vendor portal LR bridge | `modules/vendor-web/src/integration/tenant-data-bridge.tsx`, `…/tenant-admin/integration/vendor-bridge-adapter.tsx` |

> `…` = `modules/tenant-admin-new/src/modules/tenant-admin` unless otherwise shown.
