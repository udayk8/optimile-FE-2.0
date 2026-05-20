import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/shared/components/common': path.resolve(__dirname, './src/components/common'),
      '@/shared/components/ui': path.resolve(__dirname, './src/components/ui'),
      '@/shared/auth': path.resolve(__dirname, './src/shared/auth'),
      '@/shared/lib': path.resolve(__dirname, './src/lib'),
      '@/shared/store': path.resolve(__dirname, './src/store'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/modules/platform-admin': path.resolve(__dirname, '../platform-admin'),
      '@platform-admin': path.resolve(__dirname, './src'),
      '@shared-api': path.resolve(__dirname, '../../packages/shared-api/src'),
      '@shared-auth': path.resolve(__dirname, '../../packages/shared-auth/src'),
      '@shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
      '@shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
    },
  },
  server: {
    port: 3006,
    open: false,
  },
})
