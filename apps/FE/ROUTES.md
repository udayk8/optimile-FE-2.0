# Route Map

## Platform
- `/platform/dashboard`
- `/platform/tenants`
- `/platform/tenants/:tenantId`
- `/platform/modules`
- `/platform/plans`
- `/platform/audit-logs`
- `/platform/settings`

## Tenant
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

## Layout Files
- `src/layouts/platform/platform-layout.tsx`
- `src/layouts/tenant/tenant-layout.tsx`
- `src/layouts/shared/workspace-shell.tsx`

## Router Source
- `src/app/router.tsx`
