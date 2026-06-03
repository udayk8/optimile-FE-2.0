# Platform-Admin-New Module — Complete Deep Code Review
**Module:** `/modules/platform-admin-new/`
**Scan Date:** 2026-06-03
**Stack:** React + TypeScript + Vite | Zod validation | Framer Motion | MockStore
**Purpose:** Super-admin control plane for tenant provisioning, module management, plan catalog, platform settings, and audit logging

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Route Hierarchy](#2-route-hierarchy)
3. [Screen Inventory](#3-screen-inventory)
4. [Feature Inventory](#4-feature-inventory)
5. [Tenant Provisioning Workflow](#5-tenant-provisioning-workflow)
6. [Tenant Admin Management Workflow](#6-tenant-admin-management-workflow)
7. [Module Management Workflow](#7-module-management-workflow)
8. [Form Analysis](#8-form-analysis)
9. [API Catalog](#9-api-catalog)
10. [State Management](#10-state-management)
11. [RBAC & Permission Analysis](#11-rbac--permission-analysis)
12. [Business Rules Catalog](#12-business-rules-catalog)
13. [Dependency Matrix](#13-dependency-matrix)
14. [Edge Cases](#14-edge-cases)
15. [Hidden Features & Technical Debt](#15-hidden-features--technical-debt)
16. [Missing Features Report](#16-missing-features-report)
17. [Complete Type & Enum Reference](#17-complete-type--enum-reference)

---

## 1. Architecture Overview

### Problem Domain
A Super-Admin control plane for the Optimile platform. Enables platform operators to provision tenants, configure module access, manage commercial plans, maintain platform-wide settings, and view the full audit trail. This is the highest authority layer above all tenant-level modules.

### Single User Persona
**Super Admin / Platform Operator** — hardcoded label, no role matrix. All users who access this module are assumed to be platform-level super admins.

### Provider Stack (nesting order)
```
AuthProvider (@shared-auth)
  └── ThemeProvider
        └── SessionProvider
              └── MockStoreProvider
                    └── PlatformLayout
                          └── Pages (via Outlet)
```

### Technology Stack
- **Framework:** React + TypeScript + Vite
- **Routing:** React Router DOM
- **Validation:** Zod schemas
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **UI Primitives:** Shared component library (`@/shared/components/ui`)
- **State:** `useMockStore()` — in-memory (no real backend)

### Upstream Dependencies
- Shared auth (`@shared-auth`) — login session
- Shared UI components (`@/shared/components`)
- MockStoreProvider — all data (tenants, modules, plans, settings, audit logs)

### Downstream Impacts
- Tenant provisioning → creates tenant record used by all other modules
- Module enablement → controls which modules tenants can access
- Platform settings → affects default module bundle for new tenants
- Audit log → records every super-admin action

---

## 2. Route Hierarchy

```
/ (root)
├── /tenant-login          → Redirect → /login?tenantId=X
│
└── PlatformLayout (wrapper)
    ├── /                  → Redirect → /dashboard
    ├── /dashboard         → PlatformDashboardPage
    ├── /tenants           → PlatformTenantsPage
    ├── /tenants/:tenantId → PlatformTenantDetailPage
    ├── /modules           → PlatformModulesPage
    ├── /plans             → PlatformPlansPage
    ├── /settings          → PlatformSettingsPage
    └── /audit-logs        → PlatformAuditLogsPage

Legacy Redirects:
├── /tenant/*              → /tenant-admin/tenant/*
├── /platform-admin/tenant/* → /tenant-admin/tenant/*
├── /platform-admin/tms/booking/* → /tms/booking/*
└── * (catch-all)          → /platform-admin/dashboard
```

### Layout Navigation Items
```
NAVIGATION
├── Dashboard    (/dashboard)   icon: LayoutDashboard
├── Tenants      (/tenants)     icon: Building2
└── Modules      (/modules)     icon: Package2

Header:
  Brand: "Optimile Admin"
  Subtitle: "Tenants & modules"
  Actor Label: "Super Admin" (hardcoded)
  Logout: navigates to /login
```

---

## 3. Screen Inventory

### Screen 1: PlatformDashboardPage — `/dashboard`

**Purpose:** Executive overview of tenant and module health.

#### Stat Cards (4 columns)
| Card | Metric | Icon | Color |
|---|---|---|---|
| Total Tenants | `tenants.length` | Building2 | slate |
| Active Tenants | `status === "active"` count | CheckCircle2 | emerald |
| Onboarding | `status === "trial"` count | Hourglass | amber |
| Active Modules | `status === "active"` module count | Package2 | indigo |

#### Recent Tenants Table (last 5, sorted by createdAt DESC)
Columns: Tenant | Status | Admin | Created

Status badge variants:
- `active` → success (emerald)
- `trial` → info (sky)
- `paused` / other → warning (amber)

#### Module Enablement Section
- Lists all modules with tenant count per module
- Status badge: active (success) / inactive (warning)
- Link to `/modules`

#### Navigation Buttons
- "Add Tenant" → `/tenants`
- "Manage Modules" → `/modules`

---

### Screen 2: PlatformTenantsPage — `/tenants`

**Purpose:** Tenant registry with full provisioning, editing, and module management.

#### Stat Cards (4)
| Card | Filter | Tone |
|---|---|---|
| Total | all | slate |
| Active | `status === "active"` | emerald |
| Onboarding | `status === "trial"` | amber |
| Inactive | `status === "paused"` | slate |

#### Filters
- **Search:** name, code, region (text match)
- **Status Filter:** All | Active | Trial | Paused

#### Tenants Table Columns
Tenant Name | Code | Business Type | Status | Modules | Admin User | Created | Actions

#### Row Actions (icon buttons)
| Icon | Action |
|---|---|
| Eye | View tenant detail → `/tenants/:id` |
| Pencil | Edit tenant (opens Edit Tenant Dialog) |
| Layers | Edit modules (opens Module Edit Dialog) |
| UserRoundCog | Open Tenant Admin → navigates to tenant admin URL |

#### Create Tenant Wizard (4 steps)
See full analysis in [Section 5](#5-tenant-provisioning-workflow) and [Section 8](#8-form-analysis).

---

### Screen 3: PlatformTenantDetailPage — `/tenants/:tenantId`

**Purpose:** Full tenant profile — details, admin management, module enablement.

#### Header
- Tenant name + status badge
- Code subtitle
- Action buttons: Edit Tenant | Open Tenant Admin | Back (← arrow)

#### Summary Stats (5 columns)
Business Type | Region | Industry | Enabled Modules count | Primary Admin name

#### Left Column: Tenant Details
| Field | Source |
|---|---|
| Tenant Name | `tenant.name` |
| Tenant Code | `tenant.code` |
| Business Type | Derived from `tenantType + customerPortalEnabled` |
| Region | `tenant.region` |
| Industry | `tenant.industry` |
| Status | Badge (active/trial/paused) |
| Created | Formatted date |

#### Right Column: Primary Admin
- Name, Email, Phone
- **Copy Credentials** button → copies `"Tenant Code: X\nEmail: Y\nPassword: Z"` to clipboard
- **Edit Admin** button (if admin exists)
- **Set Primary Admin** button (if no admin assigned)

#### Enabled Modules Section
- Grid layout (3 columns on xl)
- Module card per enabled module (ADMIN excluded from display)
- Shows: name, code, status badge
- **Power button** per card → disable individual module
- **Manage Modules** button → opens Module Edit Dialog

#### Quick Actions Section
- Edit Tenant | Manage Modules | Open Tenant Admin

---

### Screen 4: PlatformModulesPage — `/modules`

**Purpose:** Platform module catalog — create, edit, activate/deactivate modules.

#### Stat Cards (3)
| Card | Metric |
|---|---|
| Total Modules | `modules.length` |
| Active Modules | count `status === "active"` |
| Tenant Enablements | sum of all module `tenantCount` values |

#### Filters
- **Search:** displayName or displayCode
- **Category Filter:** All | Administration | Operations | Fleet | Procurement | Finance
- **Status Filter:** All | Active | Inactive

#### Modules Table Columns
Module Name | Code | Folder Path | Start Route | Category | Status | Enabled Tenants | Actions

#### Row Actions
| Icon | Action |
|---|---|
| Pencil | Edit module (opens Edit Module Dialog) |
| Power | Toggle active/inactive status |
| Users | View tenants using this module (opens dialog) |

#### Add / Edit Module Dialog
Fields: Code, Name, Category (dropdown), Status (dropdown), Description (textarea)
Zod validation on submit.

#### Category Badge Colors
| Category | Variant |
|---|---|
| Administration | success (emerald) |
| Operations | accent |
| Fleet | info (sky) |
| Procurement | neutral (slate) |
| Finance | warning (amber) |

#### Tenants Using Module Dialog
- List: Tenant Name | Code
- Empty state: "No tenants currently enable this module"

---

### Screen 5: PlatformPlansPage — `/plans`

**Purpose:** Commercial plan catalog — pricing, seats, features, tenant distribution.

#### Plan Catalog Table Columns
Plan (name + code) | Price (`$X/mo`) | Seats | Features (badges) | Tenants (count badge)

#### Tenant Badge Coloring
- `tenantCount > 0` → success (emerald)
- `tenantCount = 0` → neutral (slate)

#### Distribution Section
- List of all plans
- Left border: primary color if `tenantCount > 0`, else slate-300
- Shows: plan name, price/seats, tenant count badge

#### Commercial Guidance Section (3 bullets)
- Informational guidance on plan usage, distribution, features (sky-50/45 bg)

---

### Screen 6: PlatformSettingsPage — `/settings`

**Purpose:** Platform-wide operational defaults and controls.

#### Header State
- **Dirty:** "Unsaved changes" badge (warning / amber)
- **Clean:** "Saved" badge (success / emerald)
- **Save** button: disabled if not dirty

#### Section 1: Brand and Support
| Field | Type | Notes |
|---|---|---|
| Control plane name (`brandingName`) | text input | Platform branding |
| Support email (`supportEmail`) | text input | Shown to tenants |

#### Section 2: Provisioning Defaults
| Field | Type | Options |
|---|---|---|
| Default trial plan (`defaultTrialPlanId`) | select | Populated from `plans` |
| Provisioning guard (`tenantProvisioningGuard`) | select | "Standard" / "Review required" |

#### Section 3: Default Module Bundle
- Grid of active module toggle cards (3 columns on xl)
- Checked card: sky-50/60 bg + sky-300 border
- Unchecked card: default bg + hover styles
- Shows: module name, description, status badge

#### Section 4: Operational Controls
- **Maintenance mode** toggle with description
- Warning banner: "Hierarchy, org units, and Access Control System remain tenant-owned..."

#### Feedback Messages
- Success: emerald-50 bg + emerald-700 text
- Error: rose-50 bg + rose-700 text

---

### Screen 7: PlatformAuditLogsPage — `/audit-logs`

**Purpose:** Platform-level audit trail for governance and compliance.

#### Filters
- **Search:** actor, action, entity, tenant reference
- **Tenant Filter:** All | Global | tenantId
- **Result Filter:** All | Success | Warning | Denied

#### Operations Timeline (top 8 events, sorted DESC)
- Timeline component: dot + connecting line
- Each item: title, description, meta (actor · timestamp), action badge + result badge

#### Audit Table Columns
Timestamp | Actor | Action | Entity | Tenant | Result

#### Action Badge Variants
| Action | Variant |
|---|---|
| Create / Enable | success (emerald) |
| Update / Assign / Simulate | info (sky) |
| Delete / Disable | danger (rose) |
| Other | neutral (slate) |

#### Result Badge Variants
| Result | Variant |
|---|---|
| success | success (emerald) |
| warning | warning (amber) |
| denied | danger (rose) |

---

## 4. Feature Inventory

| # | Feature | Status | Screen |
|---|---|---|---|
| F-01 | Platform dashboard KPIs | Live | Dashboard |
| F-02 | Recent tenants table | Live | Dashboard |
| F-03 | Module enablement overview | Live | Dashboard |
| F-04 | Tenant registry with search + filter | Live | TenantsPage |
| F-05 | 4-step tenant creation wizard | Live | TenantsPage |
| F-06 | Edit tenant (name, code, type, status) | Live | TenantsPage + DetailPage |
| F-07 | Per-tenant module management | Live | TenantsPage + DetailPage |
| F-08 | Open Tenant Admin shortcut | Live | TenantsPage + DetailPage |
| F-09 | Tenant detail view | Live | TenantDetailPage |
| F-10 | Set primary admin | Live | TenantDetailPage |
| F-11 | Edit admin (name, email, phone, password) | Live | TenantDetailPage |
| F-12 | Copy tenant credentials to clipboard | Live | TenantDetailPage |
| F-13 | Per-module power button (disable) | Live | TenantDetailPage |
| F-14 | Module catalog with CRUD | Live | ModulesPage |
| F-15 | Module category + status filter | Live | ModulesPage |
| F-16 | Toggle module active/inactive | Live | ModulesPage |
| F-17 | View tenants using a module | Live | ModulesPage |
| F-18 | Plan catalog view | Live | PlansPage |
| F-19 | Plan distribution section | Live | PlansPage |
| F-20 | Platform settings (brand, plan, guard, modules, maintenance) | Live | SettingsPage |
| F-21 | Default module bundle config | Live | SettingsPage |
| F-22 | Maintenance mode toggle | Live | SettingsPage |
| F-23 | Audit log viewer with filters | Live | AuditLogsPage |
| F-24 | Operations timeline (audit) | Live | AuditLogsPage |
| F-25 | Unsaved changes tracking | Live | SettingsPage |
| F-26 | Plan CRUD | **MISSING** | No create/edit plan dialog |
| F-27 | Real backend API | **MISSING** | Entire module on MockStore |
| F-28 | Export audit logs | **MISSING** | Not found |
| F-29 | Tenant suspension / hard-delete | **MISSING** | Only status toggle exists |
| F-30 | Role-based access within platform admin | **MISSING** | All users assumed super admin |

---

## 5. Tenant Provisioning Workflow

### 4-Step Wizard Flow

```
Step 0: Basic Details
  └──► Step 1: Admin User
              └──► Step 2: Module Selection
                            └──► Step 3: Review & Submit
                                          └──► CREATE TENANT
```

### Step 0: Basic Details

| Field | Required | Validation |
|---|---|---|
| Tenant Name | Yes | min 2 chars |
| Tenant Code | Yes | min 2 chars, must be UNIQUE (case-insensitive) |
| Business Type | Yes | One of 3 types |
| Country/Region | Yes | min 2 chars |
| Default Timezone | Yes | From allowed list |

**Business Type Options:**
| Value | Label | Description |
|---|---|---|
| `DIRECT_ENTERPRISE` | Direct Enterprise | Operates its own booking and logistics workflows |
| `THREE_PL` | 3PL / Logistics Provider | Runs logistics for multiple customers |
| `FLEET_MANAGEMENT` | Fleet Management | Focuses on fleet, drivers, dispatch, compliance |

**Timezone Options:**
`Asia/Kolkata` | `Asia/Dubai` | `Asia/Singapore` | `Europe/London` | `Europe/Berlin` | `America/New_York` | `America/Chicago` | `America/Los_Angeles`

### Step 1: Tenant Admin User

| Field | Required | Validation |
|---|---|---|
| Admin Name | Yes | min 2 chars |
| Admin Email | Yes | valid email format |
| Phone Number | Yes | exactly 10 digits |
| Password | Yes | min 6 chars |
| Confirm Password | Yes | must match Password |

### Step 2: Module Selection

- Grid layout (2 columns)
- Module checkbox cards with required badge on ADMIN
- **ADMIN module is always forced (cannot be unchecked)**
- Error if: no modules selected OR ADMIN not included
- Module display order: `["ADMIN", "TMS", "FLEET", "AUCTION", "CUSTOMER", "VENDOR", "TRACKING", "DRIVER_APP"]`

### Step 3: Review

Summary displayed:
- Tenant: Name, Code, Business Type, Region, Timezone
- Admin: Name, Email, Phone
- Modules: badge list

### Create Payload (`CreateTenantInput`)

```typescript
{
  name: string,
  code: string.toUpperCase(),
  status: "active",
  planId: plans[0].id,                          // Always first plan
  defaultTimezone: string,
  tenantType: derived from businessType,
  customerPortalEnabled: true if FLEET_MANAGEMENT,
  primaryContactName: adminName,
  primaryContactEmail: adminEmail,
  primaryContactPhone: adminPhone,
  primaryContactPassword: adminPassword,
  starterRole: "tenant_admin",
  enabledModuleCodes: [...selected, "ADMIN"],   // ADMIN always forced
  defaultHierarchyTemplate: "region-zone",
  notes: `Country / Region: X | Default Timezone: Y | Phone: Z`
}
```

### Business Type → Internal Mapping

| Business Type | `tenantType` | `customerPortalEnabled` |
|---|---|---|
| `DIRECT_ENTERPRISE` | `DIRECT_CUSTOMER` | `false` |
| `THREE_PL` | `LOGISTICS_PROVIDER_3PL` | `false` |
| `FLEET_MANAGEMENT` | `DIRECT_CUSTOMER` | `true` |

---

## 6. Tenant Admin Management Workflow

### Set Primary Admin (if no admin exists)

**Dialog mode:** `"create"`

| Field | Required | Notes |
|---|---|---|
| Admin Name | Yes | min 2 chars |
| Admin Email | Yes | valid email |
| Phone | No | optional |
| Password | Yes | min 6 chars (label: "Temporary Password") |

**On submit:**
- Creates user record
- Auto-creates `Tenant Admin` role scoped to root hierarchy level if missing

### Edit Primary Admin (if admin exists)

**Dialog mode:** `"edit"`

| Field | Required | Notes |
|---|---|---|
| Admin Name | Yes | min 2 chars |
| Admin Email | Yes | valid email |
| Phone | No | optional |
| Password | No | label: "Reset Password (optional)" — kept if blank |

### Copy Credentials

Copies to clipboard:
```
Tenant Code: {code}
Email: {email}
Password: {password}
```

---

## 7. Module Management Workflow

### Module Create / Edit

**Zod Schema:**
```typescript
{
  code: string (min 2, trimmed, uppercase),
  name: string (min 2, trimmed),
  category: enum ["Administration", "Operations", "Fleet", "Procurement", "Finance"],
  description: string (min 4, trimmed),
  status: enum ["active", "inactive"]
}
```

### Module Toggle (Active ↔ Inactive)
- Power icon on row
- Immediately updates `module.status` in store
- Confirmation: none (instant)

### Default Module Bundle (Settings)
- Multi-select toggle cards
- Determines which modules are pre-enabled for new tenants
- Only active modules shown

### Module Order on Tenant Creation
```
["ADMIN", "TMS", "FLEET", "AUCTION", "CUSTOMER", "VENDOR", "TRACKING", "DRIVER_APP"]
```

### Required Module Constant
```typescript
REQUIRED_MODULE_CODE = "ADMIN"
BOOKING_MODULE_CODE  = "TMS"
```

---

## 8. Form Analysis

### Form 1: Create Tenant Wizard — Step 0 (Basic Details)

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | text | Yes | min 2 chars |
| `code` | text | Yes | min 2 chars, unique check |
| `businessType` | select | Yes | DIRECT_ENTERPRISE / THREE_PL / FLEET_MANAGEMENT |
| `region` | text | Yes | min 2 chars |
| `defaultTimezone` | select | Yes | From allowed timezone list |

### Form 2: Create Tenant Wizard — Step 1 (Admin User)

| Field | Type | Required | Validation |
|---|---|---|---|
| `adminName` | text | Yes | min 2 chars |
| `adminEmail` | email | Yes | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| `adminPhone` | text | Yes | exactly 10 digits |
| `adminPassword` | password | Yes | min 6 chars |
| `adminPasswordConfirm` | password | Yes | must match `adminPassword` |

### Form 3: Create Tenant Wizard — Step 2 (Modules)

| Element | Validation |
|---|---|
| Module checkboxes | At least 1 selected, ADMIN always included |

### Form 4: Edit Tenant Dialog

| Field | Type | Required | Options |
|---|---|---|---|
| `name` | text | Yes | min 2 chars |
| `code` | text | Yes | min 2 chars |
| `businessType` | select | Yes | 3 options |
| `status` | select | Yes | active / trial / paused |
| `region` | text | No | — |
| `industry` | text | No | — |

### Form 5: Add / Edit Module Dialog

| Field | Type | Required | Validation |
|---|---|---|---|
| `code` | text | Yes | min 2, uppercase |
| `name` | text | Yes | min 2 |
| `category` | select | Yes | Administration / Operations / Fleet / Procurement / Finance |
| `status` | select | Yes | active / inactive |
| `description` | textarea | Yes | min 4 chars |

### Form 6: Set / Edit Tenant Admin Dialog

| Field | Create Required | Edit Required | Validation |
|---|---|---|---|
| `adminName` | Yes | Yes | min 2 chars |
| `adminEmail` | Yes | Yes | valid email |
| `phone` | No | No | optional |
| `password` | Yes | No | min 6 if provided; required on create |

### Form 7: Platform Settings Form

| Field | Type | Options |
|---|---|---|
| `brandingName` | text | — |
| `supportEmail` | text | email format |
| `defaultTrialPlanId` | select | from plans list |
| `tenantProvisioningGuard` | select | standard / review_required |
| `defaultModuleCodes` | multi-toggle | active modules |
| `maintenanceMode` | toggle | boolean |

### Form 8: Module Edit (Per-Tenant)

| Element | Validation |
|---|---|
| Module checkboxes | At least 1 must remain enabled |

---

## 9. API Catalog

> **Critical Note:** All data operations go through `useMockStore()` — an in-memory JavaScript store. No real HTTP endpoints are wired anywhere in this module.

### Implied Production Endpoints

#### Tenant APIs
| Endpoint | Method | Purpose | Payload |
|---|---|---|---|
| `/api/platform/tenants` | GET | List all tenants | query filters |
| `/api/platform/tenants` | POST | Create tenant | `CreateTenantInput` |
| `/api/platform/tenants/:id` | GET | Single tenant | — |
| `/api/platform/tenants/:id` | PATCH | Update tenant | partial tenant fields |
| `/api/platform/tenants/:id/modules` | PATCH | Update enabled modules | `{ enabledModuleCodes: string[] }` |
| `/api/platform/tenants/:id/admin` | POST | Set primary admin | admin fields |
| `/api/platform/tenants/:id/admin` | PATCH | Edit primary admin | admin fields |

#### Module APIs
| Endpoint | Method | Purpose | Payload |
|---|---|---|---|
| `/api/platform/modules` | GET | List all modules | — |
| `/api/platform/modules` | POST | Create module | Zod-validated module input |
| `/api/platform/modules/:id` | PATCH | Update module | Zod-validated partial |
| `/api/platform/modules/:id/status` | PATCH | Toggle status | `{ status: "active" \| "inactive" }` |

#### Plan APIs
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/platform/plans` | GET | List all plans |

#### Settings APIs
| Endpoint | Method | Purpose | Payload |
|---|---|---|---|
| `/api/platform/settings` | GET | Get platform settings | — |
| `/api/platform/settings` | PATCH | Save settings | `PlatformSettings` |

#### Audit Log APIs
| Endpoint | Method | Purpose | Filters |
|---|---|---|---|
| `/api/platform/audit-logs` | GET | List audit events | tenant, result, search |
| `/api/platform/audit-logs` | POST | Create audit entry | `AuditEvent` |

### Hook → Store Function Mapping

| Hook | Function | Operation |
|---|---|---|
| `useTenants()` | `createTenant(input)` | Creates tenant + default admin role |
| `useTenants()` | `updateTenant(id, patch)` | Updates tenant fields |
| `useTenants()` | `getTenantById(id)` | Lookup by ID |
| `useTenants()` | `getTenantPrimaryAdminUser(tenantId)` | Gets primary admin |
| `usePlatformModules()` | `createModule(input)` | Adds new module |
| `usePlatformModules()` | `updateModule(id, patch)` | Updates module |
| `usePlatformSettings()` | `savePlatformSettings(settings)` | Saves settings |
| `usePlans()` | `data` | Read-only plan list |
| `usePlatformAuditLogs()` | `data` | Read-only audit log list |

---

## 10. State Management

### Architecture
Single `MockStoreProvider` context provides all platform data. No Redux or Zustand.

### Platform Data Collections in Store
```typescript
platformTenants: PlatformTenant[]
modules: PlatformModule[]
plans: Plan[]
platformSettings: PlatformSettings
platformAuditLogs: AuditEvent[]
```

### Key Data Types

**`PlatformTenant`:**
```typescript
{
  id: string
  name: string
  code: string
  status: "active" | "trial" | "paused"
  tenantType: "DIRECT_CUSTOMER" | "LOGISTICS_PROVIDER_3PL"
  customerPortalEnabled: boolean
  region: string
  industry?: string
  defaultTimezone: string
  planId: string
  enabledModuleCodes: string[]
  starterRole: string
  defaultHierarchyTemplate: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
  primaryContactPassword: string
  notes?: string
  createdAt: string
  updatedAt: string
}
```

**`PlatformModule`:**
```typescript
{
  id: string
  code: string
  name: string
  category: "Administration" | "Operations" | "Fleet" | "Procurement" | "Finance"
  description: string
  status: "active" | "inactive"
  folderPath?: string
  startRoute?: string
  tenantCount: number  // enriched at runtime
}
```

**`Plan`:**
```typescript
{
  id: string
  name: string
  code: string
  monthlyPriceUsd: number
  seatsIncluded: number
  features: string[]
  tenantCount: number  // enriched at runtime
}
```

**`PlatformSettings`:**
```typescript
{
  brandingName: string
  supportEmail: string
  defaultTrialPlanId: string
  tenantProvisioningGuard: "standard" | "review_required"
  defaultModuleCodes: string[]
  maintenanceMode: boolean
}
```

**`AuditEvent`:**
```typescript
{
  id: string
  actor: string
  action: string
  entityType: string
  entityName: string
  result: "success" | "warning" | "denied"
  timestamp: string
  tenantId?: string
}
```

### Page-Level State Patterns

**PlatformTenantsPage:**
```typescript
const [wizardOpen, setWizardOpen] = useState(false)
const [wizardStep, setWizardStep] = useState(0)         // 0-3
const [wizardForm, setWizardForm] = useState<WizardForm>(defaultForm)
const [wizardErrors, setWizardErrors] = useState<Record<string, string>>({})
const [editDialogOpen, setEditDialogOpen] = useState(false)
const [moduleDialogOpen, setModuleDialogOpen] = useState(false)
const [selectedTenant, setSelectedTenant] = useState<PlatformTenant | null>(null)
const [search, setSearch] = useState("")
const [statusFilter, setStatusFilter] = useState<string>("all")
```

**PlatformSettingsPage:**
```typescript
const [form, setForm] = useState<PlatformSettings>(data)
const [dirty, setDirty] = useState(false)
const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
```

---

## 11. RBAC & Permission Analysis

### Current Implementation
**No role-based permission system exists within the module.** All access is assumed to be Super Admin level. The layout hardcodes "Super Admin" as the actor label. Auth is handled at the app entry point via `AuthProvider`.

### Auth Flow
1. Login at `/login` (shared)
2. `AuthProvider` validates session
3. `SessionProvider` maintains session context
4. All pages render without permission checks
5. Logout → clears session → navigates to `/login`

### Implied Future RBAC Needs

| Feature | Who Should Access |
|---|---|
| Create Tenant | Super Admin only |
| Edit Tenant | Super Admin only |
| Disable Module | Super Admin only |
| Change Settings | Super Admin only |
| View Audit Logs | Super Admin + Auditor |
| View Plan Catalog | Super Admin + Billing Admin |
| Open Tenant Admin | Super Admin only |
| Copy Credentials | Super Admin only |

---

## 12. Business Rules Catalog

| # | Rule | Implementation |
|---|---|---|
| BR-01 | ADMIN module always required | `REQUIRED_MODULE_CODE = "ADMIN"` — forced in wizard + module edit |
| BR-02 | At least 1 module must remain enabled | Validation in Module Edit Dialog |
| BR-03 | Tenant code must be unique (case-insensitive) | Wizard Step 0 validation |
| BR-04 | Tenant code stored as uppercase | `code.toUpperCase()` on create payload |
| BR-05 | Password min 6 chars | Wizard Step 1 + Admin Dialog validation |
| BR-06 | Admin phone exactly 10 digits | Wizard Step 1 validation |
| BR-07 | Email validation | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` regex |
| BR-08 | New tenant always gets status = "active" | Hardcoded in `CreateTenantInput` |
| BR-09 | New tenant always uses first plan | `planId: plans[0].id` |
| BR-10 | New tenant default hierarchy | `"region-zone"` hardcoded |
| BR-11 | New tenant starter role | `"tenant_admin"` hardcoded |
| BR-12 | FLEET_MANAGEMENT → customerPortalEnabled = true | Business type mapping |
| BR-13 | TMS module auto-added if active | `BOOKING_MODULE_CODE = "TMS"` default selection |
| BR-14 | Module display order | `["ADMIN","TMS","FLEET","AUCTION","CUSTOMER","VENDOR","TRACKING","DRIVER_APP"]` |
| BR-15 | Auto-create Tenant Admin role | Triggered on Set Primary Admin if role missing |
| BR-16 | Dashboard shows last 5 tenants | Sorted by `createdAt DESC`, limited to 5 |
| BR-17 | Audit timeline shows top 8 | Sorted by `timestamp DESC`, limited to 8 |
| BR-18 | Dirty state tracking on settings | `dirty = true` on any field change; Save button disabled if not dirty |
| BR-19 | Provisioning guard options | `"standard"` or `"review_required"` |
| BR-20 | Module categories | Administration / Operations / Fleet / Procurement / Finance |
| BR-21 | Module code min 2 chars + uppercase | Zod schema enforced |
| BR-22 | Plan assignment always uses first plan | No plan selection in wizard — auto-assigned |
| BR-23 | Notes field auto-generated | `Country / Region: X | Default Timezone: Y | Phone: Z` |
| BR-24 | Copy credentials format | `"Tenant Code: X\nEmail: Y\nPassword: Z"` |

---

## 13. Dependency Matrix

| Feature | Component / Page | Hook | Store | Permission | Upstream | Downstream |
|---|---|---|---|---|---|---|
| View Tenants | PlatformTenantsPage | `useTenants()` | `platformTenants` | Super Admin | — | All tenant modules |
| Create Tenant | Wizard Dialog | `useTenants().createTenant()` | `platformTenants` | Super Admin | Plans, Modules | TMS, Fleet, Track modules |
| Edit Tenant | Edit Dialog | `useTenants().updateTenant()` | `platformTenants` | Super Admin | — | Tenant sessions |
| Manage Modules (per-tenant) | Module Edit Dialog | `useTenants().updateTenant()` | `platformTenants` | Super Admin | `usePlatformModules()` | Module access control |
| Set Admin | Admin Dialog | `useTenants()` | `platformTenants` | Super Admin | — | Tenant admin login |
| Copy Credentials | Clipboard action | — | `platformTenants` | Super Admin | — | Tenant onboarding |
| Module CRUD | PlatformModulesPage | `usePlatformModules()` | `modules` | Super Admin | — | Tenant module enablement |
| Platform Settings | PlatformSettingsPage | `usePlatformSettings()` | `platformSettings` | Super Admin | Plans, Modules | New tenant provisioning |
| Audit Logs | PlatformAuditLogsPage | `usePlatformAuditLogs()` | `platformAuditLogs` | Super Admin | All actions | Compliance |
| Dashboard KPIs | PlatformDashboardPage | `useTenants()`, `usePlatformModules()` | Both | Super Admin | — | — |
| Plan Catalog | PlatformPlansPage | `usePlans()` | `plans` | Super Admin | — | Tenant provisioning |

---

## 14. Edge Cases

| Scenario | Current Handling |
|---|---|
| Duplicate tenant code | Wizard Step 0 validates uniqueness before advancing |
| Password mismatch | Wizard Step 1 blocks advance if `password ≠ confirm` |
| ADMIN module deselected | Wizard Step 2 shows error and blocks advance |
| All modules deselected (per-tenant edit) | Module Edit Dialog: "At least one module must remain enabled" |
| Tenant with no admin | TenantDetailPage shows "Set Primary Admin" button instead of admin details |
| Admin edit with blank password | Preserved (not overwritten) in edit mode |
| No plans in system | `plans[0].id` will fail — no guard found |
| Zero tenants on dashboard | Stat cards show 0, table shows empty state |
| Zero modules for category filter | Empty state rendered |
| Module used by tenants toggled inactive | `tenantCount` badge still shows; no block on deactivation |
| Maintenance mode enabled | Warning banner shown; no functional lockout wired |
| Settings not saved (dirty) | Save button remains active; badge shows "Unsaved changes" |
| Tenant status "paused" | Listed in Inactive filter; no functional impact found |
| Open Tenant Admin with no admin | Navigation may fail (no guard on URL construction) |
| Timezone list is fixed | 8 options hardcoded — no dynamic list |
| Plan always auto-assigned | No plan selection in wizard — always uses `plans[0]` |

---

## 15. Hidden Features & Technical Debt

### Disabled / Stub Features

| Feature | Location | Status |
|---|---|---|
| Plan create/edit | PlansPage | No create or edit dialog — read-only catalog |
| Audit log export | AuditLogsPage | No export button |
| Tenant hard-delete | TenantsPage | No delete action — only status toggle |
| Provisioning guard enforcement | SettingsPage | Field exists; no enforcement logic found |
| Maintenance mode enforcement | SettingsPage | Toggle exists; no functional lockout wired |
| Review required guard flow | Settings | `"review_required"` option saved but no approval flow |
| Role-based access within platform admin | — | No permission checks; all assumed super admin |
| Sample tenant creation | `useTenants().createSampleTenant` | Function exists in hook; no UI trigger found |

### Technical Debt

| Item | Severity | Detail |
|---|---|---|
| **Entire module on MockStore** | Critical | No real backend API anywhere |
| **No permission system** | High | Super admin assumed for all — no guards in pages |
| **Plan always auto-assigned (first plan)** | High | No plan selection in wizard — brittle |
| **`createSampleTenant` unexposed** | Medium | Hook function exists with no UI |
| **Timezone list hardcoded** | Medium | 8 fixed timezones — not dynamic |
| **Module deactivation unguarded** | Medium | Can deactivate module even if tenants are using it |
| **Maintenance mode not enforced** | Medium | Toggle exists but no functional lockout |
| **Provisioning guard not enforced** | Medium | `"review_required"` saved but no approval workflow |
| **No pagination on tenants list** | Low | All tenants rendered — will not scale |
| **No pagination on audit logs table** | Low | All logs rendered after top 8 timeline |
| **Admin password stored in tenant notes** | Low | Password in `notes` field is a security concern |
| **Copy credentials includes password** | Low | Password copied to clipboard in plain text |

---

## 16. Missing Features Report

| # | Feature | Priority | Detail |
|---|---|---|---|
| MF-01 | Real backend API | Critical | Entire module on in-memory mock |
| MF-02 | Permission / RBAC system | High | No role-based guards in any page |
| MF-03 | Plan create / edit | High | Plan catalog is read-only; no CRUD |
| MF-04 | Tenant hard-delete | High | No delete action — only status=paused |
| MF-05 | Provisioning guard approval flow | High | `"review_required"` option saved; no review workflow |
| MF-06 | Maintenance mode enforcement | High | Toggle exists; no pages locked |
| MF-07 | Audit log export (CSV/PDF) | Medium | No export anywhere |
| MF-08 | Pagination for tenants list | Medium | All tenants rendered — scaling issue |
| MF-09 | Pagination for audit logs | Medium | All logs rendered |
| MF-10 | Tenant usage metrics (trips, bookings) | Medium | No activity metrics on tenant detail |
| MF-11 | Dynamic timezone list | Medium | 8 hardcoded timezones |
| MF-12 | Module deactivation guard | Medium | No block when tenants actively using module |
| MF-13 | Sample tenant creation UI | Low | `createSampleTenant` hook exists; no UI |
| MF-14 | Tenant billing / invoice view | Low | Plans assigned but no billing management |
| MF-15 | Tenant SSO / OAuth config | Low | Not found |
| MF-16 | Module version management | Low | No versioning on modules |
| MF-17 | Tenant data isolation audit | Low | No tenant data isolation checks |
| MF-18 | Platform health / uptime dashboard | Low | No infrastructure health view |
| MF-19 | Multi-plan assignment per tenant | Low | One plan per tenant hardcoded |
| MF-20 | Tenant onboarding checklist | Low | No guided onboarding status tracking |

---

## 17. Complete Type & Enum Reference

### Tenant Enums

| Enum | Values |
|---|---|
| `TenantStatus` | active, trial, paused |
| `TenantType` | DIRECT_CUSTOMER, LOGISTICS_PROVIDER_3PL |
| `BusinessType` (UI) | DIRECT_ENTERPRISE, THREE_PL, FLEET_MANAGEMENT |
| `ProvisioningGuard` | standard, review_required |

### Module Enums

| Enum | Values |
|---|---|
| `ModuleCategory` | Administration, Operations, Fleet, Procurement, Finance |
| `ModuleStatus` | active, inactive |
| `ModuleCode` (known) | ADMIN, TMS, FLEET, AUCTION, CUSTOMER, VENDOR, TRACKING, DRIVER_APP |

### Audit Log Enums

| Enum | Values |
|---|---|
| `AuditResult` | success, warning, denied |
| `AuditActionVariant` | Create/Enable→success, Update/Assign/Simulate→info, Delete/Disable→danger |

### Plan Fields
`id` | `name` | `code` | `monthlyPriceUsd` | `seatsIncluded` | `features: string[]` | `tenantCount`

### Timezone Options (hardcoded)
`Asia/Kolkata` | `Asia/Dubai` | `Asia/Singapore` | `Europe/London` | `Europe/Berlin` | `America/New_York` | `America/Chicago` | `America/Los_Angeles`

### Module Display Order (hardcoded)
`["ADMIN", "TMS", "FLEET", "AUCTION", "CUSTOMER", "VENDOR", "TRACKING", "DRIVER_APP"]`

### Required Constants
```typescript
REQUIRED_MODULE_CODE = "ADMIN"
BOOKING_MODULE_CODE  = "TMS"
```

### UI Component Library (from `@/shared/components/ui`)
`Badge` | `Button` | `Card` | `CardContent` | `CardDescription` | `CardHeader` | `CardTitle` | `Dialog` | `Input` | `Select` | `Switch` | `Textarea`

### Platform Primitive Components (`platform-primitives.tsx`)

| Component | Purpose | Key Props |
|---|---|---|
| `PlatformPanel` | Titled card section | `title`, `description?`, `action?`, `children` |
| `PlatformFilterBar` | Search + filter row | `searchValue`, `onSearchChange`, `filters?`, `trailing?` |
| `PlatformEmptyState` | Dashed-border empty state | `title`, `description`, `action?` |
| `PlatformInfoList` | Label-value grid | `items: {label, value, helper?}[]` |
| `PlatformQuickLink` | Arrow-link card | `title`, `description`, `action?` |
| `PlatformTimeline` | Vertical event timeline | `items: {id, title, description, meta, badge?}[]` |

### Lucide Icons Used
`Building2` | `LayoutDashboard` | `LogOut` | `Package2` | `ArrowLeft` | `ArrowRight` | `Eye` | `Layers` | `Pencil` | `Plus` | `Search` | `UserRoundCog` | `CheckCircle2` | `Hourglass` | `ClipboardCopy` | `ExternalLink` | `Power` | `Phone` | `UserPlus` | `Users`

---

*End of Platform-Admin-New Module Deep Code Review — Reverse-engineered from full source scan of `/modules/platform-admin-new/`*
