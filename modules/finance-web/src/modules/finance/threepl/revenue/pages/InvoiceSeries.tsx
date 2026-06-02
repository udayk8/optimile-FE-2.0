import React, { useState } from "react";
import { Hash, Plus, RefreshCw, CalendarClock, Check } from "lucide-react";
import { Card, Pill, SectionTitle, Modal, ModalHeader, Btn } from "@finance/components/primitives";
import { useReceivables, type SeriesRow } from "@finance/lib/receivablesStore";

const fmtNext = (s: SeriesRow) => `${s.series}${String(s.next).padStart(4, "0")}`;

function AddSeriesModal({ onClose, onAdd }: { onClose: () => void; onAdd: (row: SeriesRow) => string | void }) {
  const [series, setSeries] = useState("");
  const [label, setLabel] = useState("");
  const [fy, setFy] = useState("2026-27");
  const valid = /-$/.test(series.trim()) && label.trim();
  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Add invoice series" tone="blue" icon={Plus} onClose={onClose} />
      <div className="p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-500">Prefix (must end with a dash)</label>
          <input autoFocus value={series} onChange={(e) => setSeries(e.target.value)} placeholder="e.g. INV-MARICO-2026-"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm outline-none focus:border-slate-300 focus:bg-white" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Marico dedicated invoices"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300 focus:bg-white" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Financial year</label>
          <input value={fy} onChange={(e) => setFy(e.target.value)} placeholder="2026-27"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300 focus:bg-white" />
        </div>
        {valid && <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">First number: <span className="font-mono font-semibold text-slate-700">{series.trim()}0001</span></div>}
        <div className="flex gap-3">
          <Btn variant="ghost" className="flex-1 py-2.5" onClick={onClose}>Cancel</Btn>
          <Btn className="flex-1 py-2.5" disabled={!valid} onClick={() => onAdd({ series: series.trim(), label: label.trim(), fy: fy.trim(), next: 1 })}>
            <Plus size={14} />Create series
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export default function InvoiceSeries({ toast }: any) {
  const { series, allocate, addSeries, resetFinancialYear } = useReceivables();
  const [adding, setAdding] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Demo helper: pull the next number from a series so you can see it advance.
  const draw = (prefix: string) => {
    const id = allocate(prefix);
    toast(`Allocated ${id}`);
  };

  const add = (row: SeriesRow) => {
    if (series.some((s) => s.series === row.series)) { toast("That series prefix already exists"); return; }
    addSeries(row);
    setAdding(false);
    toast(`Series ${row.series} created`);
  };

  const reset = () => { resetFinancialYear(); setConfirmReset(false); toast("Financial year rolled — all series reset to 0001"); };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <SectionTitle sub="Unique, sequential invoice numbers — no duplicates, no gaps. Numbering resets at the start of each financial year (1 April).">Invoice Series</SectionTitle>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" className="px-4 py-2" onClick={() => setConfirmReset(true)}><RefreshCw size={14} />Reset financial year</Btn>
          <Btn className="px-4 py-2" onClick={() => setAdding(true)}><Plus size={14} />Add series</Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {series.map((s) => (
          <Card key={s.series} className="p-5">
            <div className="flex items-start justify-between">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500"><Hash size={18} /></div>
              <Pill tone="slate"><CalendarClock size={11} />FY {s.fy}</Pill>
            </div>
            <div className="mt-3 text-xs text-slate-500">{s.label}</div>
            <div className="mt-1 font-mono text-lg font-semibold text-slate-900">{fmtNext(s)}</div>
            <div className="mt-1 text-xs text-slate-400">Next number · prefix <span className="font-mono">{s.series}</span></div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-400">Sequence at {s.next}</span>
              <Btn variant="ghost" onClick={() => draw(s.series)}><Check size={13} />Draw next</Btn>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <h3 className="mb-1 font-semibold text-slate-800">How numbering works</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-500">
          <li>· Each new invoice automatically takes the next number in its series — allocation is atomic, so there are no duplicates or gaps.</li>
          <li>· Credit notes (<span className="font-mono text-slate-600">CN-</span>) and debit notes (<span className="font-mono text-slate-600">DN-</span>) use their own series, kept distinct from standard invoices.</li>
          <li>· Different series can be created per client or financial year.</li>
          <li>· On 1 April, <span className="font-medium text-slate-600">Reset financial year</span> rolls every prefix to the new year and resets the sequence to 0001.</li>
        </ul>
      </Card>

      {adding && <AddSeriesModal onClose={() => setAdding(false)} onAdd={add} />}

      {confirmReset && (
        <Modal onClose={() => setConfirmReset(false)}>
          <ModalHeader title="Reset financial year" tone="amber" icon={RefreshCw} onClose={() => setConfirmReset(false)} />
          <div className="p-6">
            <p className="text-sm text-slate-600">This rolls every series to the next financial year (e.g. <span className="font-mono">INV-2026-</span> → <span className="font-mono">INV-2027-</span>) and resets each sequence to <span className="font-mono">0001</span>. Use this on 1 April.</p>
            <div className="mt-5 flex gap-3">
              <Btn variant="ghost" className="flex-1 py-2.5" onClick={() => setConfirmReset(false)}>Cancel</Btn>
              <Btn className="flex-1 py-2.5" onClick={reset}><RefreshCw size={14} />Roll & reset</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
