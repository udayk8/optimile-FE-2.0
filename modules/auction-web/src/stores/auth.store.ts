import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '@auction/types'
import { useAppStore } from './app.store'

interface AuthStore {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: UserProfile, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        useAppStore.getState().resetStore()
        set({ user, token, isAuthenticated: true })
      },
      logout: () => {
        useAppStore.getState().resetStore()
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    { name: 'auction-web-auth' }
  )
)
