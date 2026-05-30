import { useState, useEffect } from 'react'
import { ChevronDown, Check, Search, Bell } from 'lucide-react'
import { Toast } from '@finance/components/primitives'
import { MODES, NAV, PAGES, modeIds, type FinanceMode } from '@finance/modules/finance/nav'
import { DisputesProvider } from '@finance/lib/disputesStore'

// The full Finance application chrome — sidebar, mode switcher (aggregator /
// own-fleet / enterprise) and grouped tab navigation — preserved verbatim from
// the original standalone app. The host (root shell / tenant-admin) mounts this
// whole component behind a single "Finance" entry, so finance keeps its own UX.
export default function FinanceShell() {
  const [mode, setMode] = useState<FinanceMode>('aggregator')
  const [active, setActive] = useState('dash')
  const [modeOpen, setModeOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toast = (m: string) => setToastMsg(m)

  // Reset to dashboard when switching to a mode that lacks the current tab
  useEffect(() => {
    if (!modeIds(mode).includes(active)) setActive('dash')
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const page = PAGES[active] || PAGES.dash
  const Comp = page.comp

  return (
    <DisputesProvider>
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* SIDEBAR */}
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-300">
        <div className="flex items-center gap-2.5 border-b border-slate-800 px-5 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 font-bold text-white">O</div>
          <div>
            <div className="text-sm font-semibold text-white" style={{ fontFamily: "'Fraunces', serif" }}>Optimile Finance</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">TMS Module</div>
          </div>
        </div>

        {/* MODE SWITCHER */}
        <div className="relative border-b border-slate-800 px-3 py-3">
          <button onClick={() => setModeOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-lg bg-slate-800 px-3 py-2.5 text-sm hover:bg-slate-700">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: MODES[mode].color }} />
              {MODES[mode].label}
            </span>
            <ChevronDown size={15} className={`transition ${modeOpen ? 'rotate-180' : ''}`} />
          </button>
          {modeOpen && (
            <div className="absolute left-3 right-3 top-full z-20 mt-1 overflow-hidden rounded-lg bg-slate-800 shadow-xl ring-1 ring-slate-700 animate-[fadeIn_.15s]">
              {Object.entries(MODES).map(([k, v]) => (
                <button key={k} onClick={() => { setMode(k as FinanceMode); setModeOpen(false) }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-700 ${k === mode ? 'text-white' : 'text-slate-400'}`}>
                  <span className="h-2 w-2 rounded-full" style={{ background: v.color }} />{v.label}
                  {k === mode && <Check size={14} className="ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GROUPED NAV */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {NAV[mode].map((grp, gi) => (
            <div key={gi}>
              {grp.group && <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{grp.group}</div>}
              <div className="space-y-0.5">
                {grp.items.map((id) => {
                  const p = PAGES[id]
                  const Icon = p.icon
                  return (
                    <button key={id} onClick={() => setActive(id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active === id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
                      <Icon size={16} />{p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-700 font-medium text-slate-300">PN</div>
            Priya Nair<div className="ml-auto text-slate-600">Finance</div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-3.5">
          <div className="relative w-96">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Search invoices, trips, clients…" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-300 focus:bg-white" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">FY 2026-27 · 21 May</span>
            <button className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
              <Bell size={18} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-7">
          <div key={mode + active} className="animate-[fadeUp_.4s_ease]">
            <Comp mode={mode} toast={toast} />
          </div>
        </main>
      </div>

      {toastMsg && <Toast msg={toastMsg} onClose={() => setToastMsg(null)} />}
    </div>
    </DisputesProvider>
  )
}
