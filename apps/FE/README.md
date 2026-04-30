# Optimile TMS Admin Console

Frontend admin console for Optimile 2.0. The app is split into two workspaces:
- `Optimile Super Admin` for the `Platform Control Plane`
- `Tenant Admin` for hierarchy, the `Access Control System (Users + Roles + Permissions)`, modules, and tenant-owned business data

## Stack
- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- local mock data persisted through `localStorage`

## Main Flows
- platform dashboard and tenant governance
- platform module catalog management
- tenant creation with bootstrap admin setup
- tenant hierarchy and org-unit management
- tenant Access Control System management with module enablement rules
- tenant customer CRUD with addresses and rate cards
- tenant vendor CRUD with rate cards
- tenant master-data management for materials, vehicle types, and LR configuration
- platform and tenant audit visibility

## Routes

Platform:
- `/platform/dashboard`
- `/platform/tenants`
- `/platform/tenants/:tenantId`
- `/platform/modules`
- `/platform/plans`
- `/platform/audit-logs`
- `/platform/settings`

Tenant:
- `/tenant/:tenantId/dashboard`
- `/tenant/:tenantId/hierarchy`
- `/tenant/:tenantId/org-units`
- `/tenant/:tenantId/customers`
- `/tenant/:tenantId/customers/:tenantCustomerId`
- `/tenant/:tenantId/vendors`
- `/tenant/:tenantId/vendors/:tenantVendorId`
- `/tenant/:tenantId/users`
- `/tenant/:tenantId/roles`
- `/tenant/:tenantId/role-permissions`
- `/tenant/:tenantId/modules`
- `/tenant/:tenantId/audit-logs`
- `/tenant/:tenantId/settings`

## Run Locally

```bash
npm.cmd install
npm.cmd run dev
```

Build:

```bash
npm.cmd run build
```

Preview:

```bash
npm.cmd run preview
```

## Persistence Notes
- the app currently runs against a mock store
- state is persisted in `localStorage`
- seeded mock data is loaded only when storage is empty
- invalid stored JSON is reset to safe seeded defaults
- older role and tenant customer/vendor records self-heal where the current mock store can safely infer missing structure

## Key Files
- `src/app/router.tsx`
- `src/app/mock-store.tsx`
- `src/app/session-context.tsx`
- `src/services/mock/data.ts`
- `src/lib/storage/browser-storage.ts`
