import { Landmark } from 'lucide-react'
import type { ModuleManifest } from '@shared-ui'
import { FinanceRouteWrapper } from './FinanceRouteWrapper'
import FinanceModeRouter from './FinanceModeRouter'

// Finance exposes a single Finance entry at the manifest level. Per-page
// navigation is variant-aware (3PL / own-fleet / enterprise) and is built by
// the host shell directly from NAV[mode] — see tenant-layout.tsx — so the
// manifest sidebar stays minimal.
//
// Routes accept an optional :pageId. FinanceModeRouter decides what to render:
//   - standalone (no FinanceEmbeddedModeProvider in the tree): mounts the
//     legacy FinanceShell with its own internal sidebar + mode switcher.
//   - embedded (provider supplies a mode): renders the single page named by
//     :pageId with no inner chrome — the host shell owns navigation.
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
    { index: true, element: <FinanceModeRouter /> },
    { path: ':pageId', element: <FinanceModeRouter /> },
  ],
}
