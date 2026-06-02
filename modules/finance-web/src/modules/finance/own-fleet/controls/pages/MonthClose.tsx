import React, { useMemo, useState } from "react";
import { Check, Lock, Unlock, FileText, Zap } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Btn } from "@finance/components/primitives";
import { CLOSE_CHECKLIST, PROFIT_CLIENT, PROFIT_LANE, PROFIT_VEHICLE } from "@finance/data/mock";
import { useReceivables } from "@finance/lib/receivablesStore";
import { usePayables } from "@finance/lib/payablesStore";
import { useMonthClose } from "@finance/lib/monthCloseStore";

/* BRD 9.4 — system-driven checklist + lock + auto monthly P&L.
   The first two items are derived live; the rest are manual confirmations. */
const AUTO = new Set([0, 1]);
const withMargin = (r: any) => ({ ...r, margin: r.revenue - r.cost, pct: ((r.revenue - r.cost) / r.revenue) * 100 });

function PnlTable({ title, rows }: { title: string; rows: any[] }) {
  const data = rows.map(withMargin);
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">{title}</div>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
          {["Name", "Revenue", "Cost", "Margin", "%"].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}
        </tr></thead>
        <tbody>
          {data.map((r: any) => (
            <tr key={r.name} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-2.5 text-slate-700">{r.name}</td>
              <td className="px-4 py-2.5"><Money value={r.revenue} /></td>
              <td className="px-4 py-2.5 text-slate-500"><Money value={r.cost} /></td>
              <td className="px-4 py-2.5"><Money value={r.margin} className={`font-semibold ${r.margin < 0 ? "text-red-600" : "text-emerald-600"}`} /></td>
              <td className="px-4 py-2.5"><Pill tone={r.pct < 0 ? "red" : r.pct < 15 ? "amber" : "green"}>{r.pct.toFixed(0)}%</Pill></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default function MonthClose({ toast }: any) {
  const { locked, closedAt, closeMonth, reopen } = useMonthClose();
  const { trips } = useReceivables();
  const { bills } = usePayables();
  const [manual, setManual] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(CLOSE_CHECKLIST.map((t, i) => [i, AUTO.has(i) ? false : t.done])),
  );

  const podsReconciled = trips.filter((t) => t.podStage !== "invoiced").length === 0;
  const invoicesMatched = bills.filter((b) => b.stage === "pending").length === 0;
  const autoDone = (i: number) => (i === 0 ? podsReconciled : i === 1 ? invoicesMatched : false);
  const isDone = (i: number) => (AUTO.has(i) ? autoDone(i) : !!manual[i]);

  const items = CLOSE_CHECKLIST.map((t, i) => ({ task: t.task, auto: AUTO.has(i), done: isDone(i) }));
  const allDone = items.every((it) => it.done);

  const toggle = (i: number) => { if (!AUTO.has(i) && !locked) setManual((m) => ({ ...m, [i]: !m[i] })); };
  const close = () => { closeMonth(); toast("April 2026 closed & locked — monthly P&L generated"); };
  const override = () => { reopen(); toast("Period reopened by override — entries can post again"); };

  const net = useMemo(() => {
    const revenue = PROFIT_CLIENT.reduce((s, r) => s + r.revenue, 0);
    const cost = PROFIT_CLIENT.reduce((s, r) => s + r.cost, 0);
    return { revenue, cost, profit: revenue - cost };
  }, []);

  return (
    <div>
      <SectionTitle sub="A system-driven checklist before a month can close. Once locked, no new entries post to that period without override.">Month-End Close · April 2026</SectionTitle>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-slate-800">Closing checklist</h3>
          <div className="space-y-2">
            {items.map((t, i) => (
              <button key={i} disabled={t.auto || locked} onClick={() => toggle(i)}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${t.done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"} disabled:cursor-not-allowed`}>
                <span className={`grid h-5 w-5 place-items-center rounded ${t.done ? "bg-emerald-500 text-white" : "border border-slate-300"}`}>{t.done && <Check size={13} />}</span>
                <span className={t.done ? "text-slate-700" : "text-slate-600"}>{t.task}</span>
                {t.auto && <Pill tone="blue"><Zap size={10} />Auto</Pill>}
              </button>
            ))}
          </div>
          <div className="mt-5">
            {locked ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"><Lock size={15} />Period locked{closedAt ? ` · ${closedAt}` : ""}</div>
                <Btn variant="ghost" className="py-2" onClick={override}><Unlock size={14} />Override &amp; reopen</Btn>
              </div>
            ) : (
              <button onClick={close} disabled={!allDone}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40">
                <Lock size={15} />{allDone ? "Close & lock month" : "Complete all tasks to close"}
              </button>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><FileText size={16} className="text-slate-400" />Monthly P&amp;L</div>
          {locked ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Revenue</span><Money value={net.revenue} className="font-medium text-slate-800" /></div>
              <div className="flex justify-between"><span className="text-slate-500">Total cost</span><Money value={-net.cost} className="text-slate-500" /></div>
              <div className="my-2 border-t border-slate-200" />
              <div className="flex justify-between"><span className="font-semibold text-slate-800">Net profit</span><Money value={net.profit} className="font-bold text-emerald-600" /></div>
              <div className="mt-2"><Pill tone="green">Auto-generated on close</Pill></div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">P&amp;L auto-generates once the month is closed.</p>
          )}
        </Card>
      </div>

      {locked && (
        <div className="mt-6 space-y-6">
          <h3 className="font-semibold text-slate-800">Monthly P&amp;L breakdown</h3>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <PnlTable title="By client" rows={PROFIT_CLIENT} />
            <PnlTable title="By lane" rows={PROFIT_LANE} />
            <PnlTable title="By vehicle (own fleet)" rows={PROFIT_VEHICLE} />
          </div>
        </div>
      )}
    </div>
  );
}
