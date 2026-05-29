import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@vendor':      path.resolve(__dirname, './src'),
      '@shared-auth': path.resolve(__dirname, '../../packages/shared-auth/src'),
      '@shared-ui':   path.resolve(__dirname, '../../packages/shared-ui/src'),
      '@shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@/vendor-onboarding': path.resolve(__dirname, '../../packages/shared-admin-core/src/vendor-onboarding'),
      '@/shared': path.resolve(__dirname, '../../packages/shared-admin-core/src/shared'),
    },
  },
  server: {
    port: 3001,
    open: false,
  },
})
