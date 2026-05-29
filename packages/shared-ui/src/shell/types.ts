import type { ComponentType, ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'

export interface ModuleSidebarItem {
  label: string
  path: string
  icon?: ComponentType<{ className?: string }>
}

export interface ModuleManifest {
  key: string
  label: string
  icon: ComponentType<{ className?: string }>
  basePath: string
  sidebar: ModuleSidebarItem[]
  routes: RouteObject[]
  /** Optional wrapper around the module's routes — used by modules that need
   *  status banners, onboarding gates, or other route-level logic. */
  wrapper?: ComponentType<{ children: ReactNode }>
  /** Future RBAC hook — unused today. Will be filtered by user roles later. */
  requiredRoles?: string[]
}
