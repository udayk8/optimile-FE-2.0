import React, { useState } from "react";
import { FileText, Download, Check, X, FileSpreadsheet } from "lucide-react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { TDS_ROWS, GST_ROWS, EWAY_BILLS } from "@finance/data/mock";
import { usePayables } from "@finance/lib/payablesStore";

export default function Compliance({ toast }: any) {
  const [tab, setTab] = useState("tds");
  // Prefer real 194C deductions from processed vendor payments; fall back to the
  // seeded sample when none have run yet.
  const { tdsRows } = usePayables();
  const tdsData = tdsRows.length ? tdsRows : TDS_ROWS;
  return (
    <div>
      <SectionTitle sub="TDS, GST input credit and e-way bills calculated automatically — no manual compliance work, no penalty risk.">Tax Compliance · TDS &amp; GST</SectionTitle>

      <div className="mb-5 inline-flex rounded-lg bg-slate-100 p-1 text-sm">
        {[["tds", "TDS (194C)"], ["gst", "GST input credit"], ["eway", "E-way bills"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 font-medium transition ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{l}</button>
        ))}
      </div>

      {tab === "tds" && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
              {["Vendor", "PAN", "Section · Rate", "Gross", "TDS", "Net paid", "Form 16A"].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {tdsData.map((r) => (
                <tr key={r.vendor} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 text-slate-700">{r.vendor}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{r.pan}</td>
                  <td className="px-5 py-3.5"><Pill tone="slate">{r.section} · {r.rate}%</Pill></td>
                  <td className="px-5 py-3.5"><Money value={r.gross} /></td>
                  <td className="px-5 py-3.5"><Money value={r.tds} className="font-semibold text-amber-600" /></td>
                  <td className="px-5 py-3.5"><Money value={r.net} className="font-semibold text-slate-800" /></td>
                  <td className="px-5 py-3.5"><button onClick={() => toast(`Form 16A generated for ${r.vendor}`)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"><Download size={12} />Generate</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "gst" && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
              {["Invoice", "GSTIN", "Taxable", "IGST", "CGST", "SGST", "GSTR-2A"].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {GST_ROWS.map((r) => (
                <tr key={r.invoice} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{r.invoice}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{r.gstin}</td>
                  <td className="px-5 py-3.5"><Money value={r.taxable} /></td>
                  <td className="px-5 py-3.5"><Money value={r.igst} /></td>
                  <td className="px-5 py-3.5"><Money value={r.cgst} /></td>
                  <td className="px-5 py-3.5"><Money value={r.sgst} /></td>
                  <td className="px-5 py-3.5">{r.gstr2a ? <Pill tone="green"><Check size={11} />Reconciled</Pill> : <Pill tone="red"><X size={11} />Not in 2A</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "eway" && (
        <div className="space-y-3">
          {EWAY_BILLS.map((e) => (
            <Card key={e.indent} className="flex items-center justify-between p-5">
              <div>
                <div className="flex items-center gap-2"><FileSpreadsheet size={15} className="text-slate-400" /><span className="font-mono text-sm font-semibold text-slate-800">{e.indent}</span><Money value={e.value} className="text-sm text-slate-600" /></div>
                <div className="mt-1 text-xs text-slate-400">{e.value > 50000 ? "Goods value > ₹50,000 — e-way bill required" : "Below ₹50,000 — e-way bill not required"}</div>
              </div>
              {e.generated ? <Pill tone="green"><Check size={11} />EWB {e.ewb}</Pill> : <Pill tone="slate">Not required</Pill>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
