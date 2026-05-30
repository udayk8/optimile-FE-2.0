import React, { useState } from "react";
import { Search, ArrowRight, Shield } from "lucide-react";
import { Card, Pill, SectionTitle } from "@finance/components/primitives";
import { AUDIT_LOG } from "@finance/data/mock";

export default function AuditTrail() {
  const [q, setQ] = useState("");
  const rows = AUDIT_LOG.filter((r) =>
    [r.user, r.action, r.entity].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <SectionTitle sub="Every financial action is logged immutably: who did what, when, and what changed. Searchable for audits.">Freight Audit Trail</SectionTitle>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user, action, entity…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-300" />
        </div>
        <Pill tone="slate"><Shield size={11} />Immutable log</Pill>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Timestamp", "User", "Action", "Entity", "Change"].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{r.ts}</td>
                <td className="px-5 py-3.5 text-slate-700">{r.user}</td>
                <td className="px-5 py-3.5 text-slate-600">{r.action}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{r.entity}</td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-1.5 text-xs">
                    <Pill tone="slate">{r.from}</Pill><ArrowRight size={12} className="text-slate-400" /><Pill tone="blue">{r.to}</Pill>
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">No matching log entries.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
