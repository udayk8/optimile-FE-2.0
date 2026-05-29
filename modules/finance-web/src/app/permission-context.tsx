import { createContext, useContext, type ReactNode } from 'react'

export interface FinancePermissions {
  canRaiseDispute: boolean
  canApproveNote: boolean
  canCloseMonth: boolean
}

// Default = fully permissive. Standalone finance dev has no tenant role
// context, so the ported pages must keep working as-is. The embedded shell
// (finance-embedded.tsx in tenant-admin) overrides with real flags derived
// from the active tenant role.
const DEFAULT_PERMISSIONS: FinancePermissions = {
  canRaiseDispute: true,
  canApproveNote: true,
  canCloseMonth: true,
}

const FinancePermissionContext = createContext<FinancePermissions>(DEFAULT_PERMISSIONS)

export function FinancePermissionProvider({
  value,
  children,
}: {
  value: FinancePermissions
  children: ReactNode
}) {
  return (
    <FinancePermissionContext.Provider value={value}>
      {children}
    </FinancePermissionContext.Provider>
  )
}

export function useFinancePermissions(): FinancePermissions {
  return useContext(FinancePermissionContext)
}
