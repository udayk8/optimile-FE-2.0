import React from "react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { usePayables } from "@finance/lib/payablesStore";

const toneFor = (type: string): any => {
  if (/payment/i.test(type)) return "green";
  if (/credit|retention released/i.test(type)) return "green";
  if (/debit/i.test(type)) return "red";
  if (/invoice|bill/i.test(type)) return "blue";
  return "slate";
};

export default function Ledgers() {
  const { apLedger } = usePayables();
  const outstanding = apLedger.length ? apLedger[apLedger.length - 1].bal : 0;
  return (
    <div>
      <SectionTitle sub="Append-only running balance. Every financial event adds a row — never edited, fully auditable.">Vendor Ledger · Accounts Payable</SectionTitle>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Date", "Type", "Reference", "Amount", "Running Balance"].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {apLedger.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{r.date}</td>
                <td className="px-5 py-3.5"><Pill tone={toneFor(r.type)}>{r.type}</Pill></td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{r.ref}</td>
                <td className="px-5 py-3.5"><Money value={r.amt} className={r.amt < 0 ? "text-emerald-600" : "text-slate-800"} /></td>
                <td className="px-5 py-3.5"><Money value={r.bal} className="font-semibold text-slate-900" /></td>
              </tr>
            ))}
            {apLedger.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">No ledger entries yet.</td></tr>}
          </tbody>
        </table>
        <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-right text-sm">
          <span className="text-slate-500">Outstanding payable: </span><Money value={outstanding} className="font-bold text-slate-900" />
        </div>
      </Card>
    </div>
  );
}
