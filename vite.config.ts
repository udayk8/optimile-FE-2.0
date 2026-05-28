import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // --- Admin split: shared-admin-core (shared store/types/RBAC/UI/helpers) ---
      // Module sub-paths: hooks/lib/components(tenant)/services -> shared-admin-core; pages -> the owning module.
      // ORDER MATTERS: most-specific entries must come before the general fallbacks (first match wins).
      '@/modules/platform-admin/hooks': path.resolve(rootDir, 'packages/shared-admin-core/src/modules/platform-admin/hooks'),
      '@/modules/platform-admin/lib': path.resolve(rootDir, 'packages/shared-admin-core/src/modules/platform-admin/lib'),
      '@/modules/platform-admin/components': path.resolve(rootDir, 'modules/platform-admin-new/src/modules/platform-admin/components'),
      '@/modules/platform-admin/pages': path.resolve(rootDir, 'modules/platform-admin-new/src/modules/platform-admin/pages'),
      '@/modules/platform-admin': path.resolve(rootDir, 'modules/platform-admin-new/src/modules/platform-admin'),
      // tenant-admin/lib = RBAC (the only piece platform consumes) -> shared-admin-core; everything else tenant owns.
      '@/modules/tenant-admin/lib': path.resolve(rootDir, 'packages/shared-admin-core/src/modules/tenant-admin/lib'),
      '@/modules/tenant-admin': path.resolve(rootDir, 'modules/tenant-admin-new/src/modules/tenant-admin'),
      '@/modules/tms': path.resolve(rootDir, 'modules/tms/src/modules/tms'),
      '@/shared': path.resolve(rootDir, 'packages/shared-admin-core/src/shared'),
      '@/types': path.resolve(rootDir, 'packages/shared-admin-core/src/types'),
      '@/vendor-onboarding': path.resolve(rootDir, 'packages/shared-admin-core/src/vendor-onboarding'),
      '@/constants': path.resolve(rootDir, 'packages/shared-admin-core/src/constants'),
      '@shared-admin-core': path.resolve(rootDir, 'packages/shared-admin-core/src'),
      '@auction': path.resolve(rootDir, 'modules/auction-web/src'),
      '@vendor': path.resolve(rootDir, 'modules/vendor-web/src'),
      '@fleet': path.resolve(rootDir, 'modules/fleet-web/src'),
      '@customer': path.resolve(rootDir, 'modules/customer-web/src'),
      '@console': path.resolve(rootDir, 'modules/console-web/src'),
      '@track-trace': path.resolve(rootDir, 'modules/track-trace-web/src'),
      // @platform-admin/hooks (shared path helpers) -> shared-admin-core; general @platform-admin (incl /app) -> platform-admin-new
      '@platform-admin/hooks': path.resolve(rootDir, 'packages/shared-admin-core/src/hooks'),
      '@platform-admin': path.resolve(rootDir, 'modules/platform-admin-new/src'),
      '@tenant-admin': path.resolve(rootDir, 'modules/tenant-admin-new/src'),
      '@tms-booking': path.resolve(rootDir, 'modules/tms/src'),
      '@layouts': path.resolve(rootDir, 'packages/shared-admin-core/src/layouts'),
      '@constants': path.resolve(rootDir, 'packages/shared-admin-core/src/constants'),
      '@': path.resolve(rootDir, 'modules/tms-driver-app-web/src'),
      '@shared-api': path.resolve(rootDir, 'packages/shared-api/src'),
      '@shared-auth': path.resolve(rootDir, 'packages/shared-auth/src'),
      '@shared-ui': path.resolve(rootDir, 'packages/shared-ui/src'),
      '@shared-utils': path.resolve(rootDir, 'packages/shared-utils/src'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
})

