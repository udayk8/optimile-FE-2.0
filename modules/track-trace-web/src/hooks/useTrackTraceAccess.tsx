import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'
import {
  TRACK_TRACE_PLAN_FEATURE_ACCESS,
  TRACK_TRACE_ROLE_OPTIONS,
  TRACK_TRACE_ROLE_PAGE_ACCESS,
  TRACK_TRACE_ROLE_PERMISSION_ACCESS,
  TRACK_TRACE_ROLE_PLAN_ACCESS,
} from '../constants/access'
import type { TrackTraceFeatureKey, TrackTracePageKey, TrackTracePermission, TrackTracePlan, TrackTraceRole } from '../types/access'

interface TrackTraceAccessContextValue {
  role: TrackTraceRole
  plan: TrackTracePlan
  setRole: (role: TrackTraceRole) => void
  canAccessPage: (page: TrackTracePageKey) => boolean
  hasPermission: (permission: TrackTracePermission) => boolean
  canUseFeature: (feature: TrackTraceFeatureKey) => boolean
  roleOptions: typeof TRACK_TRACE_ROLE_OPTIONS
}

const TrackTraceAccessContext = createContext<TrackTraceAccessContextValue>({
  role: 'control-tower',
  plan: 'Enterprise',
  setRole: () => undefined,
  canAccessPage: () => true,
  hasPermission: () => true,
  canUseFeature: () => true,
  roleOptions: TRACK_TRACE_ROLE_OPTIONS,
})

export function TrackTraceAccessProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<TrackTraceRole>('control-tower')

  const value = useMemo<TrackTraceAccessContextValue>(
    () => ({
      role,
      plan: TRACK_TRACE_ROLE_PLAN_ACCESS[role],
      setRole,
      canAccessPage: (page) => TRACK_TRACE_ROLE_PAGE_ACCESS[role].includes(page),
      hasPermission: (permission) => TRACK_TRACE_ROLE_PERMISSION_ACCESS[role].includes(permission),
      canUseFeature: (feature) => TRACK_TRACE_PLAN_FEATURE_ACCESS[TRACK_TRACE_ROLE_PLAN_ACCESS[role]].includes(feature),
      roleOptions: TRACK_TRACE_ROLE_OPTIONS,
    }),
    [role],
  )

  return <TrackTraceAccessContext.Provider value={value}>{children}</TrackTraceAccessContext.Provider>
}

export function useTrackTraceAccess() {
  return useContext(TrackTraceAccessContext)
}
