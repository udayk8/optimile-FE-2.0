import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Vendor } from '@vendor/types'
import { useAppStore } from './app.store'

interface AuthStore {
  vendor: Vendor | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (vendor: Vendor, token: string) => void
  updateVendorStatus: (status: import('@vendor/types').VendorStatus) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      vendor: null,
      token: null,
      isAuthenticated: false,
      setAuth: (vendor, token) => set({ vendor, token, isAuthenticated: true }),
      updateVendorStatus: (status) => set((state) => ({
        vendor: state.vendor ? { ...state.vendor, status } : null
      })),
      logout: () => {
        useAppStore.getState().resetStore()
        set({ vendor: null, token: null, isAuthenticated: false })
      },
    }),
    { name: 'vendor-auth' }
  )
)
