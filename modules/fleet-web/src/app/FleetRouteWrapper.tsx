import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExceptionAPI } from '../../services/mockDatabase'

export interface AppNotification {
  id: string
  title: string
  description: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
}

/** Bridges legacy Tab-name navigation calls inside Fleet pages
 *  (e.g. DashboardPage's onNavigate('exceptions')) to URL routes. */
export function useFleetTabNavigate() {
  const navigate = useNavigate()
  return (tab: string) => {
    navigate(tab === 'dashboard' ? '/fleet/dashboard' : `/fleet/${tab}`)
  }
}

export function FleetRouteWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Polling stays here so the route stays mounted while user is inside /fleet/*
    // Notifications consumed by topbar would require lifting state — kept as a no-op
    // here for parity (the original wrapper warmed the mockDatabase by calling it).
    let cancelled = false
    const load = async () => {
      try {
        await ExceptionAPI.getAll()
      } catch {
        // ignore
      }
    }
    if (!cancelled) void load()
    const id = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return <>{children}</>
}
