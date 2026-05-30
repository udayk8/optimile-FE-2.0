import { createContext, useContext, type ReactNode } from 'react'
import type { FinanceMode } from '@finance/modules/finance/nav'

// Embedded hosts (tenant-admin) inject a forced finance mode derived from the
// tenant's business type. When set, FinanceShell hides its mode switcher and
// uses this mode unconditionally. Standalone finance leaves this null so the
// dropdown still works for solo development of the finance module.
const FinanceEmbeddedModeContext = createContext<FinanceMode | null>(null)

export function FinanceEmbeddedModeProvider({
  mode,
  children,
}: {
  mode: FinanceMode | null
  children: ReactNode
}) {
  return (
    <FinanceEmbeddedModeContext.Provider value={mode}>
      {children}
    </FinanceEmbeddedModeContext.Provider>
  )
}

export function useFinanceForcedMode(): FinanceMode | null {
  return useContext(FinanceEmbeddedModeContext)
}
