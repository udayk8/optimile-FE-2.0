import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Vendor, VendorSetupDraft, VendorStatus } from '@vendor/types'
import { useAppStore } from './app.store'

interface AuthStore {
  vendor: Vendor | null
  token: string | null
  isAuthenticated: boolean
  onboardingDraft: VendorSetupDraft | null
  hydrateVendor: (vendor: Vendor) => void
  setAuth: (vendor: Vendor, token: string) => void
  setOnboardingDraft: (draft: VendorSetupDraft) => void
  updateOnboardingDraft: (draft: Partial<VendorSetupDraft>) => void
  completeOnboarding: () => void
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
      onboardingDraft: null,
      hydrateVendor: (vendor) => set((state) => ({
        vendor: state.vendor ?? vendor,
      })),
      setAuth: (vendor, token) => {
        useAppStore.getState().resetStore()
        set({ vendor, token, isAuthenticated: true })
      },
      setOnboardingDraft: (draft) => set({ onboardingDraft: draft }),
      updateOnboardingDraft: (draft) => set((state) => ({
        onboardingDraft: state.onboardingDraft ? { ...state.onboardingDraft, ...draft } : { ...draft } as VendorSetupDraft,
      })),
      completeOnboarding: () => set((state) => ({
        vendor: state.vendor
          ? {
              ...state.vendor,
              tradingName: state.onboardingDraft?.companyName || state.vendor.tradingName,
              legalName: state.onboardingDraft?.legalName || state.vendor.legalName,
              gstin: state.onboardingDraft?.gstin || state.vendor.gstin,
              pan: state.onboardingDraft?.pan || state.vendor.pan,
              primaryContact: state.onboardingDraft?.primaryContact || state.vendor.primaryContact,
              serviceRegions: state.onboardingDraft?.serviceRegions || state.vendor.serviceRegions,
              supportedVehicleTypes: state.onboardingDraft?.supportedVehicleTypes || state.vendor.supportedVehicleTypes,
              status: 'ACTIVE',
              onboardingStep: 'COMPLETE',
              kycStatus: 'APPROVED',
              profileCompletion: 100,
              bankStatus: 'VERIFIED',
            }
          : null,
        onboardingDraft: state.onboardingDraft,
      })),
      updateVendorProfile: (patch) =>
        set((state) => ({
          vendor: state.vendor ? { ...state.vendor, ...patch } : null,
        })),
      updateVendorStatus: (status) => set((state) => ({
        vendor: state.vendor ? { ...state.vendor, status } : null
      })),
      logout: () => {
        useAppStore.getState().resetStore()
        set({ vendor: null, token: null, isAuthenticated: false, onboardingDraft: null })
      },
    }),
    { name: 'vendor-auth' }
  )
)
