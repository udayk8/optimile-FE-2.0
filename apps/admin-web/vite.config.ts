import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@admin': path.resolve(__dirname, './src'),
      '@shared-auth': path.resolve(__dirname, '../../packages/shared-auth/src'),
      '@shared-api': path.resolve(__dirname, '../../packages/shared-api/src'),
      '@shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
      '@shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
})
