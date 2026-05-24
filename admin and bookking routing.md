# Admin and Booking Routing Summary

## What was changed

- Kept the current host routing flow intact.
- Preserved the existing `/platform-admin` and `/tms/booking` entry points.
- Redirected tenant booking navigation from the tenant admin shell into the shared TMS booking routes after session context is set.
- Kept the old platform admin flow available as the legacy path while the merged admin structure remains active.

## Data brought across

- Tenant seed data is now sourced from the richer merged admin dataset instead of the older standalone tenant admin copy.
- Booking seed data is shared through the same merged mock data source so tenant booking records are available in the admin/booking flow.
- The standalone tenant admin module now reads the same dataset shape used by the merged admin side.

## Compatibility updates

- Added the minimal tenant type fields needed for the richer tenant records.
- Added booking status support for `COMPLETED` where the seed data uses it.
- Updated tenant-admin routing/session handoff so booking links continue to work without changing the surrounding navigation structure.
- Added the local path aliases needed for the standalone tenant-admin module to compile against its booking module copy.

## Verification

- TypeScript check passed for `modules/tenant-admin` with `npx tsc --noEmit -p modules/tenant-admin/tsconfig.json`.
- Full Vite build in this sandbox hit an `esbuild` spawn permission error, so the bundled build could not be completed here.

## Files touched

- `modules/tenant-admin/src/app/TenantAdminApp.tsx`
- `modules/tenant-admin/src/mocks/data.ts`
- `modules/tenant-admin/src/types/platform.ts`
- `modules/tenant-admin/src/modules/tms/booking/types.ts`
- `modules/tenant-admin/src/modules/tms/booking/services/booking-engine.ts`
- `modules/tenant-admin/src/store/mock-store.tsx`
- `modules/tenant-admin/tsconfig.json`
- `modules/tenant-admin/vite.config.ts`

