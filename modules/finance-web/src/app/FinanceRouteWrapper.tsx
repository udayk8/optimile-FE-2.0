import type { ReactNode } from 'react'

// Route-level wrapper slot for the finance module — mirrors the pattern used by
// auction/fleet (status banners, onboarding gates, etc.). Currently a
// pass-through; kept so the manifest has a stable extension point.
export function FinanceRouteWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>
}
