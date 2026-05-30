import { Landmark } from 'lucide-react'
import type { ModuleManifest } from '@shared-ui'
import { FinanceRouteWrapper } from './FinanceRouteWrapper'
import FinanceShell from './FinanceShell'

// Finance keeps its own internal navigation (mode switcher + grouped tabs), so
// the manifest exposes a SINGLE "Finance" entry and mounts the whole app behind
// a catch-all route. The host shell (root portal / tenant-admin) shows one
// sidebar item; everything below /finance is driven by FinanceShell's own state.
export const financeManifest: ModuleManifest = {
  key: 'finance',
  label: 'Finance',
  icon: Landmark,
  basePath: '/finance',
  sidebar: [
    { label: 'Finance', path: '/finance', icon: Landmark },
  ],
  wrapper: FinanceRouteWrapper,
  routes: [
    { index: true, element: <FinanceShell /> },
    { path: '*', element: <FinanceShell /> },
  ],
}
