import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/shared/components/common': path.resolve(rootDir, 'modules/platform-admin/src/shared/components/common'),
      '@/shared/components/ui': path.resolve(rootDir, 'modules/platform-admin/src/shared/components/ui'),
      '@/shared/components/layout': path.resolve(rootDir, 'modules/platform-admin/src/shared/components/layout'),
      '@/shared/auth': path.resolve(rootDir, 'modules/platform-admin/src/shared/auth'),
      '@/shared/lib': path.resolve(rootDir, 'modules/platform-admin/src/shared/lib'),
      '@/shared/store': path.resolve(rootDir, 'modules/platform-admin/src/shared/store'),
      '@/shared/mocks': path.resolve(rootDir, 'modules/platform-admin/src/shared/mocks'),
      '@/constants': path.resolve(rootDir, 'modules/platform-admin/src/constants'),
      '@/types': path.resolve(rootDir, 'modules/platform-admin/src/types'),
      '@/modules/platform-admin': path.resolve(rootDir, 'modules/platform-admin/src/modules/platform-admin'),
      '@/modules/tenant-admin': path.resolve(rootDir, 'modules/platform-admin/src/modules/tenant-admin'),
      '@/modules/tms': path.resolve(rootDir, 'modules/tms/src/modules/tms'),
      '@auction': path.resolve(rootDir, 'modules/auction-web/src'),
      '@vendor': path.resolve(rootDir, 'modules/vendor-web/src'),
      '@fleet': path.resolve(rootDir, 'modules/fleet-web/src'),
      '@customer': path.resolve(rootDir, 'modules/customer-web/src'),
      '@console': path.resolve(rootDir, 'modules/console-web/src'),
      '@track-trace': path.resolve(rootDir, 'modules/track-trace-web/src'),
      '@platform-admin': path.resolve(rootDir, 'modules/platform-admin/src'),
      '@tenant-admin': path.resolve(rootDir, 'modules/tenant-admin/src'),
      '@tms-booking': path.resolve(rootDir, 'modules/tms/src'),
      '@constants': path.resolve(rootDir, 'modules/platform-admin/src/constants'),
      '@layouts': path.resolve(rootDir, 'modules/platform-admin/src/layouts'),
      '@tms-driver-app': path.resolve(rootDir, 'modules/tms-driver-app-web/src'),
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

