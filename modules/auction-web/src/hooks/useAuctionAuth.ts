import { useMemo } from 'react'
import { useAuth } from '@shared-auth'
import type { InternalRole, UserProfile, UserStatus } from '@auction/types'

function mapSharedRoleToInternalRole(role: string): InternalRole {
  if (role === 'Auction Head') return 'OPS'
  if (role === 'Administration') return 'ADMIN'
  if (role === 'Finance Manager') return 'FINANCE'
  if (role === 'Procurement Head') return 'PROCUREMENT'
  return 'OPS'
}

function mapSharedStatusToAuctionStatus(status: string): UserStatus {
  return status === 'active' ? 'ACTIVE' : 'SUSPENDED'
}

export function useAuctionAuth() {
  const auth = useAuth()

  const auctionUser = useMemo<UserProfile | null>(() => {
    if (!auth.user) return null

    return {
      id: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
      mobile: '',
      tenantName: auth.tenant?.name ?? 'Optimile Demo',
      role: mapSharedRoleToInternalRole(auth.user.role),
      status: mapSharedStatusToAuctionStatus(auth.user.status),
    }
  }, [auth.tenant?.name, auth.user])

  return {
    ...auth,
    auctionUser,
  }
}
