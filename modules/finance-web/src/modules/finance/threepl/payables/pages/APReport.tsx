import React, { useMemo, useState } from "react";
import { Download, AlertTriangle, Layers } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Btn } from "@finance/components/primitives";
import { fmtINR } from "@finance/lib/format";
import { exportCsv } from "@finance/lib/csv";
import { DEBIT_NOTES, VENDOR_BILL_DETAILS } from "@finance/data/mock";
import { usePayables, computeMatch } from "@finance/lib/payablesStore";

/* BRD 8.3 — Accounts Payable Report.
   What's pending approval, approved/scheduled, and paid — with contract-vs-invoiced
   variance, debit notes applied, net payable, and category/commodity/lane drill-down. */

const STATUS = { pending: "Pending Approval", scheduled: "Approved · Scheduled", paid: "Paid", disputed: "Disputed" } as const;
const STATUS_TONE = { pending: "amber", scheduled: "blue", paid: "green", disputed: "red" } as const;
const DIMENSIONS = [["category", "Category"], ["commodity", "Commodity"], ["lane", "Lane"]] as const;

export default function APReport({ toast }: any) {
  const { bills, payments, tolerancePct } = usePayables();
  const [status, setStatus] = useState("all");
  const [dim, setDim] = useState<"category" | "commodity" | "lane">("category");

  const rows = useMemo(() => bills.map((b) => {
    const m = computeMatch(b, tolerancePct);
    const dn = DEBIT_NOTES.filter((d) => d.trip === b.trip).reduce((s, d) => s + d.amount, 0);
    const payment = payments.find((p) => p.billId === b.id);
    return {
      ...b,
      variancePct: m.variancePct,
      flagged: m.status === "variance",
      statusLabel: STATUS[b.stage],
      invDate: (VENDOR_BILL_DETAILS as Record<string, any>)[b.id]?.invoice?.billDate ?? "—",
      payDate: payment ? payment.dueDate : "—",
      debitApplied: dn,
      netPayable: b.billed - dn,
    };
  }), [bills, payments, tolerancePct]);

  const filtered = rows.filter((r) => status === "all" || r.stage === status);

  // Drill-down: group net payable by the chosen dimension.
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; count: number; net: number }>();
    filtered.forEach((r) => {
      const key = (r as any)[dim] ?? "—";
      const prev = m.get(key) || { key, count: 0, net: 0 };
      m.set(key, { key, count: prev.count + 1, net: prev.net + r.netPayable });
    });
    return [...m.values()].sort((a, b) => b.net - a.net);
  }, [filtered, dim]);

  const COLUMNS = [
    { key: "vendor", label: "Vendor" },
    { key: "vendorId", label: "Vendor ID", value: (r: any) => r.vendorId ?? "" },
    { key: "id", label: "Invoice Number" },
    { key: "invDate", label: "Invoice Date" },
    { key: "billed", label: "Amount" },
    { key: "trip", label: "Trip ID" },
    { key: "lane", label: "Lane" },
    { key: "contractRate", label: "Contracted Rate" },
    { label: "Variance %", value: (r: any) => `${r.variancePct > 0 ? "+" : ""}${r.variancePct.toFixed(1)}%` },
    { key: "statusLabel", label: "Approval Status" },
    { key: "payDate", label: "Payment Date" },
    { key: "debitApplied", label: "Debit Notes Applied" },
    { key: "netPayable", label: "Net Payable" },
  ];
  const download = () => { exportCsv("accounts-payable-report.csv", COLUMNS, filtered); toast(`Downloaded accounts-payable-report.csv (${filtered.length} bills)`); };

  const totalNet = filtered.reduce((s, r) => s + r.netPayable, 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <SectionTitle sub="All outgoing payments — pending approval, approved & scheduled, and paid. Variance flagged; net payable after debit notes.">Accounts Payable Report</SectionTitle>
        <Btn className="px-4 py-2" onClick={download}><Download size={15} />Export to Excel (CSV)</Btn>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-300">
          <option value="all">All statuses</option>
          {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <span className="ml-auto text-sm text-slate-500">Net payable <Money value={totalNet} className="font-semibold text-slate-800" /></span>
      </div>

      <Card className="mb-6 overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Vendor", "Invoice", "Date", "Amount", "Trip · Lane", "Contracted", "Variance", "Status", "Payment", "DN", "Net Payable"].map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 ${r.flagged ? "bg-red-50/30" : ""}`}>
                <td className="px-4 py-3 text-slate-700">{r.vendor}<div className="font-mono text-[11px] text-slate-400">{r.vendorId}</div></td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.id}</td>
                <td className="px-4 py-3 text-slate-500">{r.invDate}</td>
                <td className="px-4 py-3"><Money value={r.billed} className="font-semibold text-slate-800" /></td>
                <td className="px-4 py-3 text-slate-500"><span className="font-mono text-xs">{r.trip}</span><div className="text-xs text-slate-400">{r.lane}</div></td>
                <td className="px-4 py-3 font-mono text-slate-600">{fmtINR(r.contractRate)}</td>
                <td className="px-4 py-3">{r.flagged
                  ? <Pill tone="red"><AlertTriangle size={11} />{r.variancePct > 0 ? "+" : ""}{r.variancePct.toFixed(1)}%</Pill>
                  : <span className="text-emerald-600">{r.variancePct > 0 ? "+" : ""}{r.variancePct.toFixed(1)}%</span>}</td>
                <td className="px-4 py-3"><Pill tone={STATUS_TONE[r.stage] as any}>{r.statusLabel}</Pill></td>
                <td className="px-4 py-3 text-slate-500">{r.payDate}</td>
                <td className="px-4 py-3">{r.debitApplied > 0 ? <Money value={-r.debitApplied} className="text-red-600" /> : <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3"><Money value={r.netPayable} className="font-semibold text-slate-900" /></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={11} className="px-5 py-12 text-center text-slate-400">No vendor bills match the current filter.</td></tr>}
          </tbody>
        </table>
      </Card>

      {/* Drill-down by category / commodity / lane */}
      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800"><Layers size={16} className="text-slate-400" />Net payable by {dim}</h3>
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
            {DIMENSIONS.map(([k, l]) => (
              <button key={k} onClick={() => setDim(k)} className={`rounded-md px-3 py-1 font-medium transition ${dim === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span className="text-slate-700">{g.key} <span className="text-xs text-slate-400">· {g.count}</span></span>
              <Money value={g.net} className="font-semibold text-slate-800" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
