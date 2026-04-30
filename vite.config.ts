import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@admin': path.resolve(rootDir, 'modules/auction-web/src'),
      '@vendor': path.resolve(rootDir, 'modules/vendor-web/src'),
      '@fleet': path.resolve(rootDir, 'modules/fleet-web/src'),
      '@driver': path.resolve(rootDir, 'modules/driver-web/src'),
      '@customer': path.resolve(rootDir, 'modules/customer-web/src'),
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
