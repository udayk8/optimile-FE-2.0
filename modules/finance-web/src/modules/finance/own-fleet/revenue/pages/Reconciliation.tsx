import React, { useState } from "react";
import { Link2, AlertTriangle, Check, Search } from "lucide-react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { RECON_ROWS } from "@finance/data/mock";

export default function Reconciliation({ toast }: any) {
  const [rows, setRows] = useState(RECON_ROWS);
  const matched = rows.filter((r) => r.status === "matched").length;
  const exceptions = rows.filter((r) => r.status !== "matched").length;

  const confirm = (ref: any) => { setRows((xs) => xs.map((r) => (r.ref === ref ? { ...r, status: "matched", confidence: 100 } : r))); toast(`${ref} confirmed & reconciled`); };

  const tone = { matched: "green", review: "amber", unmatched: "red" };

  return (
    <div>
      <SectionTitle sub="Bank-feed credits auto-matched to outstanding invoices with a confidence score. Exceptions go to a review queue.">Payment Reconciliation</SectionTitle>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card className="p-4"><div className="text-xs text-slate-500">Auto-matched</div><div className="mt-1 text-lg font-bold text-emerald-600">{matched}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Exception queue</div><div className="mt-1 text-lg font-bold text-amber-600">{exceptions}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Bank feed</div><div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Connected (HDFC)</div></Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Bank ref", "Date", "Amount", "Matched invoice", "Confidence", "Status", ""].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ref} className={`border-b border-slate-100 last:border-0 ${r.status === "unmatched" ? "bg-red-50/30" : "hover:bg-slate-50/50"}`}>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{r.ref}</td>
                <td className="px-5 py-3.5 text-slate-500">{r.date}</td>
                <td className="px-5 py-3.5"><Money value={r.amount} className="font-semibold text-slate-800" /></td>
                <td className="px-5 py-3.5">{r.match ? <span className="flex items-center gap-1.5 font-mono text-xs text-slate-600"><Link2 size={12} className="text-blue-500" />{r.match}</span> : <span className="flex items-center gap-1.5 text-xs text-red-500"><AlertTriangle size={12} />No match found</span>}</td>
                <td className="px-5 py-3.5">{r.confidence > 0 ? <span className="font-mono text-xs text-slate-600">{r.confidence}%</span> : "—"}</td>
                <td className="px-5 py-3.5"><Pill tone={tone[r.status as keyof typeof tone] as any}>{r.status === "matched" ? "Matched" : r.status === "review" ? "Review" : "Unmatched"}</Pill></td>
                <td className="px-5 py-3.5 text-right">
                  {r.status !== "matched" && (
                    <button onClick={() => confirm(r.ref)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      {r.status === "review" ? <><Check size={12} />Confirm</> : <><Search size={12} />Find match</>}
                    </button>
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
