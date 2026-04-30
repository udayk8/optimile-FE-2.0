# Data Model

## Core Platform Entities

### TenantPlan
- `id`
- `code`
- `name`
- `monthlyPriceUsd`
- `seatsIncluded`
- `features`

### PlatformModule
- `id`
- `code`
- `name`
- `category`
- `description`
- `status`

### PlatformTenant
- `id`
- `name`
- `code`
- `region`
- `industry`
- `status`
- `planId`
- `enabledModuleCodes`
- `initialHierarchyTemplate`
- `primaryAdminUserId`
- `createdAt`
- `health`

### PlatformSettings
- `brandingName`
- `supportEmail`
- `defaultTrialPlanId`
- `defaultModuleCodes`
- `maintenanceMode`
- `tenantProvisioningGuard`

### PlatformAuditEvent
- `id`
- `actor`
- `action`
- `entityType`
- `entityName`
- `tenantId`
- `timestamp`
- `result`

## Core Tenant Control Entities

### HierarchyLevel
- `id`
- `tenantId`
- `order`
- `name`
- `active`

### OrgUnit
- `id`
- `tenantId`
- `name`
- `hierarchyLevelId`
- `parentOrgUnitId`
- `status`

### TenantRole
- `id`
- `tenantId`
- `name`
- `description`
- `hierarchyLevelId`
- `moduleCodes`
- `active`

### TenantRolePermission
- `id`
- `tenantId`
- `roleId`
- `moduleCode`
- `featureCode`
- `canView`
- `canCreate`
- `canEdit`
- `canDelete`
- `canApprove`

### TenantUser
- `id`
- `tenantId`
- `name`
- `email`
- `roleId`
- `orgUnitIds`
- `status`
- `lastActive`

### Capability
- `id`
- `moduleCode`
- `code`
- `name`
- `description`
- `actions`
- `status`

### TenantAuditLog
- `id`
- `actor`
- `tenantId`
- `action`
- `entityType`
- `entityName`
- `timestamp`
- `result`
- `summary`

## Customer Entities

### TenantCustomer
- `id`
- `tenantId`
- `name`
- `legalName`
- `code`
- `gstNumber`
- `status`
- `createdAt`
- `updatedAt`

### TenantCustomerAddress
- `id`
- `tenantId`
- `tenantCustomerId`
- `addressType`
- `addressName`
- `contactPerson`
- `contactNumber`
- `addressLine1`
- `addressLine2`
- `landmark`
- `city`
- `state`
- `country`
- `pincode`
- `isDefault`
- `status`
- `createdAt`
- `updatedAt`

### TenantCustomerRateCard
- `id`
- `tenantId`
- `tenantCustomerId`
- `sourcePincode`
- `destinationPincode`
- `rateType`
- `vehicleType`
- `rate`
- `status`
- `createdAt`
- `updatedAt`

## Vendor Entities

### TenantVendor
- `id`
- `tenantId`
- `name`
- `legalName`
- `code`
- `gstNumber`
- `vendorType`
- `contactPerson`
- `contactNumber`
- `email`
- `status`
- `createdAt`
- `updatedAt`

### TenantVendorRateCard
- `id`
- `tenantId`
- `tenantVendorId`
- `sourcePincode`
- `destinationPincode`
- `rateType`
- `vehicleType`
- `rate`
- `status`
- `createdAt`
- `updatedAt`

## Access Model
- role = feature access
- role also defines the hierarchy level where assignment is allowed
- role is mapped to one or more enabled tenant modules
- org assignments = data scope
- one user = one role
- one user = multiple org units from the role's mapped level only
- customers and vendors are created directly inside a tenant rather than sourced from a platform catalog
- addresses and rate cards remain tenant-scoped under the owning customer or vendor record

## Persistence Layer
- storage helper:
  `src/lib/storage/browser-storage.ts`
- centralized mock state:
  `src/app/mock-store.tsx`

Behavior:
- reads from `localStorage`
- seeds only when storage is empty
- self-heals invalid stored JSON by falling back to seeded defaults
- writes on every create, edit, delete, toggle, or save action

Platform writes include:
- tenant metadata updates
- tenant status, plan, and module governance updates
- platform module catalog creates and updates
- platform settings saves
- appended platform audit events for platform-side governance actions

Tenant writes include:
- hierarchy saves
- org-unit CRUD
- role CRUD with module mapping
- module-wise permission updates
- user CRUD with valid-role enforcement
- customer CRUD and status updates
- customer address CRUD
- customer rate card CRUD and CSV imports
- vendor CRUD and status updates
- vendor rate card CRUD and CSV imports

## Hook Surface
- `src/hooks/useTenants.ts`
- `src/hooks/usePlans.ts`
- `src/hooks/usePlatformModules.ts`
- `src/hooks/usePlatformSettings.ts`
- `src/hooks/usePlatformAuditLogs.ts`
- `src/hooks/useGlobalCustomers.ts`
- `src/hooks/useGlobalVendors.ts`
- `src/hooks/useTenantHierarchy.ts`
- `src/hooks/useTenantOrgTypes.ts`
- `src/hooks/useTenantOrgUnits.ts`
- `src/hooks/useTenantRoles.ts`
- `src/hooks/useTenantRolePermissions.ts`
- `src/hooks/useTenantUsers.ts`
- `src/hooks/useTenantCustomers.ts`
- `src/hooks/useTenantVendors.ts`
- `src/hooks/useTenantCapabilities.ts`
- `src/hooks/useTenantAuditLogs.ts`

## Important Rules Enforced
- tenant creation creates the bootstrap tenant admin user
- platform tenant code uniqueness is enforced on create and update
- hierarchy template only prefills initial levels
- hierarchy save blocks changes that would break existing org-unit chains
- org unit parent options are filtered to the immediately previous level
- org units cannot be deleted while they still have children or assigned users
- roles are bound to one hierarchy level
- roles can only be mapped to modules enabled for the tenant
- permissions can only be configured for modules enabled for the tenant and mapped to the selected role
- user org-unit choices are filtered by the selected role's mapped hierarchy level
- role level changes are blocked if existing assigned users would become invalid
- customer and vendor codes are unique within a tenant when provided
- users cannot be created or updated against invalid or restricted roles
- `PER_TRIP` rate cards require `vehicleType`
- customer and vendor CSV imports validate row shape before acceptance
