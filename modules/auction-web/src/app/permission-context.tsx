import { createContext, useContext, type ReactNode } from 'react'

export interface AuctionPermissions {
  canCreateAuction: boolean
  canCreateRfi: boolean
  canCreateRfq: boolean
}

// Default = fully permissive. Standalone auction dev/login has no tenant
// role context, so the bare pages must keep working as-is. The embedded
// shell (auction-embedded.tsx in tenant-admin) overrides with real flags
// derived from the active tenant role.
const DEFAULT_PERMISSIONS: AuctionPermissions = {
  canCreateAuction: true,
  canCreateRfi: true,
  canCreateRfq: true,
}

const AuctionPermissionContext = createContext<AuctionPermissions>(DEFAULT_PERMISSIONS)

export function AuctionPermissionProvider({
  value,
  children,
}: {
  value: AuctionPermissions
  children: ReactNode
}) {
  return (
    <AuctionPermissionContext.Provider value={value}>
      {children}
    </AuctionPermissionContext.Provider>
  )
}

export function useAuctionPermissions(): AuctionPermissions {
  return useContext(AuctionPermissionContext)
}
