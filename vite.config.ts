import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/shared/components/common': path.resolve(rootDir, 'modules/platform-admin-web/src/components/common'),
      '@/shared/components/ui': path.resolve(rootDir, 'modules/platform-admin-web/src/components/ui'),
      '@/shared/auth': path.resolve(rootDir, 'modules/platform-admin-web/src/shared/auth'),
      '@/shared/lib': path.resolve(rootDir, 'modules/platform-admin-web/src/lib'),
      '@/shared/store': path.resolve(rootDir, 'modules/platform-admin-web/src/store'),
      '@/types': path.resolve(rootDir, 'modules/platform-admin-web/src/types'),
      '@/modules/platform-admin': path.resolve(rootDir, 'modules/platform-admin'),
      '@auction': path.resolve(rootDir, 'modules/auction-web/src'),
      '@vendor': path.resolve(rootDir, 'modules/vendor-web/src'),
      '@fleet': path.resolve(rootDir, 'modules/fleet-web/src'),
      '@customer': path.resolve(rootDir, 'modules/customer-web/src'),
      '@console': path.resolve(rootDir, 'modules/console-web/src'),
      '@platform-admin': path.resolve(rootDir, 'modules/platform-admin-web/src'),
      '@tenant-admin': path.resolve(rootDir, 'modules/tenant-admin-web/src'),
      '@tms-booking': path.resolve(rootDir, 'modules/tms-booking-web/src'),
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
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io', '.ngrok.dev'],
  },
})
