import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tms-driver-app': path.resolve(__dirname, './src'),
      '@tms-booking': path.resolve(__dirname, '../tms/src'),
      '@shared-api': path.resolve(__dirname, '../../packages/shared-api/src'),
      '@shared-auth': path.resolve(__dirname, '../../packages/shared-auth/src'),
      '@shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
      '@shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
    },
  },
  server: {
    port: 3009,
    open: false,
  },
})
