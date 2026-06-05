import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Vendor, VendorStatus } from '@vendor/types'
import { useAppStore } from './app.store'

interface AuthStore {
  vendor: Vendor | null
  token: string | null
  isAuthenticated: boolean
  hydrateVendor: (vendor: Vendor) => void
  setAuth: (vendor: Vendor, token: string) => void
  updateVendorProfile: (patch: Partial<Vendor>) => void
  updateVendorStatus: (status: VendorStatus) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      vendor: null,
      token: null,
      isAuthenticated: false,
      hydrateVendor: (vendor) => set((state) => ({
        vendor: state.vendor ?? vendor,
      })),
      setAuth: (vendor, token) => {
        useAppStore.getState().resetStore()
        set({ vendor, token, isAuthenticated: true })
      },
      updateVendorProfile: (patch) =>
        set((state) => ({
          vendor: state.vendor ? { ...state.vendor, ...patch } : null,
        })),
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
