import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@driver': path.resolve(__dirname, './src'),
      '@shared-auth': path.resolve(__dirname, '../../packages/shared-auth/src'),
    },
  },
  server: {
    port: 3002,
    open: false,
  },
})
