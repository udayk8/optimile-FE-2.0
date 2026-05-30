import { useParams } from 'react-router-dom'
import { useFinanceForcedMode } from './embedded-mode-context'
import FinanceShell from './FinanceShell'
import FinanceEmbeddedPage from './FinanceEmbeddedPage'

// Single entry mounted by the manifest. Standalone (no FinanceEmbeddedModeProvider
// in the tree) renders the full FinanceShell with its sidebar + mode switcher.
// Embedded (provider supplies a tenant-resolved mode) renders just the single
// page named by :pageId, so the host's outer shell drives navigation.
export default function FinanceModeRouter() {
  const forcedMode = useFinanceForcedMode()
  const { pageId } = useParams<{ pageId?: string }>()

  if (forcedMode) {
    return <FinanceEmbeddedPage mode={forcedMode} pageId={pageId ?? 'dash'} />
  }
  return <FinanceShell />
}
