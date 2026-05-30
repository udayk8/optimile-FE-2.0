import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PROFIT_CLIENT, PROFIT_LANE, PROFIT_VEHICLE } from "@finance/data/mock";

const TABS = { client: PROFIT_CLIENT, lane: PROFIT_LANE, vehicle: PROFIT_VEHICLE };

export default function Profitability() {
  const [tab, setTab] = useState("client");
  const data = TABS[tab as keyof typeof TABS].map((r: any) => ({ ...r, margin: r.revenue - r.cost, pct: (((r.revenue - r.cost) / r.revenue) * 100) }));

  return (
    <div>
      <SectionTitle sub="Which clients, lanes and vehicles actually make money. Negative margins are flagged for review.">Profitability Analysis</SectionTitle>

      <div className="mb-5 inline-flex rounded-lg bg-slate-100 p-1 text-sm">
        {[["client", "By client"], ["lane", "By lane"], ["vehicle", "By vehicle"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 font-medium transition ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{l}</button>
        ))}
      </div>

      <Card className="mb-6 p-5">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="margin" radius={[4, 4, 0, 0]}>
              {data.map((d: any, i: number) => <Cell key={i} fill={d.margin < 0 ? "#ef4444" : "#10b981"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Name", "Revenue", "Cost", "Margin", "Margin %", ""].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {data.map((r: any) => (
              <tr key={r.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 text-slate-700">{r.name}</td>
                <td className="px-5 py-3.5"><Money value={r.revenue} /></td>
                <td className="px-5 py-3.5 text-slate-500"><Money value={r.cost} /></td>
                <td className="px-5 py-3.5"><Money value={r.margin} className={`font-semibold ${r.margin < 0 ? "text-red-600" : "text-emerald-600"}`} /></td>
                <td className="px-5 py-3.5"><Pill tone={r.pct < 0 ? "red" : r.pct < 15 ? "amber" : "green"}>{r.pct.toFixed(1)}%</Pill></td>
                <td className="px-5 py-3.5">{r.margin < 0 && <span className="flex items-center gap-1 text-xs text-red-600"><AlertTriangle size={12} />Loss-making</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
