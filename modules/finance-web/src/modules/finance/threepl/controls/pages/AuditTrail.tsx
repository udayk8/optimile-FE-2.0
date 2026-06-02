import React, { useMemo, useState } from "react";
import { Search, ArrowRight, Shield, Download } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Btn } from "@finance/components/primitives";
import { exportCsv } from "@finance/lib/csv";
import { useAudit } from "@finance/lib/auditStore";

/* BRD 9.5 — immutable, searchable freight audit trail.
   Fed by real actions across receivables / payables / disputes (logAudit).
   Searchable by user, date, transaction type, and amount; exportable. */
const dateOf = (ts: string) => ts.slice(0, 10);

export default function AuditTrail({ toast }: any) {
  const { entries } = useAudit();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  const types = useMemo(() => [...new Set(entries.map((e) => e.type))], [entries]);

  const rows = entries.filter((e) =>
    [e.user, e.action, e.entity].join(" ").toLowerCase().includes(q.toLowerCase()) &&
    (type === "all" || e.type === type) &&
    (!from || dateOf(e.ts) >= from) &&
    (!to || dateOf(e.ts) <= to) &&
    (!min || (e.amount ?? 0) >= Number(min)) &&
    (!max || (e.amount ?? 0) <= Number(max)),
  );

  const COLUMNS = [
    { key: "ts", label: "Timestamp" },
    { key: "user", label: "User" },
    { key: "action", label: "Action" },
    { key: "entity", label: "Entity" },
    { key: "type", label: "Type" },
    { label: "Amount", value: (r: any) => r.amount ?? "" },
    { label: "Change", value: (r: any) => `${r.from ?? ""}${r.to ? " → " + r.to : ""}` },
  ];
  const download = () => { exportCsv("audit-trail.csv", COLUMNS, rows); toast(`Downloaded audit-trail.csv (${rows.length} entries)`); };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <SectionTitle sub="Every financial action is logged immutably: who did what, when, and what changed. Searchable for audits.">Freight Audit Trail</SectionTitle>
        <Btn className="px-4 py-2" onClick={download}><Download size={15} />Export audit report (CSV)</Btn>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user, action, entity…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-300" />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-300">
          <option value="all">All types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-slate-500">From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300" /></label>
        <label className="flex items-center gap-1 text-xs text-slate-500">To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300" /></label>
        <input type="number" value={min} onChange={(e) => setMin(e.target.value)} placeholder="Min ₹" className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300" />
        <input type="number" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Max ₹" className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300" />
        <Pill tone="slate"><Shield size={11} />Immutable log</Pill>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Timestamp", "User", "Action", "Entity", "Amount", "Change"].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{r.ts}</td>
                <td className="px-5 py-3.5 text-slate-700">{r.user}</td>
                <td className="px-5 py-3.5 text-slate-600">{r.action}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{r.entity}</td>
                <td className="px-5 py-3.5">{r.amount != null ? <Money value={r.amount} className="text-slate-700" /> : <span className="text-slate-300">—</span>}</td>
                <td className="px-5 py-3.5">
                  {(r.from || r.to)
                    ? <span className="flex items-center gap-1.5 text-xs"><Pill tone="slate">{r.from}</Pill>{r.to && <><ArrowRight size={12} className="text-slate-400" /><Pill tone="blue">{r.to}</Pill></>}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No matching log entries.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
