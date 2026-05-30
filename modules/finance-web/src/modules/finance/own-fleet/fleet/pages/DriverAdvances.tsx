import React, { useState } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight, Check, Clock } from "lucide-react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { DRIVER_ADVANCES } from "@finance/data/mock";

export default function DriverAdvances({ toast }: any) {
  const [rows, setRows] = useState(DRIVER_ADVANCES);
  const settle = (driver: any) => {
    setRows((xs) => xs.map((r) => (r.driver === driver ? { ...r, status: "settled" } : r)));
    toast(`Advance settled for ${driver}`);
  };

  const tone = { settled: "green", shortfall: "amber", "return-due": "blue", "pending-submission": "slate" };
  const label = { settled: "Settled", shortfall: "Pay shortfall", "return-due": "Collect balance", "pending-submission": "Awaiting expenses" };

  return (
    <div>
      <SectionTitle sub="A mini cash loop: advance issued before the trip, actual expenses submitted after, settled against each other.">Driver Advances &amp; Settlement</SectionTitle>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Driver", "Trip · Vehicle", "Advance", "Expenses", "Settlement", "Status", ""].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.driver} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-medium text-slate-700">{r.driver}</td>
                <td className="px-5 py-3.5 text-slate-500">{r.trip}<div className="font-mono text-xs text-slate-400">{r.vehicle}</div></td>
                <td className="px-5 py-3.5"><Money value={r.advance} /></td>
                <td className="px-5 py-3.5">{r.submitted == null ? <span className="text-slate-400">—</span> : <Money value={r.submitted} />}</td>
                <td className="px-5 py-3.5">
                  {r.delta == null ? <span className="text-slate-400">—</span>
                    : r.delta === 0 ? <span className="text-slate-500">Balanced</span>
                    : r.delta > 0 ? <span className="flex items-center gap-1 text-blue-600"><ArrowDownLeft size={13} />Collect <Money value={r.delta} /></span>
                    : <span className="flex items-center gap-1 text-amber-600"><ArrowUpRight size={13} />Pay <Money value={-r.delta} /></span>}
                </td>
                <td className="px-5 py-3.5"><Pill tone={tone[r.status as keyof typeof tone] as any}>{r.status === "settled" ? <Check size={11} /> : r.status === "pending-submission" ? <Clock size={11} /> : null}{label[r.status as keyof typeof label]}</Pill></td>
                <td className="px-5 py-3.5 text-right">
                  {r.status !== "settled" && r.status !== "pending-submission" && (
                    <button onClick={() => settle(r.driver)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"><Wallet size={12} />Settle</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
