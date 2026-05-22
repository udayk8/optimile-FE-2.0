import type { ComponentType, ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'

export interface ShellSidebarTab {
  label: string
  /** Absolute path, e.g. "/vendor/sourcing". Used by sidebar NavLink. */
  path: string
  /** Optional leading icon rendered next to the tab label. */
  icon?: ComponentType<{ className?: string }>
  /** Reserved for RBAC. Filter tabs out of the sidebar when the current user lacks the listed permissions. */
  requiredPermissions?: string[]
}

export interface ModuleManifest {
  /** Stable identifier, e.g. "vendor". */
  key: string
  /** Display label on the collapsible row. */
  label: string
  /** Icon shown next to the collapsible row. */
  icon: ComponentType<{ className?: string }>
  /** Base path under which the module mounts, e.g. "/vendor". */
  basePath: string
  /** Path to navigate to when the user enters the module without a deep link. Defaults to first sidebar tab. */
  defaultPath?: string
  /** Tabs revealed when the section is expanded. */
  sidebar: ShellSidebarTab[]
  /** React Router children mounted under `<basePath>/*`. Paths are relative to basePath. */
  routes: RouteObject[]
  /** Optional component that wraps module routes (providers, banners, redirects). */
  Wrapper?: ComponentType<{ children: ReactNode }>
  /** Reserved for RBAC. Currently unused — the shell shows every module to every authenticated user. */
  requiredRoles?: string[]
}
