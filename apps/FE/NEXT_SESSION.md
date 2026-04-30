# Next Session

## Stable Starting Point
- strict platform-vs-tenant split is in place
- tenant creation persists across refresh
- bootstrap tenant user is created during tenant setup
- platform dashboard, tenant directory, tenant detail, customers, vendors, modules, plans, audit logs, and settings are connected through the same control-plane UX
- platform settings and tenant governance changes persist in `localStorage`
- platform modules are now fully CRUD-managed in mock mode and tenant module governance appends platform audit events
- platform-side governance updates append platform audit events
- tenant customers, customer addresses, customer rate cards, tenant vendors, and vendor rate cards persist in `localStorage`
- platform and tenant admin share the same lighter Optimile-family shell, spacing rhythm, panel language, table density, and form treatment
- tenant dashboard and key tenant admin surfaces use the same polished panel/filter/summary interaction model
- localStorage reads self-heal invalid JSON values by falling back to seeded defaults
- hierarchy is a simple ordered-levels flow
- org units use guided business forms with valid parent filtering
- users are single-role with multi-org assignment at the role's mapped hierarchy level
- roles combine enabled-module mapping with a mapped hierarchy level
- role permissions are grouped module-wise and feature-wise, including approve where relevant
- invalid roles remain stored if tenant modules are later disabled, but access becomes restricted until remapped or re-enabled
- customer and vendor rate cards support CSV import templates in tenant detail pages

## Best Next Work
1. Split the current mock-store implementation into smaller repository/service modules before live API integration.
2. Replace placeholder tenant pages still living in `src/features/tenant/shared/tenant-placeholder-pages.tsx` with feature-owned modules.
3. Split tenant placeholder pages into feature-owned modules for users, roles, role permissions, and capabilities.
4. Add route-level tests for module governance, role mapping, role permissions, and invalid-role user assignment flows.
5. Introduce query adapters or TanStack Query when backend APIs are ready.

## Important Files
- `src/app/mock-store.tsx`
- `src/app/router.tsx`
- `src/app/session-context.tsx`
- `src/lib/storage/browser-storage.ts`
- `src/features/platform/modules/platform-modules-page.tsx`
- `src/features/platform/tenants/platform-tenant-detail-page.tsx`
- `src/features/platform/tenants/platform-tenants-page.tsx`
- `src/features/tenant/customers/tenant-customers-pages.tsx`
- `src/features/tenant/vendors/tenant-vendors-pages.tsx`
- `src/features/tenant/shared/tenant-placeholder-pages.tsx`
- `src/services/mock/data.ts`

## Verification
- `npm.cmd run build`
- use `npm.cmd run dev` for local development
