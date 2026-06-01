import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Toast } from '@finance/components/primitives'
import { PAGES, modeIds, type FinanceMode } from '@finance/modules/finance/nav'
import { DisputesProvider } from '@finance/lib/disputesStore'

// Embedded page renderer — used when a host (tenant-admin) mounts finance
// inside its own shell. Renders ONE finance page with no internal sidebar /
// header / mode-switcher; the host's outer sidebar surfaces the per-page nav
// via NAV[mode]. The toast is local so the surrounding host's toaster (sonner)
// stays out of the way of the finance-specific Toast component.
export default function FinanceEmbeddedPage({
  mode,
  pageId,
}: {
  mode: FinanceMode
  pageId: string
}) {
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toast = (m: string) => setToastMsg(m)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Navigate to a sibling finance page by id: …/finance/<current> → …/finance/<id>
  const onNavigate = (id: string) => navigate(pathname.replace(/\/[^/]+$/, '/' + id))

  const ids = modeIds(mode)
  const resolvedId = ids.includes(pageId) ? pageId : 'dash'
  const page = PAGES[mode][resolvedId] ?? PAGES[mode].dash
  const Comp = page.comp

  return (
    <DisputesProvider>
      <div
        className="min-h-full bg-slate-50 px-8 py-7 text-slate-900"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <div key={mode + resolvedId} className="animate-[fadeUp_.4s_ease]">
          <Comp mode={mode} toast={toast} onNavigate={onNavigate} />
        </div>
        {toastMsg && <Toast msg={toastMsg} onClose={() => setToastMsg(null)} />}
      </div>
    </DisputesProvider>
  )
}
