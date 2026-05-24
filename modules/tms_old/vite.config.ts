import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/shared/components/common': path.resolve(__dirname, './src/shared/components/common'),
      '@/shared/components/ui': path.resolve(__dirname, './src/shared/components/ui'),
      '@/shared/components/layout': path.resolve(__dirname, './src/shared/components/layout'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@/shared/auth': path.resolve(__dirname, './src/shared/auth'),
      '@/shared/lib': path.resolve(__dirname, './src/shared/lib'),
      '@/shared/store': path.resolve(__dirname, './src/shared/store'),
      '@/shared/mocks': path.resolve(__dirname, './src/shared/mocks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/modules/platform-admin': path.resolve(__dirname, './src/modules/platform-admin'),
      '@/modules/tms': path.resolve(__dirname, './src/modules/tms'),
      '@/modules/tenant-admin': path.resolve(__dirname, './src/modules/tenant-admin'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@tms-booking': path.resolve(__dirname, './src'),
      '@shared-api': path.resolve(__dirname, '../../packages/shared-api/src'),
      '@shared-auth': path.resolve(__dirname, '../../packages/shared-auth/src'),
      '@shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
      '@shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
    },
  },
  server: {
    port: 3008,
    open: false,
  },
})

